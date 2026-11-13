# 猪事顺利 · Zhushroom

单文件日历应用。周 / 月 / 年视图、课程表、DDL 倒计时、习惯打卡、心情与复盘，数据和 Obsidian 库里的 md 双向同步。

![周视图](docs/截图/周视图.png)

## 用法

### 网站版

打开 **https://falling-anyway.github.io/zhushroom/** 就能用，不用装东西。

数据放在浏览器的 `localStorage` 里，不联网。换设备或清缓存之前，先去「设置 → 数据」导出。把 `猪事顺利.html` 下载到本地双击，效果一样。

### 满血版（Obsidian 插件）

1. `猪事顺利.html` 放到库的根目录
2. `obsidian-plugin/zhushroom-full` 复制到库的 `.obsidian/plugins/` 下
3. Obsidian 设置 → 第三方插件，关掉安全模式，启用 Zhushroom Full
4. 重启 Obsidian，页面会在标签页里打开；之后也能点左边的侧边栏图标

插件把页面放进 iframe，页面读写的 md 都走 Obsidian 的接口落盘，不用授权文件夹。数据写在库里的 `日程/` 下（名字可以改）：`01-每日日程/` 放日程和心情，`07-习惯打卡/` 放打卡，`08-文艺审美/` 放书评影评游记，`_同步备份/` 是保存前的快照，用来撤销。

不想一步步来的话，Release 里的 `zhushroom-full.zip` 已经打包好了页面、插件、同步助手和说明。

### 同步助手（可选）

不装也能用，只是课表得手填、学在浙大的待办得手抄。要用的话：

1. 下载 Release 里的 `zju-sync-helper.zip`，解压到任意目录
2. 双击 `登录一次.bat`，在跳出的浏览器里登录浙大身份认证，打开一次教务网课表页
3. 双击 `start-hidden.vbs` 起后台服务，监听 `127.0.0.1:8765`
4. 回到页面，点右上角云朵图标，选「立即同步」

别用仓库首页的 Code → Download ZIP，那里面的包没有 `zju-sync-service.exe`，`.bat` 的行尾也会坏掉。助手只在本机跑，Cookie 和缓存都在你自己的电脑上；想开机自启，把 `start-hidden.vbs` 的快捷方式放进 `shell:startup`。

## 用的时候

- 顶栏右边依次是「选择 Obsidian 库」「撤销上一次保存」「保存到 Obsidian」「拉取学在浙大 DDL」，最后一格是更多菜单
- 点列顶的「周X」，可以给那天加事项
- 添加弹窗分「事项 / DDL」两页，DDL 只填截止时间
- 课程表生成的课程事件没有勾选框，分类固定是「课程」，也不计入完成率
- 设置里有字号、配色、背景图、称呼、钉钉 Webhook、侧边栏图标

## 数据和隐私

日程、心情、习惯、复盘平时都在 localStorage，连了库就同时写 md。钉钉 Webhook 只存在本地。仓库里没有个人日程、登录凭证，也没有同步服务的二进制。

## 已知限制

- 用 `file://` 打开时浏览器不肯记住目录授权，每个会话要重选一次；在 Obsidian 里用插件没这个问题
- 需要 Chromium 内核（Edge、Chrome、Obsidian 自带的内核都行），Firefox 对 File System Access API 支持不全
- 学在浙大同步依赖 `zju-sync/` 里的本地服务，二进制没入库，得自己构建或者从 Release 拿

## 截图

| 月视图 | 年视图 |
| :--- | :--- |
| ![月视图](docs/截图/月视图.png) | ![年视图](docs/截图/年视图.png) |

![设置](docs/截图/设置.png)

## 开发

应用平时在 Obsidian 库里改，这个仓库是发布副本：

```powershell
powershell -ExecutionPolicy Bypass -File tools\publish.ps1          # 同步、检查、提交、推送
powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -DryRun  # 只看检查结果
```

脚本会先查私有路径、凭证、二进制和脚本语法，过了才提交。

## 许可

[MIT](LICENSE)
