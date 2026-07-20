# Lithe 文档地图

> [!IMPORTANT]
> Lithe 已于 2026 年 7 月 20 日归档。本文档保留归档时的实现、边界和历史
> 语境；仓库不再接受更新、贡献或安全报告。

这里是 Lithe 项目知识的权威入口，用来区分当前实现、长期决策、可变经验、
路线图和继承资料。

## 阅读顺序

1. [`README.md`](../README.md)：产品定位、运行方式和公开入口。
2. [`LITHE.md`](../LITHE.md)：Lithe 身份、国际化和兼容性边界。
3. 与任务相关的 [`docs/`](../docs/README.md) 技术文档和代码目录
   `README.md`。
4. 源码与测试：当文档和实现不一致时，以当前测试覆盖的实现为事实，并同步
   修正文档。

## 权威性

| 内容 | 权威来源 | 说明 |
| --- | --- | --- |
| 产品身份、命名空间、上游和更新边界 | [`LITHE.md`](../LITHE.md) | 覆盖继承资料中的冲突内容 |
| 当前技术架构 | [`docs/architecture/`](../docs/architecture/) 与源码 | 技术文档应随实现同步 |
| 项目术语 | [`术语表.md`](术语表.md) | 同一概念只保留一个规范叫法 |
| 难逆转决策 | [`决策档案/`](决策档案/README.md) | 只记录存在真实权衡的长期决定 |
| 可改做法与避坑 | [`经验笔记.md`](经验笔记.md) | 记录现象、做法和证据 |
| 归档时路线 | [`ROADMAP.md`](../ROADMAP.md) | 仅记录历史方向，不再代表未来计划 |
| 用户可感知变更 | [`CHANGELOG.md`](../CHANGELOG.md) | 未发布内容先进入 `Unreleased` |

## 技术与维护文档

- [`docs/README.md`](../docs/README.md)：架构与贡献文档索引。
- [`src/i18n/README.md`](../src/i18n/README.md)：语言资源、原生菜单和新增
  locale 的约定。
- [`docs/contributing/testing.md`](../docs/contributing/testing.md)：测试分层和
  核心子系统契约。
- [`docs/contributing/releasing.md`](../docs/contributing/releasing.md)：版本、
  签名、公证和 GitHub draft release 流程。
- [`CONTRIBUTING.md`](../CONTRIBUTING.md)：贡献范围、质量门槛和 PR 约定。
- [`SECURITY.md`](../SECURITY.md)：私密漏洞报告和安全边界。

## 历史与兼容性边界

[`TERAX.md`](../TERAX.md) 保留继承架构背景和上游实现语境，不是 Lithe 产品
身份、存储、国际化或发布策略的权威来源。`docs/` 继续保留原路径，是为了
减少选择性同步 Terax 源码时的无意义冲突；新的治理文档统一写入 `doc/`。
