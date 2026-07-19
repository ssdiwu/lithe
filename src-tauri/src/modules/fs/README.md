# Native filesystem boundary

This module owns authorized file reads, atomic mutations, directory trees,
search, grep, and filesystem watches exposed through Tauri commands.

All paths must stay inside an authorized workspace after canonicalization.
Symlinks, partial writes, and destructive mutations require explicit handling;
never move these checks into the renderer.
