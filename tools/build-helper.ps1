# 打包「学在浙大同步助手」安装包到 dist/（不进仓库，只作为 GitHub Release 附件）
# 用法：powershell -ExecutionPolicy Bypass -File tools\build-helper.ps1

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$src = Join-Path $repo 'zju-sync'
$dist = Join-Path $repo 'dist'

if (-not (Test-Path $src)) { Write-Host "[失败] 找不到 zju-sync/"; exit 1 }

$files = @(
  'zju-sync-service.exe',
  '登录一次.bat',
  'start-hidden.vbs',
  'zju-sync.config.example.json',
  '说明.txt'
)

$stage = Join-Path $env:TEMP ('zju-helper-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $stage | Out-Null

foreach ($f in $files) {
  $p = Join-Path $src $f
  if (-not (Test-Path $p)) { Write-Host "[警告] 缺少 $f，跳过" -ForegroundColor Yellow; continue }
  Copy-Item $p (Join-Path $stage $f) -Force
}

# 安装包里给一份可直接用的配置：缓存目录写相对不现实，先留空由服务自己建
$cfg = Get-ChildItem $stage -Filter 'zju-sync.config.example.json' | Select-Object -First 1
if ($cfg) { Copy-Item $cfg.FullName (Join-Path $stage 'zju-sync.config.json') -Force }

$readme = @'
猪事顺利 · 学在浙大同步助手
================================

作用：把教务网课表、校历和学在浙大待办同步到「猪事顺利」网页里。
它只在本机运行，监听 http://127.0.0.1:8765，数据不上传任何服务器。

第一次使用
----------
1. 双击「登录一次.bat」，在弹出的浏览器里登录浙大统一身份认证，
   再打开教务网课表页面一次，窗口会自动关闭（Cookie 已保存）。
2. 双击「start-hidden.vbs」启动同步服务（后台运行，无窗口）。
3. 回到猪事顺利网页，点右上角云朵图标 →「立即同步」。

日常使用
--------
- 开机自启：把「start-hidden.vbs」的快捷方式放进
  shell:startup 文件夹（Win+R 输入 shell:startup）。
- 登录过期（页面提示登录失效）：重新双击「登录一次.bat」。

卸载
----
退出后台进程 zju-sync-service.exe，删除本文件夹即可。
'@
[System.IO.File]::WriteAllText((Join-Path $stage '使用说明.txt'), $readme, [System.Text.UTF8Encoding]::new($true))

New-Item -ItemType Directory -Force -Path $dist | Out-Null
$zip = Join-Path $dist 'zju-sync-helper.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "已生成 $zip（$size MB）"
