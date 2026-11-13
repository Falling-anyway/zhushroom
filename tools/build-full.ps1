# 打包「猪事顺利全量包」到 dist/（不进仓库，只作为 GitHub Release 附件）
# 用法：powershell -ExecutionPolicy Bypass -File tools\build-full.ps1
# 内容：脱敏后的猪事顺利.html + 满血版 Obsidian 插件 + 学在浙大同步助手 + 使用说明

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $repo 'dist'
$stage = Join-Path $env:TEMP ('zhushroom-full-' + [guid]::NewGuid().ToString('N'))

$page = Join-Path $repo '猪事顺利.html'
$plugin = Join-Path $repo 'obsidian-plugin\zhushi-ribbon'
$helper = Join-Path $repo 'zju-sync'

foreach ($p in @($page, $plugin, $helper)) {
  if (-not (Test-Path $p)) { Write-Host "[失败] 找不到 $p"; exit 1 }
}

New-Item -ItemType Directory -Force -Path $stage | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage '.obsidian\plugins\zhushi-ribbon') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'zju-sync') | Out-Null

Copy-Item $page (Join-Path $stage '猪事顺利.html') -Force
Copy-Item (Join-Path $plugin 'main.js') (Join-Path $stage '.obsidian\plugins\zhushi-ribbon\main.js') -Force
Copy-Item (Join-Path $plugin 'manifest.json') (Join-Path $stage '.obsidian\plugins\zhushi-ribbon\manifest.json') -Force

$helperFiles = @('zju-sync-service.exe', '登录一次.bat', 'start-hidden.vbs', 'zju-sync.config.example.json')
foreach ($f in $helperFiles) {
  $p = Join-Path $helper $f
  if (-not (Test-Path $p)) { Write-Host "[警告] 缺少 $f，跳过" -ForegroundColor Yellow; continue }
  Copy-Item $p (Join-Path $stage "zju-sync\$f") -Force
}
$cfg = Join-Path $stage 'zju-sync\zju-sync.config.example.json'
if (Test-Path $cfg) { Copy-Item $cfg (Join-Path $stage 'zju-sync\zju-sync.config.json') -Force }

$readme = @'
猪事顺利 · 全量包
==================

解压后有三个东西：猪事顺利.html、.obsidian/（满血版插件）、zju-sync/（学在浙大同步助手）。

用法一：浏览器直接用
-------------------
双击 猪事顺利.html（或拖进 Chrome / Edge）。数据存在本机浏览器里。
想同步教务网课表和学在浙大待办，先进 zju-sync 运行同步助手（见下）。

用法二：在 Obsidian 里用（满血版，推荐）
---------------------------------------
1. 把 猪事顺利.html 复制到库的最外层目录（和 .obsidian 同一层）。
2. 把本包里的 .obsidian\plugins\zhushi-ribbon 整个文件夹，复制到你的库的
   <库>\.obsidian\plugins\ 下面（已有同名文件夹就覆盖）。
3. 重启 Obsidian → 设置 → 第三方插件 → 找到「猪事顺利侧边栏入口」并启用。
4. 点左侧边栏的小猪图标（或命令面板搜「打开猪事顺利」）。
日历里的日程、习惯、心情会直接写成库里的 Markdown：日程/01-每日日程、07-习惯打卡，
目录不存在会自动创建。

用法三：学在浙大同步助手（可选）
-------------------------------
1. 双击 zju-sync\登录一次.bat，在弹出的浏览器里登录浙大统一身份认证，
   再打开教务网课表页面一次，窗口自动关闭（Cookie 已保存）。
2. 双击 zju-sync\start-hidden.vbs 启动后台服务（监听 http://127.0.0.1:8765，只在本机）。
3. 回到猪事顺利页面，点右上角云朵图标 →「立即同步」。
开机自启：把 start-hidden.vbs 的快捷方式放进 shell:startup（Win+R 输入 shell:startup）。

注意
----
- 必须解压后用，不要直接在压缩包里双击。
- 同步助手依赖 zju-sync-service.exe，换机器要带上整个 zju-sync 文件夹。
- 本包不含任何个人课表，示例数据是虚构的。
'@
[System.IO.File]::WriteAllText((Join-Path $stage '使用说明.txt'), $readme, [System.Text.UTF8Encoding]::new($true))

New-Item -ItemType Directory -Force -Path $dist | Out-Null
$zip = Join-Path $dist 'zhushroom-full.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "已生成 $zip（$size MB）"
