<div align="center">
  <img src="public/lithe-icon.svg" width="96" height="96" alt="Lithe icon" />
  <h1>Lithe</h1>
  <p><strong>A lightweight, terminal-first AI-native developer workspace.</strong></p>
  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="https://github.com/ssdiwu/lithe/actions/workflows/ci.yml"><img src="https://github.com/ssdiwu/lithe/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache-2.0" /></a>
  </p>
</div>

Lithe puts a native terminal, file explorer, code editor, Git, web preview, and
controllable AI tools in one workspace. It is intended for developers who want
more context around their shell without adopting a heavyweight, closed AI IDE.

> [!NOTE]
> Lithe is an early public preview. Source builds are available today; official
> installers and an automatic update channel are not yet published. macOS is
> the currently verified desktop platform, while Linux and Windows remain
> supported targets and are covered by CI.

Lithe is derived from [Terax](https://github.com/crynta/terax-ai) and preserves
its Git history and Apache-2.0 attribution. It is independently maintained with
a separate application identifier, data, credentials, branding, and release
boundary. It never updates from Terax releases.

## Highlights

- **Terminal first:** native PTY sessions, tabs, splits, search, OSC shell
  integration, and an optional command-block presentation.
- **Project context:** file explorer, CodeMirror editor, Git history and source
  control, Markdown and local web previews.
- **Bring your own model:** OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek,
  Ollama Cloud, local Ollama, LM Studio, MLX, and OpenAI-compatible endpoints.
- **Two agent paths:** use Lithe's built-in AI runtime or launch terminal agents
  such as Pi without replacing their own Skills, extensions, or TUI.
- **Reviewable actions:** plans, file diffs, tool approvals, sub-agents, project
  memory, snippets, voice input, and explicit shell/file-write approval.
- **Internationalized:** English and Simplified Chinese ship today, with a
  locale catalog and parity tests for community translations.
- **Private by default:** provider keys live in the operating-system keychain;
  Lithe has no telemetry and no automatic updater.

## Build from source

Prerequisites:

- Node.js 22+ and the `pnpm` version pinned in `package.json`
- Rust stable
- The [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

```bash
pnpm install
pnpm tauri dev
```

Create a production bundle with:

```bash
pnpm tauri build
```

Lithe does not publish installers yet. Only install a locally built package
when you trust the checkout and signing identity that produced it.

## Configure AI

Open **Settings → Models**, add a provider key, then select any model exposed by
that provider. Local providers can point to Ollama, LM Studio, or MLX. Secrets
are stored through the native keyring bridge, not in application settings.

To use Pi as a terminal agent, install Pi separately and run **Launch Pi** from
the command palette or start `pi` in a Lithe terminal.

## Validate a change

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

Use `cargo test --locked` when `cargo-nextest` is unavailable.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/` | React frontend, product modules, settings, and localization runtime |
| `src-tauri/` | Rust backend, PTY, filesystem, Git, network, keyring, and packaging |
| `doc/` | Canonical project map, terminology, decisions, and experience notes |
| `docs/` | Technical architecture and contributor guides retained at the inherited path |
| `LITHE.md` | Lithe identity, i18n, and compatibility boundaries |
| `TERAX.md` | Inherited architecture reference; never overrides `LITHE.md` |

Start with the [project documentation map](doc/README.md). Localization
contributors should also read [`src/i18n/README.md`](src/i18n/README.md).

## Contributing and security

Issues and focused pull requests are welcome. Read
[`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing a substantial change and
use the repository's private vulnerability-reporting flow for security issues;
see [`SECURITY.md`](SECURITY.md).

## Releases and updates

Lithe deliberately has no automatic updater. The current release workflow
creates draft GitHub releases from version tags and requires Lithe-owned signing
credentials. See the [maintainer release guide](docs/contributing/releasing.md).

## License and attribution

Lithe is licensed under [Apache-2.0](LICENSE). It is derived from Terax by
Crynta and contributors; see [NOTICE](NOTICE). The Terax name and logo are not
used as Lithe branding.
