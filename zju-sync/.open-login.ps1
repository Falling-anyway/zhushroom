$profileDir = Join-Path $PSScriptRoot '.login-profile'
$chromeArgs = @(
  '--remote-debugging-port=9333',
  ('--user-data-dir=' + $profileDir),
  '--no-first-run',
  '--no-default-browser-check',
  '--new-window',
  'https://courses.zju.edu.cn/user/index',
  'https://zdbk.zju.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N253508&layout=default'
)
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }
Start-Process -FilePath $edge -ArgumentList $chromeArgs
