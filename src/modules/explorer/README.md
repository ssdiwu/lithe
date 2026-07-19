# Explorer module

This module owns the file tree, file search, and explorer actions.

Internal drag-and-drop distinguishes terminal targets from explorer targets.
Drops on a terminal insert the shell-quoted path; filesystem moves only occur
inside the explorer and require confirmation before changing disk state.
