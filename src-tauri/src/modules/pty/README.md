# PTY subsystem

This module owns terminal process creation, shell integration, output parsing,
agent-state markers, and lifecycle cleanup. Lithe writes `LITHE_*` variables and
`notify;Lithe;` markers. The detector still reads `notify;Terax;` markers as
legacy compatibility input without writing or owning Terax hooks.
