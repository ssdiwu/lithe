# Native application shell

This directory contains the Tauri configuration, Rust crate, platform assets,
capability allowlists, and installer integration for Lithe.

- `tauri.conf.json` owns the product name, bundle identifier, packaging, and
  webview security policy.
- `infoplist/` declares native macOS localizations so AppKit-provided menu items
  and permission prompts use a language supported by Lithe.
- `src/` owns native commands and application lifecycle wiring.
- `capabilities/` owns the webview plugin allowlists.

Lithe must not configure an updater endpoint for the upstream Terax releases.
Legacy terminal protocol markers are retained only where changing them would
break existing shell and coding-agent integrations.
