# Maintainer release guide

Lithe keeps source publication separate from binary distribution. Pushing the
repository does not create an installer release and does not enable automatic
updates.

## Before a version release

1. Choose the version explicitly; do not infer it from the number of commits.
2. Move user-visible entries from `CHANGELOG.md`'s `Unreleased` section into a
   dated version section.
3. Keep the same version in `package.json`, `src-tauri/Cargo.toml`, and
   `src-tauri/tauri.conf.json`, then refresh both lockfiles.
4. Run the frontend and Rust checks documented in `AGENTS.md`.
5. Inspect the final diff and verify that no API keys, certificates, `.p8`,
   `.p12`, provisioning profiles, or local build artifacts are tracked.

## GitHub workflow

Tags matching `v*` trigger `.github/workflows/release.yml`. The workflow builds
macOS arm64 and x86_64 packages, Linux packages, and Windows packages through
`tauri-apps/tauri-action`. It creates a **draft** GitHub release so maintainers
can inspect every artifact before publication.

The macOS jobs require repository secrets for the Lithe-owned Developer ID
certificate and App Store Connect API credentials. Secret values must stay in
GitHub Actions secrets and must never be committed. A successful signature is
not the same as notarization: verify both before publishing a macOS asset.

## Update boundary

`createUpdaterArtifacts` is disabled and the application contains no updater
plugin or endpoint. Publishing a GitHub release therefore does not make an
installed Lithe build self-update. Adding an update channel is a separate
product and security decision covered by the identity/upstream ADR.

## Local packages

Local `.app` and `.dmg` files under `src-tauri/target/` are ignored build
artifacts. They are not release evidence on their own. Record the source commit,
signing identity, notarization result, and checksum when handing a package to
another person.
