<div align="center">
  <img src="public/lithe-icon.svg" width="96" height="96" alt="Lithe 图标" />
  <h1>Lithe</h1>
  <p><strong>轻量、终端优先的 AI 原生开发工作台。</strong></p>
  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="https://github.com/ssdiwu/lithe/actions/workflows/ci.yml"><img src="https://github.com/ssdiwu/lithe/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache-2.0" /></a>
  </p>
</div>

Lithe 把原生终端、文件浏览、代码编辑、Git、网页预览和可控的 AI 工具放在
同一个工作台里。它面向希望给终端补足项目上下文、但不想迁入臃肿封闭 AI
IDE 的开发者。

> [!NOTE]
> Lithe 目前是早期公开预览版。0.1.0 在
> [Releases](https://github.com/ssdiwu/lithe/releases/latest) 提供经
> Developer ID 正式签名的 Apple Silicon macOS 安装包，但尚未完成
> Apple 公证。Linux 与 Windows 仍是支持目标，并由 CI 持续检查。
> Lithe 没有自动更新通道。

Lithe 基于 [Terax](https://github.com/crynta/terax-ai) 演进，保留原始 Git
历史和 Apache-2.0 归属说明，但由独立项目维护，使用单独的应用标识、数据、
凭据、品牌和发布边界，也不会从 Terax 的 release 自动更新。

## 主要能力

- **终端优先：** 原生 PTY、标签页、分屏、搜索、OSC shell 集成，以及可选
  的命令 Block 展示模式。
- **项目上下文：** 文件树、CodeMirror 编辑器、Git 历史与源码管理、
  Markdown 和本地网页预览。
- **自带模型：** OpenAI、Anthropic、Gemini、OpenRouter、DeepSeek、
  Ollama Cloud、本地 Ollama、LM Studio、MLX，以及 OpenAI-compatible
  endpoint。
- **两条智能体路径：** 既可以使用 Lithe 内置 AI，也可以直接启动 Pi 等
  终端智能体，继续沿用它们自己的 Skills、扩展和 TUI。
- **可审查执行：** 计划、文件 diff、工具审批、子智能体、项目记忆、片段、
  语音输入，以及明确的 shell / 文件写入授权。
- **国际化：** 当前内置英文和简体中文，提供 locale catalog 和资源一致性
  测试，便于社区继续贡献其它语言。
- **默认私密：** 提供商密钥保存在操作系统钥匙串；Lithe 没有遥测，也没有
  自动更新器。

## 从源码运行

前置依赖：

- Node.js 22+，并使用 `package.json` 固定的 `pnpm` 版本
- Rust stable
- 当前平台对应的 [Tauri 系统依赖](https://tauri.app/start/prerequisites/)

```bash
pnpm install
pnpm tauri dev
```

构建正式安装包：

```bash
pnpm tauri build
```

[v0.1.0 发行版](https://github.com/ssdiwu/lithe/releases/tag/v0.1.0)
包含经 Developer ID 正式签名的 Apple Silicon macOS 安装包和校验和。
由于尚未完成 Apple 公证，Gatekeeper 可能要求使用“Control 点按 → 打开”。
只应安装来自你信任的源码和签名身份的包。

## 配置 AI

打开“设置 → 模型”，加入提供商密钥，然后从该提供商返回的模型中选择。
本地提供商可连接 Ollama、LM Studio 或 MLX。密钥经原生桥接保存到系统
钥匙串，不会写入普通设置。

如需使用 Pi，请先单独安装 Pi，再从命令面板运行“启动 Pi”，或直接在 Lithe
终端中执行 `pi`。

## 验证改动

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm size

cd src-tauri
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo nextest run --locked
```

没有安装 `cargo-nextest` 时，可使用 `cargo test --locked`。

## 项目地图

| 路径 | 职责 |
| --- | --- |
| `src/` | React 前端、产品模块、设置和国际化运行时 |
| `src-tauri/` | Rust 后端、PTY、文件系统、Git、网络、钥匙串和打包 |
| `doc/` | 权威项目地图、术语、决策档案和经验笔记 |
| `docs/` | 为降低上游同步冲突而保留原路径的技术架构与贡献文档 |
| `LITHE.md` | Lithe 身份、国际化和兼容性边界 |
| `TERAX.md` | 继承架构参考；不能覆盖 `LITHE.md` |

建议先读[项目文档地图](doc/README.md)。贡献翻译时再阅读
[`src/i18n/README.md`](src/i18n/README.md)。

## 贡献与安全

欢迎提交问题和聚焦的 pull request。较大改动请先阅读
[`CONTRIBUTING.md`](CONTRIBUTING.md)。安全问题不要公开提交，请按
[`SECURITY.md`](SECURITY.md) 使用仓库的私密漏洞报告入口。

## 发布与更新

Lithe 有意禁用自动更新。当前 release workflow 只能针对已存在的
版本 tag 由维护者手动触发，并要求使用 Lithe 自己的签名凭据。详见
[维护者发布指南](docs/contributing/releasing.md)。

## 许可证与归属

Lithe 使用 [Apache-2.0](LICENSE) 许可证，基于 Crynta 与贡献者维护的 Terax
演进，详见 [NOTICE](NOTICE)。Terax 名称和 logo 不作为 Lithe 品牌使用。
