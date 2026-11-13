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
$srcPlug = Join-Path $VaultRoot ".obsidian\plugins\zhushi-ribbon"
$dstApp = Join-Path $repo "猪事顺利.html"
$dstPlug = Join-Path $repo "obsidian-plugin\zhushi-ribbon"

foreach ($p in @($srcApp, (Join-Path $srcPlug "main.js"), (Join-Path $srcPlug "manifest.json"))) {
  if (-not (Test-Path $p)) { Fail "找不到源文件：$p" }
}
New-Item -ItemType Directory -Force -Path $dstPlug | Out-Null
Copy-Item $srcApp $dstApp -Force
Copy-Item (Join-Path $srcPlug "main.js") (Join-Path $dstPlug "main.js") -Force
Copy-Item (Join-Path $srcPlug "manifest.json") (Join-Path $dstPlug "manifest.json") -Force

# ---------- 2. 安全检查 ----------
Write-Host "检查私有串…"
# 注意：页面输入框的 placeholder 是 "access_token=..." 这类示例串，不算泄露，所以只匹配真实长度的令牌
$privacyPattern = '32176|access_token=[A-Za-z0-9]{8,}|zju-cookie|Falling-anyway/Notes'
$srcFiles = Get-ChildItem $repo -Recurse -File -Include *.html, *.js, *.json, *.md, *.ps1 |
  Where-Object { $_.FullName -notmatch '\\docs\\截图\\' -and $_.Name -ne 'publish.ps1' }
$privacyHits = $srcFiles | Select-String -Pattern $privacyPattern
if ($privacyHits) {
  $privacyHits | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber) $($_.Line.Trim())" }
  Fail "发现疑似私有内容，已中止"
}

Write-Host "检查禁止入库的文件…"
$forbidden = Get-ChildItem $repo -Recurse -File | Where-Object {
  $_.Name -eq 'data.json' -or
  $_.Extension -in @('.exe', '.zip') -or
  $_.FullName -match '\\日程\\' -or
  $_.Name -eq '猪事顺利工作协作.md'
}
if ($forbidden) {
  $forbidden | ForEach-Object { Write-Host "  $($_.FullName)" }
  Fail "仓库里出现了不该发布的文件"
}

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
