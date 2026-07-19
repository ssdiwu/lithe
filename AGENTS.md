# Lithe agent guide

## 项目定位

Lithe 是一个开源、轻量、终端优先的 AI 原生开发工作台，基于 Terax
演进，但拥有独立的产品标识、数据、凭据和发布边界。

## 必读顺序

1. `README.md`：产品定位、运行方式和目录入口。
2. `doc/README.md`：文档地图、权威性和历史边界。
3. `LITHE.md`：Lithe 身份、国际化和兼容性约束。
4. 目标目录及其上下级 `README.md`：目录职责和局部约定。
5. 相关源码与测试。

`TERAX.md` 仅保留继承架构的参考；它与 `LITHE.md` 冲突时，以
`LITHE.md` 为准。

## 代码与安全边界

- 不得恢复 Terax 的 bundle identifier、存储、钥匙串、事件、主题或
  自动更新命名空间。
- `upstream` 远端只用于显式拉取源码；不得向其推送，也不得自动合并
  上游发布产物。
- 所有用户可见文案必须接入 `src/i18n/`。不要翻译代码标识符、命令、
  路径、provider 名称、model 名称和终端协议 token。
- API key 只保存在操作系统钥匙串中；不得写入源码、日志、设置文件、
  `localStorage` 或测试夹具。
- 修改文件系统、shell、网络、IPC 或 AI tool 边界时，必须保留输入校验、
  workspace authorization 和用户审批。
- 不提交 `dist/`、`src-tauri/target/`、本地环境文件、签名证书或公证密钥。

## 工程纪律

- 删除一个模块后复杂度若只是消失，说明它是透传层；只有复杂度会在多个
  调用点重新出现时才保留抽象。
- 只在存在两个以上真实实现的变化点建立接缝；单一 adapter 不提前抽象。
- 函数尽量控制在 100 行以内，超出时按职责拆分。
- 测试公共行为而非内部实现；mock 只放在系统边界。
- 修 bug 先建立快速、确定的 pass/fail 反馈环，再改实现。
- 临时调试日志必须使用唯一 tag，完成后按 tag 全量清理。
- 保持改动聚焦，不混入无关格式化或顺手重构。

## 文档约定

- `doc/` 是项目治理、术语、决策和经验的权威入口。
- `docs/` 保留继承的技术文档路径，以减少上游同步冲突；新增治理文档不要
  放进 `docs/`。
- 含代码的目录必须有最小 `README.md`；职责、入口或边界变化时同步更新。
- 用户可感知变更写入 `CHANGELOG.md` 的 `Unreleased` 段。
- 只有同时满足难逆转、缺少上下文会困惑、存在真实权衡的决定才写 ADR。

## 验证

前端改动按顺序运行：

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm size
```

Rust 或 Tauri 改动还要运行：

```bash
cd src-tauri
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo nextest run --locked
```

若没有 `cargo-nextest`，可用 `cargo test --locked`，并在交付说明中注明。

## 不做事项

- 不把 Lithe 扩成重型全功能 IDE。
- 不为了“以后可能需要”引入依赖、目录或抽象。
- 不在未配置独立签名、公证和发布策略前启用自动更新。
- 不把旧 Terax 截图、名称或 logo 当作 Lithe 的品牌素材。
