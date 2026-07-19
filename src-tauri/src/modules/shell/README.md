# Shell command runtime

This module owns one-shot and background shell execution outside interactive
PTY sessions. It validates working directories through the workspace registry
and preserves command output and exit-status boundaries.
