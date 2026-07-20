# Security

Lithe runs shells, reads and writes files, and talks to AI providers, so
security reports need careful handling.

> [!IMPORTANT]
> Lithe was archived on July 20, 2026. No version now receives security fixes,
> and the repository no longer accepts vulnerability reports. Do not rely on
> Lithe for security-sensitive or actively maintained environments.

## Reporting

The archived project does not promise triage or a response. Report a
vulnerability to Terax or the relevant dependency when the same issue exists
there. Maintainers of Lithe forks should publish their own reporting channel
and supported-version policy.

## Supported versions

None. The notarized `v0.1.0` installer remains available only as a historical
artifact and does not receive automatic updates.

## Historical security scope

- The Rust backend in `src-tauri/`
- The frontend in `src/`, especially surfaces that consume untrusted input
- Lithe-owned build and release configuration

Report upstream dependency vulnerabilities to the relevant upstream project.
Report Terax-specific behavior to Terax unless it is reproducible in Lithe.

## Security properties

- API keys use the operating-system keychain where supported and the
  `lithe-ai` service namespace.
- Lithe has no telemetry and no automatic update channel.
- Agent file writes and shell commands require approval.
- The renderer has no Node.js access and can call only allow-listed Tauri
  commands.

Lithe runs commands with the current user's permissions, and AI providers can
see the content explicitly sent to them. Only configure endpoints you trust.
