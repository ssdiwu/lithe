# Terminal runtime helpers

This directory contains frontend terminal-session adapters, activity tracking,
renderer coordination, and Tauri event bridges. Cross-process event names use
the `lithe` namespace.

`terminalImeFallback.ts` supplies the WKWebView keyup fallback missing from
xterm 6.0 for punctuation entered while a CJK IME is active. It must not take
ownership of real composition sequences.
