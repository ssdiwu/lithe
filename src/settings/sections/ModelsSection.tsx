import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getBindingTokens, SHORTCUTS } from "@/modules/shortcuts/shortcuts";
import {
  type CustomEndpoint,
  compatModelIdForEndpoint,
  DEFAULT_MODEL_ID,
  getAutocompleteEligibleModels,
  getCompatModelInfo,
  getOllamaCloudModelInfo,
  getProvider,
  isCompatModelId,
  isOllamaCloudModelId,
  MODELS,
  OLLAMA_CLOUD_BASE_URL,
  ollamaCloudModelId,
  PROVIDERS,
  type OllamaCloudModel,
  type ProviderId,
  type ProviderInfo,
  providerNeedsKey,
  resolveModel,
  type SelectableModelId,
  STT_PROVIDER_LABELS,
  type SttProvider,
  WHISPERCPP_DEFAULT_BASE_URL,
} from "@/modules/ai/config";
import {
  type CustomEndpointKeys,
  clearCustomEndpointKey,
  clearKey,
  getAllCustomEndpointKeys,
  getAllKeys,
  setCustomEndpointKey,
  setKey,
} from "@/modules/ai/lib/keyring";
import {
  type ModelDiscoveryRequest,
  modelDiscoveryRequest,
  ollamaCloudModelDetailsRequest,
  parseDiscoveredModelIds,
  parseOllamaCloudModelDetails,
} from "@/modules/ai/lib/modelDiscovery";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  type AutocompleteTrigger,
  emitKeysChanged,
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setAutocompleteTrigger,
  setCustomEndpoints,
  setDefaultModel,
  setFavoriteModelIds,
  setGroqSttModel,
  setLmstudioBaseURL,
  setLmstudioModelId,
  setMlxBaseURL,
  setMlxModelId,
  setOllamaBaseURL,
  setOllamaCloudModels,
  setOllamaModelId,
  setOpenaiCompatibleBaseURL,
  setOpenaiCompatibleContextLimit,
  setOpenaiCompatibleModelId,
  setOpenrouterModelId,
  setRecentModelIds,
  setSttProvider,
  setWhispercppBaseURL,
} from "@/modules/settings/store";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDown,
  RefreshIcon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import { ProviderIcon } from "../components/ProviderIcon";
import { ProviderKeyCard } from "../components/ProviderKeyCard";
import { SectionHeader } from "../components/SectionHeader";

type KeysMap = Record<ProviderId, string | null>;
type NativeHttpResponse = {
  status: number;
  body: number[];
};

async function sendNativeHttpRequest(
  request: ModelDiscoveryRequest,
): Promise<NativeHttpResponse> {
  return invoke<NativeHttpResponse>("ai_http_request", {
    url: request.url,
    method: request.method ?? "GET",
    headers: request.headers ?? null,
    body: request.body ?? null,
    allowPrivateNetwork: request.allowPrivateNetwork,
  });
}

async function loadOllamaCloudCatalog(
  apiKey: string,
  previous: readonly OllamaCloudModel[],
): Promise<{ models: OllamaCloudModel[]; missingDetails: number }> {
  const listResponse = await sendNativeHttpRequest(
    modelDiscoveryRequest(OLLAMA_CLOUD_BASE_URL, apiKey),
  );
  if (listResponse.status < 200 || listResponse.status >= 300) {
    throw new Error(`Ollama Cloud catalog returned ${listResponse.status}`);
  }
  const names = parseDiscoveredModelIds(listResponse.body);
  if (names.length === 0) throw new Error("Ollama Cloud catalog is empty");

  const previousByName = new Map(previous.map((model) => [model.name, model]));
  const models: OllamaCloudModel[] = [];
  let missingDetails = 0;
  for (let start = 0; start < names.length; start += 4) {
    const batch = names.slice(start, start + 4);
    const detailed = await Promise.all(
      batch.map(async (name): Promise<OllamaCloudModel> => {
        try {
          const response = await sendNativeHttpRequest(
            ollamaCloudModelDetailsRequest(name, apiKey),
          );
          if (response.status < 200 || response.status >= 300) {
            throw new Error(`model details returned ${response.status}`);
          }
          return parseOllamaCloudModelDetails(response.body, name);
        } catch {
          missingDetails += 1;
          return (
            previousByName.get(name) ?? {
              name,
              contextLimit: null,
              capabilities: [],
            }
          );
        }
      }),
    );
    models.push(...detailed);
  }
  return { models, missingDetails };
}

async function persistOllamaCloudCatalog(
  models: OllamaCloudModel[],
): Promise<void> {
  await setOllamaCloudModels(models);
  const validIds = new Set(
    models.map((model) => ollamaCloudModelId(model.name)),
  );
  const fallback = models[0]
    ? ollamaCloudModelId(models[0].name)
    : DEFAULT_MODEL_ID;
  const prefs = usePreferencesStore.getState();
  const chat = useChatStore.getState();
  if (
    isOllamaCloudModelId(chat.selectedModelId) &&
    !validIds.has(chat.selectedModelId)
  ) {
    chat.setSelectedModelId(fallback);
  }
  if (
    isOllamaCloudModelId(prefs.defaultModelId) &&
    !validIds.has(prefs.defaultModelId)
  ) {
    await setDefaultModel(fallback);
  }
  const favorites = prefs.favoriteModelIds.filter(
    (id) => !isOllamaCloudModelId(id) || validIds.has(id),
  );
  if (favorites.length !== prefs.favoriteModelIds.length) {
    await setFavoriteModelIds(favorites);
  }
  const recent = prefs.recentModelIds.filter(
    (id) => !isOllamaCloudModelId(id) || validIds.has(id),
  );
  if (recent.length !== prefs.recentModelIds.length) {
    await setRecentModelIds(recent);
  }
  if (
    prefs.autocompleteProvider === "ollama-cloud" &&
    (!isOllamaCloudModelId(prefs.autocompleteModelId) ||
      !validIds.has(prefs.autocompleteModelId))
  ) {
    await setAutocompleteModelId(
      isOllamaCloudModelId(fallback) ? fallback : "",
    );
    if (!isOllamaCloudModelId(fallback)) await setAutocompleteEnabled(false);
  }
}

