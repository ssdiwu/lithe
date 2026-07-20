# Lithe technical documentation

> [!IMPORTANT]
> Lithe was archived on July 20, 2026. These documents describe the codebase at
> archival time and are no longer actively maintained.

This directory contains the architecture and contributor guides as they stood
at archival time. The inherited `docs/` path was intentionally retained to
reduce noise when selected Terax source changes were synchronized. Project
governance, terminology, decisions, and experience notes live under the
canonical [`doc/`](../doc/README.md) entry instead.

`LITHE.md` defines Lithe-specific identity, localization, and compatibility
boundaries. `TERAX.md` is an inherited architecture reference. If they conflict,
`LITHE.md` wins.

## Start here

- [Project documentation map](../doc/README.md)
- [Lithe boundaries](../LITHE.md)
- [Contributing](../CONTRIBUTING.md)

## Architecture

- [Two-process model and IPC commands](architecture/two-process-model.md)
- [PTY and shell integration](architecture/pty-shell-integration.md)
- [Security model](architecture/security-model.md)
- [AI subsystem](architecture/ai-subsystem.md)
- [Terminal renderer pool](architecture/terminal-renderer-pool.md)

## Maintainer guides

- [Testing](contributing/testing.md)
- [Releasing](contributing/releasing.md)

For localization resources and adding a language, read
[`src/i18n/README.md`](../src/i18n/README.md).
