import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  cloneElement,
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
  useSyncExternalStore,
} from "react";
import catalog from "./catalog.json";

type LocaleMetadata = {
  id: string;
  label: string;
  direction: "ltr" | "rtl";
};

export type LocaleBundle = {
  meta: LocaleMetadata;
  resources: Record<string, Record<string, unknown>>;
};

export type LanguagePreference = string;
export type TranslationOptions = Record<string, unknown> & {
  count?: number | string;
  defaultValue?: string;
  keySeparator?: string | false;
  ns?: string | readonly string[];
  nsSeparator?: string | false;
};
export type TFunction = (key: string, options?: TranslationOptions) => string;

type NativeMenuLabels = {
  file: string;
  edit: string;
  view: string;
  window: string;
  help: string;
  about: string;
  services: string;
  hide: string;
  hideOthers: string;
  quit: string;
  closeWindow: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  selectAll: string;
  enterFullScreen: string;
  minimize: string;
  zoom: string;
};

export const SYSTEM_LANGUAGE = "system";
export const FALLBACK_LANGUAGE = catalog.fallback;
export const SUPPORTED_LANGUAGES: readonly {
  id: string;
  label: string;
}[] = catalog.locales;

const DEFAULT_NAMESPACE = "settings";
const FALLBACK_NAMESPACE = "common";
const LANGUAGE_SHADOW_KEY = "lithe-ui-language-shadow";
const supportedIds = new Map(
  SUPPORTED_LANGUAGES.map((locale) => [locale.id.toLowerCase(), locale.id]),
);
const localeUrls = import.meta.glob<string>("./locales/*.json", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});
const loadedBundles = new Map<string, Promise<LocaleBundle>>();
const installedBundles = new Map<string, LocaleBundle>();
const subscribers = new Set<() => void>();

let activeLanguage = FALLBACK_LANGUAGE;
let revision = 0;
let initialized = false;
let systemLanguageListenerInstalled = false;

function localeIdFromPath(path: string): string | null {
  return path.match(/\/([^/]+)\.json$/)?.[1] ?? null;
}

function localeUrl(id: string): string | null {
  for (const [path, url] of Object.entries(localeUrls)) {
    if (localeIdFromPath(path) === id) return url;
  }
  return null;
}

function isLocaleBundle(
  value: unknown,
  expectedId: string,
): value is LocaleBundle {
  if (!value || typeof value !== "object") return false;
  const bundle = value as Partial<LocaleBundle>;
  return (
    bundle.meta?.id === expectedId &&
    (bundle.meta.direction === "ltr" || bundle.meta.direction === "rtl") &&
    !!bundle.resources &&
    typeof bundle.resources === "object"
  );
}

async function loadLocaleBundle(id: string): Promise<LocaleBundle> {
  const existing = loadedBundles.get(id);
  if (existing) return existing;

  const pending = (async () => {
    const url = localeUrl(id);
    if (!url) throw new Error(`No locale bundle registered for ${id}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load locale ${id}: HTTP ${response.status}`);
    }
    const value: unknown = await response.json();
    if (!isLocaleBundle(value, id)) {
      throw new Error(`Invalid locale bundle for ${id}`);
    }
    return value;
  })();

  loadedBundles.set(id, pending);
  try {
    return await pending;
  } catch (error) {
    loadedBundles.delete(id);
    throw error;
  }
}

function installBundle(bundle: LocaleBundle): void {
  installedBundles.set(bundle.meta.id, bundle);
}

function notifySubscribers(): void {
  revision += 1;
  for (const subscriber of subscribers) subscriber();
}

function subscribe(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function getRevision(): number {
  return revision;
}

function valueAt(
  bundle: LocaleBundle | undefined,
  namespace: string,
  path: string,
  separator: string | false,
): string | null {
  const root: unknown = bundle?.resources[namespace];
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;

  if (separator === false) {
    const value = (root as Record<string, unknown>)[path];
    return typeof value === "string" ? value : null;
  }

  const segments = path.split(separator);
  const resolve = (current: unknown, index: number): string | null => {
    if (index === segments.length) {
      return typeof current === "string" ? current : null;
    }
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    const values = current as Record<string, unknown>;
    const nested = resolve(values[segments[index]], index + 1);
    if (nested !== null) return nested;

    const literal = values[segments.slice(index).join(separator)];
    return typeof literal === "string" ? literal : null;
  };

  return resolve(root, 0);
}

function pluralPaths(path: string, options: TranslationOptions): string[] {
  if (options.count === undefined) return [path];
  const category =
    typeof options.count === "number"
      ? new Intl.PluralRules(activeLanguage).select(options.count)
      : "other";
  return [`${path}_${category}`, `${path}_other`, path];
}

function interpolate(template: string, options: TranslationOptions): string {
  return template.replace(
    /{{\s*([^},\s]+)(?:,[^}]*)?\s*}}/g,
    (match, name: string) => {
      const value = options[name];
      return value === null || value === undefined ? match : String(value);
    },
  );
}

