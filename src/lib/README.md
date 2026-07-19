# Shared frontend utilities

Cross-module frontend utilities live here: platform and launch-directory
detection, shell quoting, fonts, presence tracking, zoom, and shared helpers.

Product-specific state and behavior should remain in its owning module under
`src/modules/` rather than becoming a generic helper here.