// Model hint/description live in the `aiModels` namespace keyed by model id.
// Model ids contain "." and "/", so disable key/ns separators and pass the
// original text as defaultValue (covers dynamic compat endpoints too).
type TFn = ReturnType<typeof useTranslation>["t"];
const modelHint = (t: TFn, m: { id: string; hint: string }): string =>
  t(`modelHint.${m.id}`, {
    ns: "aiModels",
    keySeparator: false,
    nsSeparator: false,
    defaultValue: m.hint,
  });
const modelDesc = (t: TFn, m: { id: string; description: string }): string =>
  t(`modelDesc.${m.id}`, {
    ns: "aiModels",
    keySeparator: false,
    nsSeparator: false,
    defaultValue: m.description,
  });
const sttLabel = (t: TFn, p: SttProvider): string =>
  t(`sttProvider.${p}`, {
    ns: "aiModels",
    keySeparator: false,
    nsSeparator: false,
    defaultValue: STT_PROVIDER_LABELS[p],
  });

const isLocalProvider = (id: ProviderId): boolean => !providerNeedsKey(id);

type LocalMeta = {
  urlPlaceholder: string;
  modelPlaceholder: string;
  descriptionKey: string;
  modelHintKey: string | null;
};

const LOCAL_META: Partial<Record<ProviderId, LocalMeta>> = {
  lmstudio: {
    urlPlaceholder: "http://localhost:1234/v1",
    modelPlaceholder: "qwen2.5-coder-7b-instruct",
    descriptionKey: "models.local.lmstudioDescription",
    modelHintKey: "models.local.lmstudioHint",
  },
  mlx: {
    urlPlaceholder: "http://127.0.0.1:8080/v1",
    modelPlaceholder: "mlx-community/Qwen2.5-Coder-7B-Instruct-4bit",
    descriptionKey: "models.local.mlxDescription",
    modelHintKey: "models.local.mlxHint",
  },
  ollama: {
    urlPlaceholder: "http://localhost:11434/v1",
    modelPlaceholder: "qwen2.5-coder:7b",
    descriptionKey: "models.local.ollamaDescription",
    modelHintKey: "models.local.ollamaHint",
  },
  "openai-compatible": {
    urlPlaceholder: "https://api.example.com/v1",
    modelPlaceholder: "gpt-4o, qwen3-max, glm-4.6, …",
    descriptionKey: "models.local.compatibleDescription",
    modelHintKey: null,
  },
  openrouter: {
    urlPlaceholder: "",
    modelPlaceholder: "anthropic/claude-sonnet-5, openai/gpt-5.6, …",
    descriptionKey: "models.local.openrouterDescription",
    modelHintKey: "models.local.openrouterHint",
  },
};