function namespaceList(
  key: string,
  namespaces: string | readonly string[] | undefined,
  separator: string | false,
): { namespaces: string[]; path: string } {
  const separatorIndex = separator === false ? -1 : key.indexOf(separator);
  if (separatorIndex > 0 && separator !== false) {
    return {
      namespaces: [key.slice(0, separatorIndex)],
      path: key.slice(separatorIndex + separator.length),
    };
  }
  const selected = Array.isArray(namespaces)
    ? [...namespaces]
    : [typeof namespaces === "string" ? namespaces : DEFAULT_NAMESPACE];
  if (!selected.includes(FALLBACK_NAMESPACE)) selected.push(FALLBACK_NAMESPACE);
  return { namespaces: selected, path: key };
}

function translateWithNamespaces(
  namespaces: string | readonly string[] | undefined,
  key: string,
  options: TranslationOptions = {},
): string {
  const requestedNamespaces = options.ns ?? namespaces;
  const resolved = namespaceList(
    key,
    requestedNamespaces,
    options.nsSeparator ?? ":",
  );
  const keySeparator = options.keySeparator ?? ".";
  const activeBundle = installedBundles.get(activeLanguage);
  const fallbackBundle = installedBundles.get(FALLBACK_LANGUAGE);

  for (const namespace of resolved.namespaces) {
    for (const path of pluralPaths(resolved.path, options)) {
      const value =
        valueAt(activeBundle, namespace, path, keySeparator) ??
        valueAt(fallbackBundle, namespace, path, keySeparator);
      if (value !== null) return interpolate(value, options);
    }
  }
  return interpolate(options.defaultValue ?? key, options);
}

const translate: TFunction = (key, options) =>
  translateWithNamespaces(undefined, key, options);

function nativeMenuLabels(): NativeMenuLabels {
  const label = (key: keyof NativeMenuLabels): string =>
    translateWithNamespaces("nativeMenu", key);
  return {
    file: label("file"),
    edit: label("edit"),
    view: label("view"),
    window: label("window"),
    help: label("help"),
    about: label("about"),
    services: label("services"),
    hide: label("hide"),
    hideOthers: label("hideOthers"),
    quit: label("quit"),
    closeWindow: label("closeWindow"),
    undo: label("undo"),
    redo: label("redo"),
    cut: label("cut"),
    copy: label("copy"),
    paste: label("paste"),
    selectAll: label("selectAll"),
    enterFullScreen: label("enterFullScreen"),
    minimize: label("minimize"),
    zoom: label("zoom"),
  };
}

async function syncNativeMenu(locale: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("set_native_menu", { locale, labels: nativeMenuLabels() });
  } catch (error) {
    console.error("native menu language sync failed", error);
  }
}

export function useTranslation(namespaces?: string | readonly string[]): {
  t: TFunction;
  i18n: typeof i18n;
  ready: boolean;
} {
  useSyncExternalStore(subscribe, getRevision, getRevision);
  const t: TFunction = (key, options) =>
    translateWithNamespaces(namespaces, key, options);
  return { t, i18n, ready: initialized };
}

type TransProps = {
  i18nKey: string;
  t?: TFunction;
  values?: TranslationOptions;
  components?: Record<string, ReactElement<{ children?: ReactNode }>>;
};

function richTextNodes(
  value: string,
  components: TransProps["components"],
  keyPrefix = "t",
): ReactNode[] {
  if (!components) return [value];
  const pattern = /<([A-Za-z][\w-]*)>(.*?)<\/\1>/gs;
  const result: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) result.push(value.slice(cursor, start));
    const name = match[1] ?? "";
    const template = components[name];
    if (template) {
      result.push(
        cloneElement(
          template,
          { key: `${keyPrefix}-${index}` },
          richTextNodes(match[2] ?? "", components, `${keyPrefix}-${index}`),
        ),
      );
    } else {
      result.push(match[0]);
    }
    cursor = start + match[0].length;
    index += 1;
  }
  if (cursor < value.length) result.push(value.slice(cursor));
  return result;
}

