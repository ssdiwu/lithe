# Native runtime

This directory is the Rust application runtime. `lib.rs` wires Tauri plugins,
commands, and lifecycle handling. `native_menu.rs` rebuilds the macOS menu from
the active frontend locale. Platform and subsystem code lives under `modules/`.

Keep product identity separate from compatibility protocols. New application
identifiers use the `lithe` namespace. New integrations write `LITHE_*`
environment variables and `notify;Lithe;` terminal markers; the detector only
reads `notify;Terax;` as a legacy compatibility input.