export function ModelsSection() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<KeysMap | null>(null);
  const [epKeys, setEpKeys] = useState<CustomEndpointKeys>({});
  const [adding, setAdding] = useState<Set<ProviderId>>(new Set());

  const defaultModel = usePreferencesStore((s) => s.defaultModelId);
  const lmstudioBaseURL = usePreferencesStore((s) => s.lmstudioBaseURL);
  const lmstudioModelId = usePreferencesStore((s) => s.lmstudioModelId);
  const mlxBaseURL = usePreferencesStore((s) => s.mlxBaseURL);
  const mlxModelId = usePreferencesStore((s) => s.mlxModelId);
  const ollamaBaseURL = usePreferencesStore((s) => s.ollamaBaseURL);
  const ollamaModelId = usePreferencesStore((s) => s.ollamaModelId);
  const compatBaseURL = usePreferencesStore((s) => s.openaiCompatibleBaseURL);
  const compatModelId = usePreferencesStore((s) => s.openaiCompatibleModelId);
  const compatContextLimit = usePreferencesStore(
    (s) => s.openaiCompatibleContextLimit,
  );
  const openrouterModelId = usePreferencesStore((s) => s.openrouterModelId);
  const customEndpoints = usePreferencesStore((s) => s.customEndpoints);
  const ollamaCloudModels = usePreferencesStore((s) => s.ollamaCloudModels);

  useEffect(() => {
    void getAllKeys().then(setKeys);
  }, []);

  useEffect(() => {
    void getAllCustomEndpointKeys(customEndpoints).then(setEpKeys);
  }, [customEndpoints]);

  const onSaveKey = async (provider: ProviderId, value: string) => {
    await setKey(provider, value);
    setKeys((prev) => (prev ? { ...prev, [provider]: value } : prev));
    await emitKeysChanged();
  };

  const onClearKey = async (provider: ProviderId) => {
    await clearKey(provider);
    setKeys((prev) => (prev ? { ...prev, [provider]: null } : prev));
    await emitKeysChanged();
  };

  const onSaveEndpointKey = async (endpointId: string, value: string) => {
    await setCustomEndpointKey(endpointId, value);
    setEpKeys((prev) => ({ ...prev, [endpointId]: value }));
    await emitKeysChanged();
  };

  const onClearEndpointKey = async (endpointId: string) => {
    await clearCustomEndpointKey(endpointId);
    setEpKeys((prev) => ({ ...prev, [endpointId]: null }));
    await emitKeysChanged();
  };

  const addCustomEndpoint = async () => {
    const ep: CustomEndpoint = {
      id: crypto.randomUUID().slice(0, 8),
      name: "",
      baseURL: "",
      modelId: "",
      contextLimit: 128_000,
    };
    await setCustomEndpoints([...customEndpoints, ep]);
  };

  const updateCustomEndpoint = async (
    id: string,
    patch: Partial<CustomEndpoint>,
  ) => {
    const next = customEndpoints.map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    );
    await setCustomEndpoints(next);
    const updated = next.find((endpoint) => endpoint.id === id);
    if (updated && (!updated.baseURL.trim() || !updated.modelId.trim())) {
      await deactivateCustomEndpoint(id, next);
    }
  };

  const deactivateCustomEndpoint = async (
    id: string,
    availableEndpoints: readonly CustomEndpoint[],
  ) => {
    const deadModelId = compatModelIdForEndpoint(id);
    const {
      defaultModelId,
      favoriteModelIds,
      recentModelIds,
      autocompleteProvider,
      autocompleteModelId,
    } = usePreferencesStore.getState();
    if (favoriteModelIds.includes(deadModelId)) {
      await setFavoriteModelIds(
        favoriteModelIds.filter((modelId) => modelId !== deadModelId),
      );
    }
    if (recentModelIds.includes(deadModelId)) {
      await setRecentModelIds(
        recentModelIds.filter((modelId) => modelId !== deadModelId),
      );
    }

    const fallbackEndpoint = availableEndpoints.find(
      (endpoint) =>
        endpoint.id !== id &&
        endpoint.baseURL.trim() &&
        endpoint.modelId.trim(),
    );
    const fallbackModelId =
      defaultModelId !== deadModelId
        ? defaultModelId
        : fallbackEndpoint
          ? compatModelIdForEndpoint(fallbackEndpoint.id)
          : DEFAULT_MODEL_ID;
    const { selectedModelId, setSelectedModelId } = useChatStore.getState();
    if (selectedModelId === deadModelId) {
      setSelectedModelId(fallbackModelId);
    }
    if (defaultModelId === deadModelId) {
      await setDefaultModel(fallbackModelId);
    }
    if (
      autocompleteProvider === "openai-compatible" &&
      autocompleteModelId === deadModelId
    ) {
      await setAutocompleteModelId(
        fallbackEndpoint ? compatModelIdForEndpoint(fallbackEndpoint.id) : "",
      );
      if (!fallbackEndpoint) await setAutocompleteEnabled(false);
    }
  };

  const removeCustomEndpoint = async (id: string) => {
    await clearCustomEndpointKey(id);
    setEpKeys((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const remaining = customEndpoints.filter((e) => e.id !== id);
    await setCustomEndpoints(remaining);
    await deactivateCustomEndpoint(id, remaining);
  };

  const localConfig = (id: ProviderId): LocalConfig | null => {
    switch (id) {
      case "lmstudio":
        return {
          baseURL: lmstudioBaseURL,
          modelId: lmstudioModelId,
          setBaseURL: setLmstudioBaseURL,
          setModelId: setLmstudioModelId,
        };
      case "mlx":
        return {
          baseURL: mlxBaseURL,
          modelId: mlxModelId,
          setBaseURL: setMlxBaseURL,
          setModelId: setMlxModelId,
        };
      case "ollama":
        return {
          baseURL: ollamaBaseURL,
          modelId: ollamaModelId,
          setBaseURL: setOllamaBaseURL,
          setModelId: setOllamaModelId,
        };
      case "openai-compatible":
        return {
          baseURL: compatBaseURL,
          modelId: compatModelId,
          setBaseURL: setOpenaiCompatibleBaseURL,
          setModelId: setOpenaiCompatibleModelId,
          contextLimit: compatContextLimit,
          setContextLimit: setOpenaiCompatibleContextLimit,
        };
      case "openrouter":
        return {
          baseURL: "",
          modelId: openrouterModelId,
          setBaseURL: async () => {},
          setModelId: setOpenrouterModelId,
          noBaseURL: true,
        };
      default:
        return null;
    }
  };

  const isConfigured = (id: ProviderId): boolean => {
    if (id === "openrouter") return !!keys?.[id] && !!openrouterModelId.trim();
    if (!isLocalProvider(id)) return !!keys?.[id];
    const cfg = localConfig(id);
    if (!cfg) return false;
    if (id === "openai-compatible")
      return !!cfg.baseURL.trim() && !!cfg.modelId.trim();
    return !!cfg.modelId.trim();
  };

  if (!keys) {
    return (
      <div className="text-[12px] text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  const configuredIds = new Set(
    PROVIDERS.filter((p) => isConfigured(p.id)).map((p) => p.id),
  );
  const visibleIds = new Set<ProviderId>(configuredIds);
  for (const id of adding) visibleIds.add(id);
  const visibleProviders = PROVIDERS.filter(
    (p) => p.id !== "openai-compatible" && visibleIds.has(p.id),
  );
  const addableProviders = PROVIDERS.filter(
    (p) => p.id !== "openai-compatible" && !visibleIds.has(p.id),
  );

  const deactivateOllamaCloud = async () => {
    const prefs = usePreferencesStore.getState();
    const chat = useChatStore.getState();
    if (isOllamaCloudModelId(chat.selectedModelId)) {
      chat.setSelectedModelId(DEFAULT_MODEL_ID);
    }
    if (isOllamaCloudModelId(prefs.defaultModelId)) {
      await setDefaultModel(DEFAULT_MODEL_ID);
    }
    await setFavoriteModelIds(
      prefs.favoriteModelIds.filter((id) => !isOllamaCloudModelId(id)),
    );
    await setRecentModelIds(
      prefs.recentModelIds.filter((id) => !isOllamaCloudModelId(id)),
    );
    if (prefs.autocompleteProvider === "ollama-cloud") {
      await setAutocompleteEnabled(false);
      await setAutocompleteModelId("");
    }
    await setOllamaCloudModels([]);
  };

  const removeProvider = async (id: ProviderId) => {
    if (id === "ollama-cloud") {
      await onClearKey(id);
      await deactivateOllamaCloud();
    } else if (id === "openrouter") {
      await setOpenrouterModelId("");
      await onClearKey(id);
    } else if (isLocalProvider(id)) {
      const cfg = localConfig(id);
      if (cfg) {
        await cfg.setModelId("");
        if (id === "openai-compatible") await cfg.setBaseURL("");
      }
      if (id === "openai-compatible") await onClearKey(id);
    } else {
      await onClearKey(id);
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addProvider = (id: ProviderId) => {
    setAdding((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title={t("models.header.title")}
        description={t("models.header.description")}
      />

      <DefaultsBlock
        defaultModel={defaultModel}
        configuredIds={configuredIds}
        keys={keys}
        customEndpoints={customEndpoints}
        ollamaCloudModels={ollamaCloudModels}
      />

      <VoiceBlock />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>{t("models.providers.label")}</Label>
          <AddProviderMenu
            providers={addableProviders}
            onAdd={addProvider}
            onAddCompat={addCustomEndpoint}
          />
        </div>

        {visibleProviders.length === 0 && customEndpoints.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              {t("models.providers.emptyTitle")}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground/70">
              {t("models.providers.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleProviders.map((p) =>
              p.id === "ollama-cloud" ? (
                <OllamaCloudProviderCard
                  key={p.id}
                  provider={p}
                  currentKey={keys[p.id]}
                  models={ollamaCloudModels}
                  onSaveKey={(value) => onSaveKey(p.id, value)}
                  onClearKey={() => onClearKey(p.id)}
                  onRemove={() => void removeProvider(p.id)}
                />
              ) : p.id === "openrouter" ? (
                <LocalProviderCard
                  key={p.id}
                  provider={p}
                  configured={configuredIds.has(p.id)}
                  config={localConfig(p.id)!}
                  meta={LOCAL_META[p.id]!}
                  compatKey={keys[p.id]}
                  onSaveKey={(v) => onSaveKey(p.id, v)}
                  onClearKey={() => onClearKey(p.id)}
                  onRemove={() => void removeProvider(p.id)}
                />
              ) : isLocalProvider(p.id) ? (
                <LocalProviderCard
                  key={p.id}
                  provider={p}
                  configured={configuredIds.has(p.id)}
                  config={localConfig(p.id)!}
                  meta={LOCAL_META[p.id]!}
                  onSaveKey={(v) => onSaveKey(p.id, v)}
                  onClearKey={() => onClearKey(p.id)}
                  onRemove={() => void removeProvider(p.id)}
                />
              ) : (
                <ProviderKeyCard
                  key={p.id}
                  provider={p}
                  currentKey={keys[p.id]}
                  onSave={(v) => onSaveKey(p.id, v)}
                  onClear={() => onClearKey(p.id)}
                  onRemove={() => void removeProvider(p.id)}
                />
              ),
            )}
            {customEndpoints.map((ep) => (
              <CustomEndpointCard
                key={ep.id}
                endpoint={ep}
                endpointKey={epKeys[ep.id] ?? null}
                onSaveKey={(v) => onSaveEndpointKey(ep.id, v)}
                onClearKey={() => onClearEndpointKey(ep.id)}
                onUpdate={(patch) => updateCustomEndpoint(ep.id, patch)}
                onRemove={() => removeCustomEndpoint(ep.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type LocalConfig = {
  baseURL: string;
  modelId: string;
  setBaseURL: (v: string) => Promise<void>;
  setModelId: (v: string) => Promise<void>;
  contextLimit?: number;
  setContextLimit?: (v: number) => Promise<void>;
  noBaseURL?: boolean;
};

function AddProviderMenu({
  providers,
  onAdd,
  onAddCompat,
}: {
  providers: readonly ProviderInfo[];
  onAdd: (id: ProviderId) => void;
  onAddCompat: () => void;
}) {
  const { t } = useTranslation();
  const cloud = providers.filter((p) => !isLocalProvider(p.id));
  const local = providers.filter(
    (p) => isLocalProvider(p.id) && p.id !== "openai-compatible",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2.5 text-[11px]"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
          {t("models.providers.addProvider")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-55 p-1">
        <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
          {t("models.providers.cloud")}
        </DropdownMenuLabel>
        {cloud.map((p) => (
          <ProviderMenuItem key={p.id} provider={p} onAdd={onAdd} />
        ))}
        <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
          {t("models.providers.localCustom")}
        </DropdownMenuLabel>
        {local.map((p) => (
          <ProviderMenuItem key={p.id} provider={p} onAdd={onAdd} />
        ))}
        <DropdownMenuItem
          onSelect={() => onAddCompat()}
          className="flex items-center gap-2 text-[12px]"
        >
          <ProviderIcon provider="openai-compatible" size={13} />
          <span>{t("models.providers.openaiCompatible")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProviderMenuItem({
  provider,
  onAdd,
}: {
  provider: ProviderInfo;
  onAdd: (id: ProviderId) => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={() => onAdd(provider.id)}
      className="flex items-center gap-2 text-[12px]"
    >
      <ProviderIcon provider={provider.id} size={13} />
      <span>{provider.label}</span>
    </DropdownMenuItem>
  );
}

function DefaultsBlock({
  defaultModel,
  configuredIds,
  keys,
  customEndpoints,
  ollamaCloudModels,
}: {
  defaultModel: SelectableModelId;
  configuredIds: Set<ProviderId>;
  keys: KeysMap;
  customEndpoints: readonly CustomEndpoint[];
  ollamaCloudModels: readonly OllamaCloudModel[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Label>{t("models.defaults.label")}</Label>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <FieldRow label={t("models.defaults.chatModel")}>
          <DefaultModelPicker
            defaultModel={defaultModel}
            configuredIds={configuredIds}
            customEndpoints={customEndpoints}
            ollamaCloudModels={ollamaCloudModels}
          />
        </FieldRow>
        <AutocompleteRow
          keys={keys}
          configuredIds={configuredIds}
          customEndpoints={customEndpoints}
          ollamaCloudModels={ollamaCloudModels}
        />
      </div>
    </div>
  );
}

function DefaultModelPicker({
  defaultModel,
  configuredIds,
  customEndpoints,
  ollamaCloudModels,
}: {
  defaultModel: SelectableModelId;
  configuredIds: Set<ProviderId>;
  customEndpoints: readonly CustomEndpoint[];
  ollamaCloudModels: readonly OllamaCloudModel[];
}) {
  const { t } = useTranslation();
  const m = resolveModel(defaultModel, customEndpoints, ollamaCloudModels);
  const ollamaCloudModelInfos = ollamaCloudModels.map((model) =>
    getOllamaCloudModelInfo(ollamaCloudModelId(model.name), ollamaCloudModels),
  );
  const compatModels = customEndpoints
    .filter((endpoint) => endpoint.baseURL.trim() && endpoint.modelId.trim())
    .map((endpoint) =>
      getCompatModelInfo(
        compatModelIdForEndpoint(endpoint.id),
        customEndpoints,
      ),
    );
  const hasAny = configuredIds.size > 0 || compatModels.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={!hasAny}
          className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
        >
          <span className="flex items-center gap-2 truncate">
            <ProviderIcon provider={m.provider} size={13} />
            <span className="truncate">{m.label}</span>
            <span className="text-muted-foreground">· {modelHint(t, m)}</span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={11}
            strokeWidth={2}
            className="opacity-70"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="min-w-70 p-1"
      >
        <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
          {PROVIDERS.filter((p) => configuredIds.has(p.id)).map((p) => {
            const models =
              p.id === "ollama-cloud"
                ? ollamaCloudModelInfos
                : MODELS.filter((x) => x.provider === p.id);
            if (models.length === 0) return null;
            return (
              <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  <ProviderIcon provider={p.id} size={11} />
                  <span>{p.label}</span>
                </div>
                {models.map((mod) => (
                  <DropdownMenuItem
                    key={mod.id}
                    onSelect={() =>
                      void setDefaultModel(mod.id as SelectableModelId)
                    }
                    className={cn(
                      "flex items-start gap-2 text-[12px]",
                      mod.id === defaultModel && "bg-accent/50",
                    )}
                  >
                    <span className="flex flex-1 flex-col">
                      <span>{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {modelDesc(t, mod)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            );
          })}
          {compatModels.length > 0 ? (
            <div className="px-1 pt-1.5">
              <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                <ProviderIcon provider="openai-compatible" size={11} />
                <span>{t("models.providers.openaiCompatible")}</span>
              </div>
              {compatModels.map((mod) => (
                <DropdownMenuItem
                  key={mod.id}
                  onSelect={() =>
                    void setDefaultModel(mod.id as SelectableModelId)
                  }
                  className={cn(
                    "flex items-start gap-2 text-[12px]",
                    mod.id === defaultModel && "bg-accent/50",
                  )}
                >
                  <span className="flex flex-1 flex-col">
                    <span>{mod.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {mod.hint}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AutocompleteRow({
  keys,
  configuredIds,
  customEndpoints,
  ollamaCloudModels,
}: {
  keys: KeysMap;
  configuredIds: Set<ProviderId>;
  customEndpoints: readonly CustomEndpoint[];
  ollamaCloudModels: readonly OllamaCloudModel[];
}) {
  const { t } = useTranslation();
  const enabled = usePreferencesStore((s) => s.autocompleteEnabled);
  const trigger = usePreferencesStore((s) => s.autocompleteTrigger);
  const provider = usePreferencesStore((s) => s.autocompleteProvider);
  const modelId = usePreferencesStore((s) => s.autocompleteModelId);
  const eligible = useMemo(() => getAutocompleteEligibleModels(), []);
  const userShortcuts = usePreferencesStore((s) => s.shortcuts);
  const aiCompleteShortcut = useMemo(() => {
    const s = SHORTCUTS.find((x) => x.id === "editor.aiComplete");
    const bindings = userShortcuts["editor.aiComplete"] || s?.defaultBindings;
    if (!bindings || bindings.length === 0) return "";
    return getBindingTokens(bindings[0]).join("");
  }, [userShortcuts]);

  // One selectable model per fully-configured OpenAI-compatible endpoint.
  const compatItems = useMemo(
    () =>
      customEndpoints
        .filter((e) => e.baseURL.trim() && e.modelId.trim())
        .map((e) =>
          getCompatModelInfo(compatModelIdForEndpoint(e.id), customEndpoints),
        ),
    [customEndpoints],
  );
  const ollamaCloudItems = useMemo(
    () =>
      ollamaCloudModels.map((model) =>
        getOllamaCloudModelInfo(
          ollamaCloudModelId(model.name),
          ollamaCloudModels,
        ),
      ),
    [ollamaCloudModels],
  );

  // Fast cloud tiers + configured local providers + named compat endpoints.
  const items = useMemo(() => {
    const local = PROVIDERS.filter(
      (p) =>
        isLocalProvider(p.id) &&
        p.id !== "openai-compatible" &&
        configuredIds.has(p.id),
    ).flatMap((p) => {
      const m = MODELS.find((x) => x.provider === p.id);
      return m ? [m] : [];
    });
    return [...eligible, ...ollamaCloudItems, ...local, ...compatItems];
  }, [eligible, configuredIds, compatItems, ollamaCloudItems]);

  const currentModel = useMemo(() => {
    if (provider === "openai-compatible" && isCompatModelId(modelId)) {
      return getCompatModelInfo(modelId, customEndpoints);
    }
    if (provider === "ollama-cloud" && isOllamaCloudModelId(modelId)) {
      return getOllamaCloudModelInfo(modelId, ollamaCloudModels);
    }
    if (isLocalProvider(provider)) {
      return MODELS.find((m) => m.provider === provider) ?? eligible[0];
    }
    return (
      MODELS.find((m) => m.provider === provider && m.id === modelId) ??
      MODELS.find((m) => m.id === modelId) ??
      eligible[0]
    );
  }, [eligible, provider, modelId, customEndpoints, ollamaCloudModels]);

  const setModel = (id: string, providerId: ProviderId) => {
    void setAutocompleteProvider(providerId);
    // Compat endpoints store their compat- id; other locals use their own field.
    const keep =
      providerId === "openai-compatible" || !isLocalProvider(providerId);
    void setAutocompleteModelId(keep ? id : "");
  };

  const grouped = useMemo(() => {
    const map = new Map<ProviderId, (typeof items)[number][]>();
    for (const m of items) {
      const arr = map.get(m.provider) ?? [];
      arr.push(m);
      map.set(m.provider, arr);
    }
    return map;
  }, [items]);

  const hasKey = providerNeedsKey(provider) ? !!keys[provider] : true;

  return (
    <>
      <FieldRow label={t("models.defaults.autocomplete")}>
        <div className="flex flex-1 items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => void setAutocompleteEnabled(v)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!enabled}
                className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
              >
                <span className="flex items-center gap-2 truncate">
                  <ProviderIcon provider={currentModel.provider} size={12} />
                  <span className="truncate">{currentModel.label}</span>
                  <span className="text-muted-foreground">
                    · {modelHint(t, currentModel)}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={11}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              collisionPadding={12}
              className="max-h-72 min-w-70 overflow-y-auto"
            >
              {PROVIDERS.map((p) => {
                const list = grouped.get(p.id);
                if (!list || list.length === 0) return null;
                const pConfigured =
                  p.id === "openai-compatible" || configuredIds.has(p.id);
                return (
                  <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                    <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      <ProviderIcon provider={p.id} size={11} />
                      <span>{p.label}</span>
                      {!pConfigured ? (
                        <span className="ml-auto text-[9.5px] normal-case tracking-normal text-muted-foreground/70">
                          {t("models.providers.notConnected")}
                        </span>
                      ) : null}
                    </div>
                    {list.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        disabled={!pConfigured}
                        onSelect={() => pConfigured && setModel(m.id, p.id)}
                        className={cn(
                          "text-[11.5px]",
                          m.id === modelId && "bg-accent/50",
                        )}
                      >
                        <span className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {modelDesc(t, m)}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldRow>
      {enabled ? (
        <FieldRow label={t("models.defaults.trigger")}>
          <Select
            value={trigger}
            onValueChange={(v) =>
              void setAutocompleteTrigger(v as AutocompleteTrigger)
            }
          >
            <SelectTrigger className="h-8 w-full text-[11.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                {t("models.defaults.automatic")}
              </SelectItem>
              <SelectItem value="manual">
                {t("models.defaults.manual", {
                  shortcut: aiCompleteShortcut || t("models.defaults.shortcut"),
                })}
              </SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      ) : null}
      {enabled && !hasKey ? (
        <p className="pl-19 text-[10.5px] text-muted-foreground">
          {t("models.defaults.notConnectedHint", {
            provider: getProvider(provider).label,
          })}
        </p>
      ) : null}
    </>
  );
}

function formatContextWindow(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(2))}M`;
  }
  return `${Math.round(value / 1000)}K`;
}

function OllamaCloudProviderCard({
  provider,
  currentKey,
  models,
  onSaveKey,
  onClearKey,
  onRemove,
}: {
  provider: ProviderInfo;
  currentKey: string | null;
  models: readonly OllamaCloudModel[];
  onSaveKey: (value: string) => Promise<void>;
  onClearKey: () => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "partial" | "fail"
  >(models.length > 0 ? "ok" : "idle");
  const [missingDetails, setMissingDetails] = useState(0);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const refresh = useCallback(
    async (apiKey: string) => {
      setStatus("loading");
      setFailureReason(null);
      try {
        const result = await loadOllamaCloudCatalog(apiKey, models);
        await persistOllamaCloudCatalog(result.models);
        setMissingDetails(result.missingDetails);
        setStatus(result.missingDetails > 0 ? "partial" : "ok");
      } catch (error) {
        setFailureReason(
          error instanceof Error ? error.message : String(error),
        );
        setStatus("fail");
      }
    },
    [models],
  );

  useEffect(() => {
    if (currentKey && models.length === 0 && status === "idle") {
      void refresh(currentKey);
    }
  }, [currentKey, models.length, refresh, status]);

  return (
    <ProviderKeyCard
      provider={provider}
      currentKey={currentKey}
      onSave={async (value) => {
        await onSaveKey(value);
        await refresh(value);
      }}
      onClear={async () => {
        await onClearKey();
        await setOllamaCloudModels([]);
        setFailureReason(null);
        setStatus("idle");
      }}
      onRemove={onRemove}
    >
      <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-muted-foreground">
            {status === "loading"
              ? t("models.ollamaCloud.loading")
              : t("models.ollamaCloud.modelCount", { count: models.length })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!currentKey || status === "loading"}
            onClick={() => currentKey && void refresh(currentKey)}
            className="ml-auto h-7 gap-1 px-2 text-[10.5px]"
          >
            <HugeiconsIcon icon={RefreshIcon} size={11} strokeWidth={1.9} />
            {t("models.ollamaCloud.refresh")}
          </Button>
        </div>
        {status === "fail" ? (
          <div className="space-y-0.5 text-[10.5px] text-destructive">
            <p>{t("models.ollamaCloud.loadFailed")}</p>
            {failureReason ? (
              <p className="break-all font-mono text-[9.5px] opacity-80">
                {failureReason}
              </p>
            ) : null}
          </div>
        ) : status === "partial" ? (
          <p className="text-[10.5px] text-amber-600 dark:text-amber-400">
            {t("models.ollamaCloud.partial", { count: missingDetails })}
          </p>
        ) : null}
        {models.length > 0 ? (
          <details className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
            <summary className="cursor-pointer text-[10.5px] text-muted-foreground">
              {t("models.ollamaCloud.viewCatalog")}
            </summary>
            <div className="mt-1.5 max-h-48 overflow-y-auto">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between gap-3 border-t border-border/30 py-1 first:border-t-0"
                >
                  <code className="truncate text-[10.5px]">{model.name}</code>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatContextWindow(model.contextLimit)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </ProviderKeyCard>
  );
}

function LocalProviderCard({
  provider,
  configured,
  config,
  meta,
  compatKey,
  onSaveKey,
  onClearKey,
  onRemove,
}: {
  provider: ProviderInfo;
  configured: boolean;
  config: LocalConfig;
  meta: LocalMeta;
  compatKey?: string | null;
  onSaveKey: (v: string) => Promise<void>;
  onClearKey: () => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const {
    baseURL,
    modelId,
    setBaseURL,
    setModelId,
    contextLimit,
    setContextLimit,
    noBaseURL,
  } = config;
  const [urlDraft, setUrlDraft] = useState(baseURL);
  const [modelDraft, setModelDraft] = useState(modelId);
  const [contextDraft, setContextDraft] = useState(String(contextLimit ?? ""));
  const [keyDraft, setKeyDraft] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");

  useEffect(() => setUrlDraft(baseURL), [baseURL]);
  useEffect(() => setModelDraft(modelId), [modelId]);
  useEffect(() => setContextDraft(String(contextLimit ?? "")), [contextLimit]);

  const supportsKey =
    provider.id === "openai-compatible" || provider.id === "openrouter";

  const test = async () => {
    setTestStatus("testing");
    try {
      const status = await invoke<number>("lm_ping", { baseUrl: urlDraft });
      setTestStatus(status > 0 ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ProviderIcon provider={provider.id} size={15} />
        <span className="text-[12.5px] font-medium">{provider.label}</span>
        {configured ? (
          <Badge
            variant="outline"
            className="ml-1 h-4 gap-1 border-border/60 bg-muted/40 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={9}
              strokeWidth={2}
            />
            {t("common.connected")}
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() => void openUrl(provider.consoleUrl)}
          className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("models.card.docs")}
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={11}
            strokeWidth={1.75}
          />
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          title={t("models.card.removeProvider")}
          className="size-7 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </div>

      <span className="text-[10.5px] leading-relaxed text-muted-foreground">
        {t(meta.descriptionKey)}
      </span>

      <div className="mt-0.5 flex flex-col gap-2.5">
        {noBaseURL ? null : (
          <FieldRow label={t("models.card.baseUrl")}>
            <div className="flex flex-1 gap-1.5">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => {
                  const v = urlDraft.trim();
                  if (v !== baseURL) void setBaseURL(v);
                }}
                placeholder={meta.urlPlaceholder}
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void test()}
                disabled={!urlDraft.trim()}
                className="h-8 px-3 text-[11px]"
              >
                {t("models.card.test")}
              </Button>
            </div>
          </FieldRow>
        )}

        <FieldRow label={t("models.card.modelId")}>
          <Input
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            onBlur={() => {
              const v = modelDraft.trim();
              if (v !== modelId) void setModelId(v);
            }}
            placeholder={meta.modelPlaceholder}
            spellCheck={false}
            className="h-8 font-mono text-[11.5px]"
          />
        </FieldRow>

        {setContextLimit ? (
          <FieldRow label={t("models.card.context")}>
            <div className="flex flex-1 items-center gap-1.5">
              <Input
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                onBlur={() => {
                  const v = parseInt(contextDraft, 10);
                  if (Number.isFinite(v) && v >= 1000) void setContextLimit(v);
                  else setContextDraft(String(contextLimit ?? ""));
                }}
                placeholder="128000"
                spellCheck={false}
                className="h-8 w-28 font-mono text-[11.5px]"
              />
              <span className="text-[10.5px] text-muted-foreground">
                {t("models.card.tokens")}
              </span>
            </div>
          </FieldRow>
        ) : null}

        {supportsKey ? (
          <FieldRow label={t("models.card.apiKey")}>
            {compatKey ? (
              <div className="flex flex-1 items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {`${compatKey.slice(0, 4)}${"•".repeat(8)}${compatKey.slice(-4)}`}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void onClearKey()}
                  title={t("models.card.removeKey")}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 gap-1.5">
                <Input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={t("models.card.optionalKeyPlaceholder")}
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const v = keyDraft.trim();
                    if (!v) return;
                    await onSaveKey(v);
                    setKeyDraft("");
                  }}
                  disabled={!keyDraft.trim()}
                  className="h-8 px-3 text-[11px]"
                >
                  {t("common.save")}
                </Button>
              </div>
            )}
          </FieldRow>
        ) : null}

        <StatusLine status={testStatus} />

        {!modelId.trim() && meta.modelHintKey ? (
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            {t(meta.modelHintKey)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CustomEndpointCard({
  endpoint,
  endpointKey,
  onSaveKey,
  onClearKey,
  onUpdate,
  onRemove,
}: {
  endpoint: CustomEndpoint;
  endpointKey: string | null;
  onSaveKey: (v: string) => Promise<void>;
  onClearKey: () => Promise<void>;
  onUpdate: (patch: Partial<CustomEndpoint>) => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(
    !endpoint.baseURL.trim() || !endpoint.modelId.trim(),
  );
  const [nameDraft, setNameDraft] = useState(endpoint.name);
  const [urlDraft, setUrlDraft] = useState(endpoint.baseURL);
  const [modelDraft, setModelDraft] = useState(endpoint.modelId);
  const [contextDraft, setContextDraft] = useState(
    String(endpoint.contextLimit ?? ""),
  );
  const [keyDraft, setKeyDraft] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [modelListStatus, setModelListStatus] = useState<
    "idle" | "loading" | "ok" | "empty" | "fail"
  >("idle");

  useEffect(() => setNameDraft(endpoint.name), [endpoint.name]);
  useEffect(() => setUrlDraft(endpoint.baseURL), [endpoint.baseURL]);
  useEffect(() => setModelDraft(endpoint.modelId), [endpoint.modelId]);
  useEffect(
    () => setContextDraft(String(endpoint.contextLimit ?? "")),
    [endpoint.contextLimit],
  );

  const configured = !!endpoint.baseURL.trim() && !!endpoint.modelId.trim();
  const requestModels = () => {
    const request = modelDiscoveryRequest(urlDraft, endpointKey ?? keyDraft);
    return sendNativeHttpRequest(request);
  };

  const test = async () => {
    setTestStatus("testing");
    try {
      const response = await requestModels();
      setTestStatus(
        response.status >= 200 && response.status < 300 ? "ok" : "fail",
      );
    } catch {
      setTestStatus("fail");
    }
  };

  const loadModels = async () => {
    setModelListStatus("loading");
    try {
      const response = await requestModels();
      if (response.status < 200 || response.status >= 300) {
        setModelListStatus("fail");
        return;
      }
      const models = parseDiscoveredModelIds(response.body);
      setDiscoveredModels(models);
      setModelListStatus(models.length > 0 ? "ok" : "empty");
    } catch {
      setModelListStatus("fail");
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-border/60 bg-card/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-left"
      >
        <HugeiconsIcon
          icon={ChevronDown}
          size={12}
          strokeWidth={2}
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform",
            !expanded && "-rotate-90",
          )}
        />
        <ProviderIcon provider="openai-compatible" size={15} />
        <span className="text-[12.5px] font-medium truncate">
          {endpoint.name || t("models.providers.openaiCompatible")}
        </span>
        {endpoint.modelId.trim() && (
          <span className="text-[10.5px] text-muted-foreground truncate font-mono">
            {endpoint.modelId}
          </span>
        )}
        {configured ? (
          <Badge
            variant="outline"
            className="ml-1 h-4 gap-1 border-border/60 bg-muted/40 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={9}
              strokeWidth={2}
            />
            {t("common.connected")}
          </Badge>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title={t("models.card.removeEndpoint")}
          className="ml-auto size-7 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-border/40 px-3 py-2.5">
          <FieldRow label={t("models.card.name")}>
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                const v = nameDraft.trim();
                if (v !== endpoint.name) void onUpdate({ name: v });
              }}
              placeholder={t("models.card.namePlaceholder")}
              spellCheck={false}
              className="h-8 flex-1 text-[11.5px]"
            />
          </FieldRow>

          <FieldRow label={t("models.card.baseUrl")}>
            <div className="flex flex-1 gap-1.5">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => {
                  const v = urlDraft.trim();
                  if (v !== endpoint.baseURL) void onUpdate({ baseURL: v });
                }}
                placeholder="https://api.example.com/v1"
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void test()}
                disabled={!urlDraft.trim()}
                className="h-8 px-3 text-[11px]"
              >
                {t("models.card.test")}
              </Button>
            </div>
          </FieldRow>

          <FieldRow label={t("models.card.modelId")}>
            <div className="flex flex-1 gap-1.5">
              <Input
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                onBlur={() => {
                  const v = modelDraft.trim();
                  if (v !== endpoint.modelId) void onUpdate({ modelId: v });
                }}
                placeholder="gpt-4o, qwen3-max, glm-5.2, …"
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadModels()}
                disabled={!urlDraft.trim() || modelListStatus === "loading"}
                className="h-8 px-3 text-[11px]"
              >
                {modelListStatus === "loading"
                  ? t("models.card.loadingModels")
                  : t("models.card.loadModels")}
              </Button>
            </div>
          </FieldRow>

          {discoveredModels.length > 0 ? (
            <FieldRow label={t("models.card.availableModels")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
                  >
                    <span>
                      {t("models.card.chooseModel", {
                        count: discoveredModels.length,
                      })}
                    </span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={11}
                      strokeWidth={2}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 min-w-70 overflow-y-auto">
                  {discoveredModels.map((model) => (
                    <DropdownMenuItem
                      key={model}
                      onSelect={() => {
                        setModelDraft(model);
                        void onUpdate({ modelId: model });
                      }}
                      className="font-mono text-[11.5px]"
                    >
                      {model}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FieldRow>
          ) : null}

          {modelListStatus === "empty" || modelListStatus === "fail" ? (
            <p className="text-[10.5px] text-muted-foreground">
              {t(
                modelListStatus === "empty"
                  ? "models.card.noModels"
                  : "models.card.loadModelsFailed",
              )}
            </p>
          ) : null}

          <FieldRow label={t("models.card.context")}>
            <div className="flex flex-1 items-center gap-1.5">
              <Input
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                onBlur={() => {
                  const v = parseInt(contextDraft, 10);
                  if (Number.isFinite(v) && v >= 1000)
                    void onUpdate({ contextLimit: v });
                  else setContextDraft(String(endpoint.contextLimit ?? ""));
                }}
                placeholder="128000"
                spellCheck={false}
                className="h-8 w-28 font-mono text-[11.5px]"
              />
              <span className="text-[10.5px] text-muted-foreground">
                {t("models.card.tokens")}
              </span>
            </div>
          </FieldRow>

          <FieldRow label={t("models.card.apiKey")}>
            {endpointKey ? (
              <div className="flex flex-1 items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {`${endpointKey.slice(0, 4)}${"•".repeat(8)}${endpointKey.slice(-4)}`}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void onClearKey()}
                  title={t("models.card.removeKey")}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={12}
                    strokeWidth={1.75}
                  />
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 gap-1.5">
                <Input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={t("models.card.optionalKeyPlaceholder")}
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const v = keyDraft.trim();
                    if (!v) return;
                    await onSaveKey(v);
                    setKeyDraft("");
                  }}
                  disabled={!keyDraft.trim()}
                  className="h-8 px-3 text-[11px]"
                >
                  {t("common.save")}
                </Button>
              </div>
            )}
          </FieldRow>

          <StatusLine status={testStatus} />
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] tracking-tight text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function StatusLine({
  status,
}: {
  status: "idle" | "testing" | "ok" | "fail";
}) {
  const { t } = useTranslation();
  if (status === "idle") return null;
  if (status === "testing") {
    return (
      <span className="text-[10.5px] text-muted-foreground">
        {t("models.card.testing")}
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} strokeWidth={2} />
        {t("models.card.reachable")}
      </span>
    );
  }
  return (
    <span className="text-[10.5px] text-destructive/80">
      {t("models.card.unreachable")}
    </span>
  );
}

function VoiceBlock() {
  const { t } = useTranslation();
  const sttProvider = usePreferencesStore((s) => s.sttProvider);
  const groqSttModel = usePreferencesStore((s) => s.groqSttModel);
  const whispercppBaseURL = usePreferencesStore((s) => s.whispercppBaseURL);
  const [urlDraft, setUrlDraft] = useState(whispercppBaseURL);
  const [groqModelDraft, setGroqModelDraft] = useState(groqSttModel);

  useEffect(() => setUrlDraft(whispercppBaseURL), [whispercppBaseURL]);
  useEffect(() => setGroqModelDraft(groqSttModel), [groqSttModel]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Mic01Icon} size={15} strokeWidth={1.5} />
        <span className="text-[12.5px] font-medium">
          {t("models.voice.title")}
        </span>
      </div>

      <FieldRow label={t("models.voice.provider")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
            >
              <span>{sttLabel(t, sttProvider)}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={11}
                strokeWidth={2}
                className="opacity-70"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 p-1">
            {(Object.keys(STT_PROVIDER_LABELS) as SttProvider[]).map((p) => (
              <DropdownMenuItem
                key={p}
                onSelect={() => void setSttProvider(p)}
                className={cn(
                  "flex items-center gap-2 text-[12px]",
                  p === sttProvider && "bg-accent/50",
                )}
              >
                <span>{sttLabel(t, p)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </FieldRow>

      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        {sttProvider === "openai" && t("models.voice.descOpenai")}
        {sttProvider === "groq" && t("models.voice.descGroq")}
        {sttProvider === "whispercpp" && t("models.voice.descWhispercpp")}
      </p>

      {sttProvider === "groq" && (
        <div className="flex flex-col gap-2.5">
          <FieldRow label={t("models.voice.model")}>
            <Input
              value={groqModelDraft}
              onChange={(e) => setGroqModelDraft(e.target.value)}
              onBlur={() => {
                const v = groqModelDraft.trim();
                if (v !== groqSttModel) void setGroqSttModel(v);
              }}
              placeholder="whisper-large-v3-turbo"
              spellCheck={false}
              className="h-8 font-mono text-[11.5px]"
            />
          </FieldRow>
        </div>
      )}

      {sttProvider === "whispercpp" && (
        <div className="flex flex-col gap-2.5">
          <FieldRow label={t("models.voice.baseUrl")}>
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => {
                const v = urlDraft.trim();
                if (v !== whispercppBaseURL) void setWhispercppBaseURL(v);
              }}
              placeholder={WHISPERCPP_DEFAULT_BASE_URL}
              spellCheck={false}
              className="h-8 font-mono text-[11.5px]"
            />
          </FieldRow>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
