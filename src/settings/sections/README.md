# Settings sections

Each file in this directory owns one user-facing settings category. Visible
labels and descriptions must use the shared i18n resources instead of embedded
English strings.

The models section owns provider credentials and dynamic catalogs. Ollama Cloud
uses one keyring credential and an automatically discovered model list; it is
not modeled as a single custom endpoint.