export function Trans({
  i18nKey,
  t = translate,
  values,
  components,
}: TransProps): ReactNode {
  return createElement(
    Fragment,
    null,
    ...richTextNodes(t(i18nKey, values), components),
  );
}

export function normalizeLocale(
  locale: string | null | undefined,
): string | null {
  if (!locale) return null;
  const normalized = locale.trim().replace(/_/g, "-").toLowerCase();
  const exact = supportedIds.get(normalized);
  if (exact) return exact;

  const base = normalized.split("-")[0];
  if (!base) return null;
  for (const supported of SUPPORTED_LANGUAGES) {
    if (supported.id.toLowerCase().split("-")[0] === base) {
      return supported.id;
    }
  }
  return null;
}

export function detectSystemLanguage(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages,
): string {
  for (const language of languages) {
    const supported = normalizeLocale(language);
    if (supported) return supported;
  }
  return FALLBACK_LANGUAGE;
}

export function isLanguagePreference(value: unknown): value is string {
  return (
    value === SYSTEM_LANGUAGE ||
    (typeof value === "string" && normalizeLocale(value) !== null)
  );
}

export function resolveLanguagePreference(
  preference: unknown,
  systemLanguages?: readonly string[],
): string {
  if (preference === SYSTEM_LANGUAGE) {
    return detectSystemLanguage(systemLanguages);
  }
  return typeof preference === "string"
    ? (normalizeLocale(preference) ?? FALLBACK_LANGUAGE)
    : detectSystemLanguage(systemLanguages);
}

function readLanguagePreference(): string {
  if (typeof window === "undefined") return SYSTEM_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_SHADOW_KEY);
    return isLanguagePreference(stored) ? stored : SYSTEM_LANGUAGE;
  } catch {
    return SYSTEM_LANGUAGE;
  }
}

function writeLanguagePreference(preference: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_SHADOW_KEY, preference);
  } catch {
    // A blocked localStorage must not prevent language switching.
  }
}

function applyDocumentLanguage(bundle: LocaleBundle): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = bundle.meta.id;
  document.documentElement.dir = bundle.meta.direction;
}

async function ensureLanguage(id: string): Promise<LocaleBundle> {
  const bundle = await loadLocaleBundle(id);
  installBundle(bundle);
  return bundle;
}

async function activateBundle(bundle: LocaleBundle): Promise<void> {
  activeLanguage = bundle.meta.id;
  applyDocumentLanguage(bundle);
  notifySubscribers();
  await syncNativeMenu(bundle.meta.id);
}

export async function applyLanguagePreference(
  preference: unknown,
): Promise<string> {
  const safePreference = isLanguagePreference(preference)
    ? preference
    : SYSTEM_LANGUAGE;
  writeLanguagePreference(safePreference);

  if (!installedBundles.has(FALLBACK_LANGUAGE)) {
    await ensureLanguage(FALLBACK_LANGUAGE);
  }

  const requested = resolveLanguagePreference(safePreference);
  let bundle: LocaleBundle;
  try {
    bundle = await ensureLanguage(requested);
  } catch (error) {
    if (requested === FALLBACK_LANGUAGE) throw error;
    console.error(
      `locale ${requested} failed, falling back to ${FALLBACK_LANGUAGE}`,
      error,
    );
    bundle = await ensureLanguage(FALLBACK_LANGUAGE);
  }

  await activateBundle(bundle);
  return bundle.meta.id;
}

export async function initI18n(): Promise<void> {
  if (initialized) {
    await applyLanguagePreference(readLanguagePreference());
    return;
  }

  const preference = readLanguagePreference();
  const fallbackBundle = await ensureLanguage(FALLBACK_LANGUAGE);
  const requested = resolveLanguagePreference(preference);
  let activeBundle = fallbackBundle;
  if (requested !== FALLBACK_LANGUAGE) {
    try {
      activeBundle = await ensureLanguage(requested);
    } catch (error) {
      console.error(
        `locale ${requested} failed, falling back to ${FALLBACK_LANGUAGE}`,
        error,
      );
    }
  }

  initialized = true;
  await activateBundle(activeBundle);
  writeLanguagePreference(preference);

  if (!systemLanguageListenerInstalled && typeof window !== "undefined") {
    systemLanguageListenerInstalled = true;
    window.addEventListener("languagechange", () => {
      if (readLanguagePreference() === SYSTEM_LANGUAGE) {
        void applyLanguagePreference(SYSTEM_LANGUAGE);
      }
    });
  }
}

const i18n = {
  get language(): string {
    return activeLanguage;
  },
  get isInitialized(): boolean {
    return initialized;
  },
  t: translate,
};

export default i18n;
