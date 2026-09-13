# 以闪个人版 — 当前工程状态

## 固定开发顺序

先找到目标版本全量资源与依赖、统一读取和预览，再分方向修共用解析/转换/渲染规则。不能先精修孤立样品，再考虑找其余资源。不得把官网宣传图或测试夹具计入衣柜。主目标是换装、原版动作/舞蹈/拍摄，后续可有家园、宠物、本地抽卡及自制内容；不要求照搬全部在线玩法。

## v0.1 已实现并验证

- Python 标准库本地只读中转 + 无外部依赖单文件 HTML/TXT。
- 官方下载按钮/脚本入口发现，真实文件头探测，单 Range 与严格长度/版本校验。
- 127.0.0.1:18763，Windows 双击启动自动开浏览器；不改 ES/PJSK 任何已有部署。
- %LOCALAPPDATA%/YSLResourceBridge 持久分段缓存，URL/ETag/Range 键、SHA-256 核验。稳定路径，不随版本清空。
- ZIP/APK 中央目录、store/deflate 小条目及 CRC 检查；PNG/JPEG/OGG/WAV 和文本预览。
- 29 项测试在 Linux、Windows 均通过；实际浏览器打开及缓存页检查通过；实际 PyInstaller EXE 启动、HTTP、HTML/TXT 一致性、退出通过。
- 修复 Windows sqlite3 上下文不自动关闭连接造成的文件占用；修复禁用的目录/大条目按钮被全局恢复的问题。

验证 run: https://github.com/sakaikasumi/xxn-project/actions/runs/34757850710
Windows artifact: 10317319773 / YSL-v0.1-Windows-portable，9,741,326 bytes。
Source/client artifact: 10318205396 / YSL-v0.1-fixed-source-client，110,938 bytes。
HTML/TXT Linux 源内容各 19,131 bytes，SHA256 8da74dde4e3a6a6d5c01b1b5181929002a5e8edb96ca75a1a5dce97fd8e1077a。
这两个包已下载回当前对话：YSL_v0.1_Windows.zip、YSL_v0.1_WebSource.zip。

## 官方资源调查的实测事实

2026-09-13 官网当前 PC 下载按钮脚本为 https://mystyle.archosaur.com/assets/260831/public/pcclick.js 。
它指向 https://autopatch-projecti-put-hs.zulong.com/projectIgame_ob/media/yslzminstallerbd.exe 。
首次连接超时，调整选择公网 IPv4 后实测 GET Range 成功：HTTP 206、bytes 0-127/83045208、MZ/PE，ETag "a57bd902a20408e9f8f3f33c20e93b45"。这是安装器，不是游戏全量资源。

Android 下载脚本 https://mystyle.archosaur.com/d/js/index.js 含主包和多个渠道入口，包括 tc-channel 子域的 360 渠道包。主包 https://autopatch-projecti-tc-pkg.zulong.com/projectIgame_ob/media/yslzm.apk 和旧 PC 下载地址在本次 Linux 环境返回 HTTP 200 text/html 脚本页，不是游戏包；不能把 200 视作成功，不执行此脚本，不缓存为二进制。渠道包可调查，但区服/包版本不得混合。

官网标题的 4.4 只是网站宣传版本，不代表已解析到 4.4 的资源索引。

PC 安装器静态拆解、寻找内嵌更新配置的后续调查：
https://github.com/sakaikasumi/xxn-project/actions/runs/34757992192
以该 run 的实际日志和 artifact 为准；未取得其结果前不能声称已获得版本清单。该调查不执行游戏/安装器，仅分段下载不超过 100 MiB 的已验证文件并用 7-Zip 静态读取。

## 仍未完成（禁止误报完成）

全量更新 manifest、所有资源分包/依赖、IGUF/特殊 PNG 容器、UE 模型/骨骼/材质/动画转换、真实衣柜和换装/舞蹈均未接通。
/catalog 明确返回 not_obtained / coverage unknown。
GPU 仅能力检测，不代表已经渲染 UE 模型。
公开云中转未部署：Lovable 新建失败（workspace credits）；Replit 无相应订阅；Vercel 部署调用未成功。现在交付是本地中转，不是仅打开 Canvas/HTML 就有云中转。
ZIP64、多卷和 PE 安装器不属于 v0.1 客户端内置解包支持，静态调查是另一条开发步骤。

## 项目位置与交付

代码仅位于 sakaikasumi/xxn-project 的 ysl-resource-bridge 独立分支；main 完全不动。不合并、不覆盖现有项目。
继续开发优先获取真实资源清单，不做空抽卡/假人物或过度界面设计；用户不愿上传大资源。保留 v0.1 已验证的中转与缓存，并依据真实资源格式补适配。

## 0.1.1 封包补充
修复 HTTP 200 零字节误标为 sample_received，新增第 30 项测试。原磁盘缓存路径不变。PC 安装器 83,045,208 bytes 已完整静态检查，存在 .enigma1/.enigma2，内层下载配置仍未取出；普通 7-Zip 只展开 PE 节。另一个官方 tc-channel APK 返回 200 零字节，不能用作资源。最新证据见 evidence.json。最终交付以 v0.1.1 包为准，0.1 为中间构建。
