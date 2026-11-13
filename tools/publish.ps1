# 把 Obsidian 库里最新的应用与插件同步到本仓库，检查通过后提交并推送
#
#   powershell -ExecutionPolicy Bypass -File tools\publish.ps1
#   powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -DryRun
#   powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -Message "fix: 顶栏居中"
#
# 说明：应用在 Obsidian 库里编辑，本仓库只是发布副本；脚本只做「复制 → 检查 → 提交 → 推送」。
# 绝不反向写回库，也不会碰库里的 .git。

param(
  [string]$Message = "",
  [string]$VaultRoot = "C:\Users\32176\Documents\Obsidian Vault",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Fail($msg) {
  Write-Host "[失败] $msg" -ForegroundColor Red
  exit 1
}

# ---------- 1. 复制 ----------
$srcApp = Join-Path $VaultRoot "猪事顺利.html"
$srcPlug = Join-Path $VaultRoot ".obsidian\plugins\zhushroom-full"
$dstApp = Join-Path $repo "猪事顺利.html"
$dstPlug = Join-Path $repo "obsidian-plugin\zhushroom-full"

foreach ($p in @($srcApp, (Join-Path $srcPlug "main.js"), (Join-Path $srcPlug "manifest.json"))) {
  if (-not (Test-Path $p)) { Fail "找不到源文件：$p" }
}
New-Item -ItemType Directory -Force -Path $dstPlug | Out-Null
Copy-Item $srcApp $dstApp -Force
Copy-Item (Join-Path $srcPlug "main.js") (Join-Path $dstPlug "main.js") -Force
Copy-Item (Join-Path $srcPlug "manifest.json") (Join-Path $dstPlug "manifest.json") -Force

# ---------- 1.5 脱敏：把内置兜底课表换成虚构示例 ----------
# 库里那份 TT_EMBEDDED 是真实课表（课程、教师、教室），发布版必须替换
$sampleTT = @'
var TT_EMBEDDED = {
  kbList: [
    { kcb: '高等数学<br>秋冬{第1-8周|3节/周}<br>李老师<br>教1-101', xqj: '1', djj: '3', skcd: '3', xkkh: '(2026-2027-1)-MATH1001-0000001-1', xxq: '秋冬' },
    { kcb: '大学物理<br>秋冬{第1-8周|2节/周}<br>王老师<br>教1-202', xqj: '2', djj: '3', skcd: '2', xkkh: '(2026-2027-1)-PHYS1002-0000002-1', xxq: '秋冬' },
    { kcb: '程序设计基础<br>秋冬{第1-8周|2节/周}<br>赵老师<br>机房 A-301', xqj: '3', djj: '6', skcd: '2', xkkh: '(2026-2027-1)-CS1003-0000003-1', xxq: '秋冬' },
    { kcb: '大学英语<br>秋冬{第1-8周|2节/周}<br>孙老师<br>教2-105', xqj: '4', djj: '9', skcd: '2', xkkh: '(2026-2027-1)-ENG1004-0000004-1', xxq: '秋冬' },
    { kcb: '体育（羽毛球）<br>秋冬{第1-8周|2节/周}<br>周老师<br>体育馆 3 号场', xqj: '5', djj: '3', skcd: '2', xkkh: '(2026-2027-1)-PE1005-0000005-1', xxq: '秋冬' }
  ]
};
'@
$htmlRaw = [System.IO.File]::ReadAllText($dstApp, [System.Text.UTF8Encoding]::new($false))
$m = [regex]::Matches($htmlRaw, '(?s)var TT_EMBEDDED = \{.*?\r?\n\};')
if ($m.Count -ne 1) { Fail "内置兜底课表定位失败（匹配 $($m.Count) 处），已中止" }
$htmlRaw = $htmlRaw.Replace($m[0].Value, $sampleTT.TrimEnd())
if ($htmlRaw -match '北3-310') {
  # 首次打开时的兜底示例日程里也带真实教室名，一起换掉
  $htmlRaw = $htmlRaw.Replace('北3-310', '教1-101')
}
[System.IO.File]::WriteAllText($dstApp, $htmlRaw, [System.Text.UTF8Encoding]::new($false))

# ---------- 2. 安全检查 ----------
Write-Host "检查私有串…"
# 注意：页面输入框的 placeholder 是 "access_token=..." 这类示例串，不算泄露，所以只匹配真实长度的令牌
# 只扫「会进仓库的文件」（git 已跟踪的）；本地忽略文件如 zju-cookie.txt、_cache、.login-profile 不参与
$privacyPattern = '32176|access_token=[A-Za-z0-9]{12,}|CASTGC=[^"\s]{8,}|Falling-anyway/Notes'
$tracked = @(git -C $repo ls-files)
$srcFiles = @($tracked | Where-Object { $_ -match '\.(html|js|json|md|ps1)$' } |
  ForEach-Object { Join-Path $repo $_ } | Where-Object { (Test-Path $_ -PathType Leaf) -and ($_ -notmatch 'publish\.ps1$') })
$srcFiles += @((Join-Path $repo '猪事顺利.html'), (Join-Path $repo 'obsidian-plugin\zhushroom-full\main.js'))
$srcFiles = @($srcFiles | Where-Object { Test-Path $_ -PathType Leaf } | Select-Object -Unique)
$privacyHits = Select-String -Path $srcFiles -Pattern $privacyPattern -Encoding UTF8
if ($privacyHits) {
  $privacyHits | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber) $($_.Line.Trim())" }
  Fail "发现疑似私有内容，已中止"
}

