# Changelog

All notable changes to Lithe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Archived the repository as a read-only historical reference; active
  maintenance, dependency updates, security fixes, and future releases have
  ended.
- Corrected the public documentation to record that the published `v0.1.0`
  Apple Silicon packages are Developer ID-signed and Apple-notarized.

## [0.1.0] - 2026-07-20

### Added

- Added an extensible localization layer with English fallback, system
  language detection, manual language selection, and Simplified Chinese.
- Added a dedicated Ollama Cloud provider that uses one API key to discover the
  complete model catalog, official per-model capabilities and context windows,
  and exposes those models to chat, defaults, sub-agents, and autocomplete.
- Added a command-palette action that launches Pi in a project terminal.

### Changed

- Separated the application, persisted data, credentials, events, themes, and
  release identity from Terax under the Lithe namespace.
- Linked the About screen to Lithe's own source repository while retaining
  explicit attribution to the Terax upstream project.

### Fixed

- Resolved localized command, shortcut, model, and speech-provider labels whose
  identifiers contain dots instead of exposing translation keys or falling
  back to English.
- Synchronized the macOS native menu and AppKit-provided menu items with the
  selected interface language.
- Allowed configured custom endpoint models to be selected, persisted, and
  reused as the default chat model and by read-only sub-agents.
- Removed delayed CJK-IME punctuation input in the terminal by leaving active
  composition to xterm and adding a WKWebView keyup fallback that works with
  both WebKit process keys and physical key codes reported by third-party
  macOS input methods.
- Made explorer-to-terminal drag-and-drop insert a shell-quoted path at the
  cursor, while real file moves now require confirmation and can no longer fall
  through to the workspace root.
- Disabled render-profiling overlays by default; they now load only through the
  explicit `pnpm dev:profile` development command and are excluded from release
  builds.
- Allowed Ollama Cloud catalog discovery through proxy/TUN fake-IP mappings
  while retaining metadata-address blocking and DNS pinning, and exposed the
  concrete request error when catalog loading fails.
- Replaced the misleading provider "Connected" badge with "Key saved" because
  the badge reflects keychain state rather than a successful network probe.
- Kept the terminal selection AI action on one line in every shipped locale by
  sizing and positioning the popup from its rendered content.
- Localized the Shell/AI input-mode labels instead of leaving the Shell label
  hard-coded in otherwise translated UI.

### Removed

- Removed the Terax release updater and automation that downloaded or tracked
  upstream Terax release artifacts.

[Unreleased]: https://github.com/ssdiwu/lithe/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ssdiwu/lithe/releases/tag/v0.1.0
