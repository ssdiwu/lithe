# Rust integration tests

These tests exercise public native command behavior across filesystem search,
Git operations, and background shell execution. They use temporary workspaces
and should not depend on the developer's real repositories or shell history.

Run them with `cargo nextest run --locked` or `cargo test --locked` from
`src-tauri/`.
