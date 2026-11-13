# 猪事顺利 · Zhushroom

单文件日历应用，提供周 / 月 / 年视图、课程表、DDL 倒计时、习惯打卡、每日心情与复盘，数据可与 Obsidian 库中的 Markdown 文件双向同步。

![周视图](docs/截图/周视图.png)

## 安装与使用

### 网页版

访问 **https://falling-anyway.github.io/zhushroom/** 即可使用，无需安装。

数据保存在浏览器的 `localStorage` 中，不上传服务器。更换设备或清除缓存前，请先在「设置 → 数据」中导出。也可将 `猪事顺利.html` 下载到本地直接打开，功能相同。

### Obsidian 插件（满血版）

1. 将 `猪事顺利.html` 放入库的根目录
2. 将 `obsidian-plugin/zhushroom-full` 复制到库的 `.obsidian/plugins/` 目录
3. 在 Obsidian 的「设置 → 第三方插件」中关闭安全模式，启用 Zhushroom Full
4. 重启 Obsidian，页面会在标签页中打开，之后也可通过左侧边栏图标打开

插件读取 `猪事顺利.html` 并渲染在 iframe 中，页面产生的读写请求经 Obsidian 接口写入库内文件，因此不需要授权文件夹。

数据写入库中的 `日程/` 目录（名称可在设置中修改）：

| 目录 | 内容 |
| :--- | :--- |
| `日程/01-每日日程/` | `日程-YYYY-MM.md`、`心情-YYYY-MM.md` |
| `日程/07-习惯打卡/` | `习惯打卡.md` |
| `日程/08-文艺审美/` | `书评/`、`影评/`、`游记/` |
| `日程/_同步备份/` | 保存前的快照，用于撤销上一次保存 |

Release 中也提供 `zhushroom-full.zip`，内含页面、插件、同步助手与使用说明，解压后按 `使用说明.txt` 放置即可。

### 同步助手（可选）

用于同步教务网课表与学在浙大待办。不安装也可正常使用本应用，仅需手动填写课程表。上述两种用法均可配合使用。

1. 下载 Release 中的 `zju-sync-helper.zip`，解压到任意目录
2. 双击 `登录一次.bat`，在打开的浏览器中完成浙大统一身份认证，并打开一次教务网课表页
3. 双击 `start-hidden.vbs` 启动后台服务，监听 `127.0.0.1:8765`
4. 回到页面，点击右上角云朵图标，选择「立即同步」

请勿使用仓库首页的 Code → Download ZIP 获取同步助手，该方式下载的压缩包不含 `zju-sync-service.exe`，`.bat` 的行尾换行也会被改写。同步助手仅在本机运行，Cookie 与缓存均保存在本地；如需开机自启，可将 `start-hidden.vbs` 的快捷方式放入 `shell:startup`。

## 使用

- 顶部右侧依次为「选择 Obsidian 库」「撤销上一次保存」「保存到 Obsidian」「拉取学在浙大 DDL」，最右为更多菜单
- 点击列标题「周X」可直接为该日添加事项
- 添加事项弹窗分为「事项」与「DDL」两个标签，DDL 只需填写截止时间
- 课程表生成的课程事件不带勾选框，分类固定为「课程」，不计入完成率
- 设置中可调整字号、配色、背景图、称呼、钉钉 Webhook 与侧边栏图标

## 数据与隐私

日程、心情、习惯与复盘保存在浏览器 `localStorage` 中；连接库后同时写入 Markdown 文件。钉钉 Webhook 仅保存在本地。仓库中不包含个人日程数据、登录凭证或同步服务的二进制文件。

## 已知限制

- 以 `file://` 方式打开时，浏览器不会保留目录授权，每个会话需重新选择一次库目录；在 Obsidian 中通过插件打开无此问题
- 应用依赖 Chromium 内核（Edge、Chrome 及 Obsidian 内置内核均可），Firefox 对 File System Access API 的支持不完整
- 学在浙大同步依赖 `zju-sync/` 中的本地服务，其二进制文件未纳入仓库，需自行构建或从 Release 获取

## 截图

| 月视图 | 年视图 |
| :--- | :--- |
| ![月视图](docs/截图/月视图.png) | ![年视图](docs/截图/年视图.png) |

![设置](docs/截图/设置.png)

## 开发

应用日常在 Obsidian 库中编辑，本仓库为发布副本。

```powershell
powershell -ExecutionPolicy Bypass -File tools\publish.ps1          # 同步、检查、提交并推送
powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -DryRun  # 仅执行检查
```

脚本会先检查私有路径、登录凭证、二进制文件与脚本语法，通过后再提交。

## 许可

[MIT](LICENSE)