Write-Host "检查禁止入库的文件…"
$badTracked = @($tracked | Where-Object {
  $_ -match '(^|/)(data\.json|zju-sync\.config\.json)$' -or
  $_ -match '\.(exe|zip)$' -or
  $_ -match '^日程/' -or
  $_ -match '猪事顺利工作协作\.md$' -or
  $_ -match '^dist/'
})
if ($badTracked.Count -gt 0) {
  $badTracked | ForEach-Object { Write-Host "  $_" }
  Fail "仓库里出现了不该发布的文件"
}

Write-Host "检查入口页…"
$entry = Join-Path $repo "index.html"
if (-not (Test-Path $entry)) { Fail "缺少 index.html（GitHub Pages 入口页）" }
if (-not (Select-String -Path $entry -Pattern 'url=%E7%8C%AA%E4%BA%8B%E9%A1%BA%E5%88%A9\.html' -Quiet)) {
  Fail "index.html 没有指向 猪事顺利.html"
}
# dist/ 只在本地生成并上传 Release；是否入库由上面的 git 跟踪检查保证

Write-Host "检查脚本语法…"
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Host "  [警告] 没找到 node，跳过语法检查" -ForegroundColor Yellow
} else {
  & $node --check (Join-Path $dstPlug "main.js")
  if ($LASTEXITCODE -ne 0) { Fail "插件 main.js 语法错误" }

  $html = Get-Content $dstApp -Raw -Encoding UTF8
  $blocks = [regex]::Matches($html, '(?s)<script>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value }
  $main = $blocks | Sort-Object Length -Descending | Select-Object -First 1
  if (-not $main) { Fail "页面里没找到 <script> 块" }
  $tmp = Join-Path $env:TEMP "zhushroom-check.js"
  Set-Content -Path $tmp -Value $main -Encoding utf8
  & $node --check $tmp
  if ($LASTEXITCODE -ne 0) { Fail "页面脚本语法错误" }
}

Write-Host "检查体积…"
Get-ChildItem $repo -Recurse -File | Where-Object { $_.Length -gt 5MB } | ForEach-Object {
  Write-Host "  [警告] $($_.Name) 超过 5 MB：$([math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Yellow
}

# ---------- 3. 提交与推送 ----------
$changes = git status --porcelain
if (-not $changes) {
  Write-Host "已是最新，没有改动。"
  exit 0
}

Write-Host "改动："
$changes | ForEach-Object { Write-Host "  $_" }

if ($DryRun) {
  Write-Host "[DryRun] 检查通过，未提交。" -ForegroundColor Cyan
  exit 0
}

if (-not $Message) { $Message = "sync: " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git add -A
git commit -m $Message
if ($LASTEXITCODE -ne 0) { Fail "git commit 失败" }
git push
if ($LASTEXITCODE -ne 0) { Fail "git push 失败（检查网络或 GitHub 授权）" }

Write-Host "已推送：$Message" -ForegroundColor Green
