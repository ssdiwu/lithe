# Terminal module

This module owns terminal panes, renderer pooling, command blocks, and frontend
PTY session coordination.

Explorer paths dropped on a terminal are shell-quoted and inserted at the
current input cursor. Both the classic terminal and Blocks input register this
insertion through the shared terminal-session adapter.
