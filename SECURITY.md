# Security

Lithe runs shells, reads and writes files, and talks to AI providers, so
security reports need careful handling.

## Reporting

Do not open a public issue for a suspected vulnerability. Use GitHub's
[private vulnerability-reporting form](https://github.com/ssdiwu/lithe/security/advisories/new).
Keep the report private and include:

- What the issue is and what it lets an attacker do
- Reproduction steps and a minimal proof of concept when possible
- The Lithe version, operating system, and architecture

## Supported versions

Before `1.0.0`, only the latest Lithe minor version receives security fixes.
Lithe does not currently publish official installers or automatic updates.

## In scope

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
