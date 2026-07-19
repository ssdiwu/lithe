# 0001：Lithe 产品标识与上游更新边界

- 状态：已接受
- 日期：2026-07-19

## 背景

Lithe 独立维护，同时仍可能选择性吸收 Terax 的源码变更。若继续使用 Terax
的 bundle identifier、存储名、钥匙串服务或更新地址，两款应用可能读取、
覆盖或替换彼此的数据、凭据和二进制文件。

## 决策

Lithe 使用 `app.lithe.workspace` 作为 bundle identifier，并为 package、
持久化状态、凭据和内部事件使用 `lithe` 命名空间。Shell 集成写入
`~/.cache/lithe/shell-integration` 和
`~/.config/fish/conf.d/lithe.fish`，不覆盖 Terax 文件。

Lithe 不包含自动更新器，也不打包从 Terax release 获取的二进制文件。
Terax 只保留为 `upstream` Git 远端，用于维护者显式发起并审查的源码同步。

Lithe 写入 `LITHE_*` 变量、`notify;Lithe;` marker 和
`lithe-notifications.ts` Pi extension。Detector 可以把旧
`notify;Terax;` marker 当作只读兼容输入，但 Lithe 不写入 Terax hook
identifier，也不删除 Terax 拥有的 hook。

## 后果

- Lithe 与 Terax 可以并存，不共享应用数据或凭据。
- 在确定独立分发与更新策略前，Lithe 不提供自动更新。
- 同步涉及身份、存储、打包或更新器的上游变更时必须单独审查。
- Lithe 与 Terax 的 agent hook 可以共存，双方不移除彼此配置。
