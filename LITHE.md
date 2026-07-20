# LITHE.md

Lithe loads `LITHE.md` from a workspace root as project memory. For compatibility,
it falls back to `TERAX.md` when no `LITHE.md` exists.

## Maintenance status

Lithe was archived on July 20, 2026. The source and notarized `v0.1.0` release
remain available as historical references, but the project no longer receives
dependency updates, security fixes, or new releases. Existing installations
remain independent and do not update from either Lithe or Terax.

## Project identity

Lithe is a terminal-first AI-native developer workspace derived from Terax. The
upstream architecture reference remains in `TERAX.md`; this file defines the
fork-specific boundaries that override it.

The canonical project documentation map is `doc/README.md`. Technical guides
remain under `docs/` to reduce noise when selected upstream changes are synced.

- Product name: `Lithe`
- Package and Rust crate: `lithe`
- Bundle identifier: `app.lithe.workspace`
- Settings, local storage, IndexedDB, events, sessions, themes, and keyring
  entries use the `lithe` namespace.
- The Terax release updater and upstream binary packaging automation are not
  part of Lithe. The `upstream` Git remote is for deliberate source sync only.

## Internationalization

The frontend initializes its localization runtime before either webview renders
and sends the active locale's native-menu labels to the Rust shell. English is
the fallback, system language is the default preference, and Simplified Chinese
is the first additional locale. See `src/i18n/README.md` for the resource
contract.

All user-visible frontend strings must use the appropriate namespace. Do not
translate code identifiers, paths, commands, provider names, model names, or
terminal protocol tokens.

## Compatibility boundary

Lithe writes `LITHE_*` shell variables and `notify;Lithe;` OSC markers. The
detector may read legacy `notify;Terax;` markers for compatibility, but new code
must not write Terax variables, hook files, helper arguments, or markers.

## Base architecture and checks

Read `TERAX.md` for the inherited two-process architecture, security model,
subsystem map, and test commands. Where it conflicts with the identity, updater,
or i18n rules above, `LITHE.md` wins.
