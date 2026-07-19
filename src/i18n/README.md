# Internationalization

Lithe initializes its lightweight localization runtime before either webview
renders. English is the fallback language, the system language is selected by
default, and the selected locale is mirrored in local storage so startup does
not wait for the native settings store.

Locale bundles live in `locales/<locale>.json`. Each bundle contains metadata and
all namespace resources for that language. Vite emits these JSON files as
separate assets, so adding translations does not inflate the startup JavaScript
bundle.

Resource paths may mix nested objects with literal keys that contain dots, such
as command IDs. The runtime resolves nested segments first and then checks the
remaining literal key. For a fully flat dynamic key such as a model ID, pass
`keySeparator: false` so the complete key is treated as one identifier.

The `nativeMenu` namespace is sent to the Rust shell before the main window is
shown and whenever the language changes. Keep every native-menu key present in
every locale so macOS menu headings and predefined actions follow the same
language as the webviews.

Locales shipped on macOS also need a matching native localization under
`src-tauri/infoplist/<locale>.lproj`. AppKit uses those bundle localizations for
system-injected menu items and permission prompts that are not owned by the
webview translation runtime.

To add a language:

1. Add its metadata to `catalog.json`.
2. Add a matching `locales/<locale>.json` bundle with the same namespace and key
   structure as English.
3. Run the i18n tests to check key and interpolation parity.

Do not translate code identifiers, provider names, model names, command syntax,
file paths, or the legacy terminal compatibility protocol.
