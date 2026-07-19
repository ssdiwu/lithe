# Build helper scripts

This directory contains repository-only build analysis helpers.

- `eager-graph.mjs` traces eager Vite imports from an entry point so accidental
  startup-bundle growth can be diagnosed.
- `eager-graph.d.mts` declares the helper module for TypeScript tooling.

These scripts do not run inside the packaged application.
