# 给协作 Agent 的规则

## 只有一个源文件

库根目录的 `猪事顺利.html`（本仓库副本由 `tools\publish.ps1` 生成）是唯一源。满血版插件 `zhushroom-full` 运行时直接读库根的这份文件，所以改它立刻就是满血版的效果，不需要重建插件。

商店版（`Falling-anyway/zhushroom-calendar`，id `zhushroom-calendar`）不是源，是从源派生的产物：`tools\build.js` 注入 `<script>window.__ZS_STORE_BUILD__=true;</script>` 后把整页塞进 `main.js`。

## 改动顺序

1. 先只改满血版：直接编辑 Obsidian 库根目录的 `猪事顺利.html`（以及需要时 `.obsidian\plugins\zhushroom-full\`）。
2. 攒够一批再同步商店版：
   - `powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -DryRun` 把页面复制到本仓库并脱敏；
   - `node tools\build.js 猪事顺利.html` 在 `zhushroom-calendar` 仓库里重建 `main.js`；
   - 跑 `node --check main.js`、`node test\harness.js`、`node tools\check-manifest.js`、`node tools\rebuild.js`。
3. 不要「改一处就发一个版本」：版本号、`git push`、`gh release create` 都要等用户明确说。

## 两套东西别混

| | 满血版 | 商店版 |
| --- | --- | --- |
| 插件 id | `zhushroom-full` | `zhushroom-calendar` |
| 页面 | 读库根 `猪事顺利.html` | 内联在 `main.js` 里 |
| 学在浙大同步、钉钉 | 保留 | 被 `__ZS_STORE_BUILD__` 隐藏 |
| 来源目录 | `obsidian-plugin/zhushroom-full` | 另一个仓库 `zhushroom-calendar` |

## 打包与发布

- 全量包：`tools\build-full.ps1` → `dist\zhushroom-full.zip`（html + 满血插件 + 同步助手 + 使用说明）。
- 同步助手：`tools\build-helper.ps1` → `dist\zju-sync-helper.zip`。
- 两个 `.ps1` 必须保存为 **UTF-8 BOM**，否则 PS 5.1 报 `Missing closing '}'`；`*` 批处理与 vbs 必须 CRLF（`.gitattributes` 已固定）。
- 本机到 github.com 直连常失败，push 用 `git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 push`。
