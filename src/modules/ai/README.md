# AI module

This module owns providers, conversations, agents, tools, and AI-facing user
interfaces. Lithe credentials and persisted AI state use the `lithe` namespace
and must not read Terax stores implicitly.

Ollama Cloud is represented as a dedicated provider. Its API key remains in the
keyring, while its dynamically discovered model names, capabilities, and
context windows are cached in the preferences store for reuse by chat,
sub-agents, model defaults, and editor autocomplete.
