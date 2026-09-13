# 以闪资源接入 v0.1.1 — 中转与缓存开发版

这不是已经完成的换装游戏。当前交付真实可运行的本地只读中转、官网下载入口调查、分段磁盘缓存和 ZIP/APK 浏览底座。全量热更新清单、IGUF/PNG 容器解析、UE 模型/材质/动作尚未完成，不伪造衣柜或服装数量。

## Windows 使用

下载 Windows 便携包，解压后双击 `YSL_v0.1.1.exe`。无需安装 Python、Node 或运行批处理；会自动打开 `http://127.0.0.1:18763/`。点击“检查官方入口”，再选择已发现入口读取文件头、缓存分段或查看 ZIP/APK 目录。

单独的 HTML/TXT 是同内容客户端，不含服务器；需要上述中转运行。它们不是已经部署的在线站点，也没有声称 Gemini Canvas 可以直接访问此本机地址。资源入口检查有真实网络错误；返回 200 的 HTML/脚本会明确标记失败，不存为游戏文件。

关闭网页不会结束中转；页面右上角“关闭中转”会退出进程，缓存保留。没有开机自启、后台更新、账号登录、遥测或 AI 调用。程序只监听本机，不向局域网/公网开放。可执行文件由本仓库代码通过 GitHub Actions 打包，未数字签名。

## 缓存

默认 `%LOCALAPPDATA%\YSLResourceBridge`，界面显示精确路径。原始分段按 URL + ETag（或 Last-Modified/长度）+ 范围保存，读出时核对 SHA-256。没有版本标识则不复用持久分段。不自动删除旧缓存；后续程序升级也不更换该根目录。原始游戏大文件不在发行包中。

界面一次缓存前 64 KiB，ZIP 浏览按需读取尾部、目录和选中条目。每个网络分段最多 2 MiB，解压条目最多 8 MiB，目录最多 32 MiB。不是全资源批量下载器；后续找到 manifest 才能实现全量索引和按需游戏对象加载。

## 已确认的资源入口

当前官网首页下载按钮在 `assets/260831/public/pcclick.js` 中使用 `https://autopatch-projecti-put-hs.zulong.com/projectIgame_ob/media/yslzminstallerbd.exe`。

另有官网内页的安卓 APK 和旧 PC 入口。2026-09-13 的 Linux 服务器实测中，`autopatch-projecti-tc-pkg.zulong.com` 的这两个 URL 返回约 1 KiB 的 HTML 脚本，不是安装包。应区别来源可见、HTTP 成功、二进制可读、资源可解包四个状态；不同网络可重新探测。

网站标题显示 4.4，但它是网站宣传版本，不能作为已取得的游戏资源版本。详细证据见 evidence.json、原始调查 Actions 和本次 live-probe.json（发行包内）。

## 实现与限制

- HTTPS 官方域白名单，DNS 公网地址验证并固定目标 IP，TLS 主机校验；重定向每跳复核。不会转发 Cookie、Authorization 或执行源脚本。
- GET/HEAD/Range 读取、上游错误/错误范围/版本变更/短读检测、并发最多 2。
- 本地磁盘分段与索引持久缓存，元数据 5 分钟 TTL，缓存校验失败会重取。断网浏览完整 ZIP 仍可能需要已缓存的元数据；不宣称完全离线。
- ZIP/APK store/deflate 条目读取和 CRC 检查。ZIP64、多卷、加密 ZIP、PE/NSIS、UE/IGUF 目前明确返回不支持。
- UI 可查看文本、真实 PNG/JPEG、OGG/WAV；其他格式显示原始文件头并可保存，不能把 `.png` 扩展名直接当作图片。
- GPU 功能只检测浏览器 WebGPU/WebGL2 能力。3D 模型转换与运行没有实现。
- 热更新全目录、按活动/部件组织衣柜、换装、舞蹈、抽卡和自制内容尚未接通。

## 源码运行与接口

Python 3.11+：`python bridge.py`。服务器和客户端没有 pip/npm 运行依赖。

`/api/ysl/health`、`/discover`、`/probe?url=...`、`/asset?url=...`（必须 Range）、`/archive?url=...&q=...&page=0`、`/entry?url=...&name=...`、`/cache`、`/catalog`。刷新和退出为带本地会话 token 的 POST。`/catalog` 在尚未获取真实 manifest 时会返回 `not_obtained`，不返回虚构条目。

测试：`python -m unittest tests -v`。测试夹具与官方实测分开，夹具不会在用户目录显示。构建流程将执行源码测试、真实官方探测、浏览器 UI 烟测以及 Windows 打包后 HTTP 烟测。以实际 Actions 结果为准，不把“构建成功”混同于“全量资源已接入”。

代码在 `ysl-resource-bridge` 独立分支；不修改该仓库 main，不修改既有 ES/PJSK 的代码或部署。
