# Cursor 简体中文增强汉化 · Cursor Zh-CN

[![Release](https://img.shields.io/github/v/release/Gason-Yang/cursor-zh-cn)](https://github.com/Gason-Yang/cursor-zh-cn/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

在**现有 Cursor 安装上**补充简体中文界面，无需重装、降级或下载另一份 Cursor。

本项目是独立社区工具，不是 Cursor 官方产品，也不是上游中文语言包的官方发行。**只发布补丁生成器、翻译词表和教程，不分发 Cursor 程序或修改后的完整资源文件。**

## 首个版本支持范围

| 项目 | 范围 |
| --- | --- |
| 系统 | Windows x64 |
| Cursor | **3.29.15**，且四个资源文件 SHA-256 与 `supported-build.json` 一致 |
| Node.js | 22 或更高版本，64 位；建议至少预留 6 GB 可用内存 |
| 基础语言包 | `polang233.cursor-language-pack`；首次测试使用 1.1.4 |
| 未支持 | macOS、Linux、其他 Cursor 版本、资源已被其他工具修改的安装 |

相同版本号不代表资源一定相同。哈希不匹配会停止，不提供强行跳过选项。

## 有哪些汉化

- 编辑器及 Agents 的导航、对话入口和常见操作。
- 常规、外观、智能体、模型、通知等专属设置。
- 自动化的分类、筛选、模板、触发器和操作提示。
- 部分账单界面文案；本工具不会操作付款或修改账户账单。
- 当前收录的动态推荐、轮播提示和常见错误说明。

首次本机安装共应用约 **1.4 万处**文字替换；具体数量由生成报告给出。包含机器翻译并做过术语修订，欢迎提交更自然的译文。**不保证每处文字都已人工审校，也不承诺所有功能均已回归测试。** 模型名、产品名、命令、代码及路径保留必要标识；服务端新增内容、第三方网页和示例图片里的文字可能仍是英文。

## 安装教程

### 1. 安装基础语言包

在 Cursor 扩展面板搜索并安装 [Cursor Language Pack](https://marketplace.visualstudio.com/items?itemName=polang233.cursor-language-pack)。

按上游要求，不要与微软或其他同语言的工作台语言包并存。已有其他语言包时，请先在扩展面板卸载冲突项。也可以在终端执行：

```powershell
cursor --install-extension polang233.cursor-language-pack
```

### 2. 下载本项目

从 [Releases](https://github.com/Gason-Yang/cursor-zh-cn/releases) 下载 `cursor-zh-cn-v0.1.1-windows.zip`，解压到普通文件夹。可用同一发布中的 `SHA256SUMS.txt` 核对压缩包。

```powershell
Get-FileHash .\cursor-zh-cn-v0.1.1-windows.zip -Algorithm SHA256
```

### 3. 可选：先预览，不修改安装

安装 Node.js 后，在解压目录打开 PowerShell。以下例子的目录请替换为你的**现有** Cursor 安装目录：

```powershell
.\Install.ps1 -CursorPath 'D:\Apps\Cursor' -PrepareOnly
```

预览会读取原安装、生成本地备份和补丁、检查版本/哈希/JavaScript 语法，不写入 Cursor 安装和显示语言配置。不需要管理员权限。已通过预览后仍需进行下一步应用。

### 4. 应用汉化

先保存工作并**关闭所有 Cursor 窗口**。在解压目录右键 `Install.cmd`，选择“以管理员身份运行”。没有自动找到 Cursor 时，用管理员 PowerShell 明确指定路径：

```powershell
.\Install.ps1 -CursorPath 'D:\Apps\Cursor'
```

`-CursorPath` 也接受 `Cursor.exe` 或 `resources\app` 的路径。语言包不在默认扩展目录时，用 `-LanguagePack` 指向语言包的 `translations\zh-cn\main.i18n.json`。

成功后正常启动原来的 Cursor。语言变化需要完整重启，重载窗口不一定够。

`Install.cmd` 仅为当前 PowerShell 进程使用 `-ExecutionPolicy Bypass` 运行本地未签名脚本，不永久修改系统执行策略。需要管理员权限是因为原安装目录通常受 Windows 文件权限保护。

## 备份与恢复

默认备份在 `%LOCALAPPDATA%\CursorZhCn\3.29.15-<安装路径指纹>`。里面包含原资源、`product.json`、原显示语言配置和部署记录；**不要把这个目录上传到公开仓库**。

关闭所有 Cursor 窗口，用管理员权限右键运行 `Restore.cmd`，或执行：

```powershell
.\Install.ps1 -CursorPath 'D:\Apps\Cursor' -Restore
```

如果安装时设置了自定义 `-BackupDir`，恢复时必须使用相同的目录。恢复会校验已部署文件及备份；检测到 Cursor 更新或文件被修改时停止，避免覆盖新版本。语言配置如在安装后被你改过，恢复会保留你的新配置。单独安装的基础语言包不会被卸载。

## 工作原理与边界

1. 校验精确版本及原文件 SHA-256。
2. 从你本机已安装的基础语言包读取已有译文，并合并本仓库的补充词表。
3. 使用 Cursor 自带的 Acorn 分析 JavaScript，替换选定界面文案并保留模板表达式占位符。
4. 用 Node/V8 检查生成模块的语法；全部生成成功后才允许部署。
5. 备份并写入四个界面资源，更新 `product.json` 中对应的资源校验值，再将用户显示语言设为 `zh-cn`。

这是**修改本地应用资源的非官方补丁**。资源校验值同步更新并不代表官方签名或官方认可。复制或语言设置失败时，安装脚本尝试回滚已修改文件；不对突然断电等进程外故障保证自动恢复。

补丁生成和安装过程不发送网络请求、不收集遥测、不读取账号密码，也不会修改项目或对话数据。安装基础语言包、下载 Node.js/本项目本身需要网络。译文已随发布包提供，安装时不会在线调用翻译服务。

**Cursor 更新可能覆盖补丁。不要把旧补丁用于新版本。** 尚不提供自动更新、强制兼容或长期驻留服务。

## 验证与贡献

见 [VALIDATION.md](VALIDATION.md) 了解已完成的检查和没有覆盖的场景。修订 `translations.tsv` 可覆盖补充词表；`machine-translations.json` 是初始机器翻译语料。涉及 `__CZH_EXPR_0__` 等占位符时必须原样保留。

报告问题时请附系统、Cursor 版本、错误摘要和对应界面文字。不要上传完整安装资源、生成目录、账户信息、密钥或私有项目截图。

## 许可与致谢

本项目自有脚本、文档及补充译文使用 [MIT License](LICENSE)。基础翻译来自使用者本机单独安装的上游语言包；上游原有许可与署名不因本项目改变。

- [polang233/cursor-language-pack](https://github.com/polang233/cursor-language-pack)：社区基础中文语言包。
- [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)：VS Code / Code OSS 本地化资源。
- [Acorn](https://github.com/acornjs/acorn)：JavaScript 语法分析器，运行时使用 Cursor 自带的副本。

完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。Cursor、Visual Studio Code 及其他产品名称归各自权利人所有。
