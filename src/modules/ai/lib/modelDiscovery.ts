import { OLLAMA_CLOUD_BASE_URL, type OllamaCloudModel } from "../config";

export type ModelDiscoveryRequest = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: number[];
  /** Allows local endpoints and proxy fake-IP ranges such as 198.18/15.
   * Metadata addresses remain blocked by the native network boundary. */
  allowPrivateNetwork: boolean;
};

export function isOllamaCloudBaseURL(baseURL: string): boolean {
  try {
    const base = new URL(baseURL.trim());
    return (
      base.origin === new URL(OLLAMA_CLOUD_BASE_URL).origin &&
      base.protocol === "https:"
    );
  } catch {
    return false;
  }
}

/** Build the model-list request for a named OpenAI-compatible endpoint.
 * Ollama Cloud exposes its authoritative catalog through `/api/tags`; other
 * endpoints use the OpenAI-compatible `/models` route. */
export function modelDiscoveryRequest(
  baseURL: string,
  apiKey: string | null | undefined,
): ModelDiscoveryRequest {
  const base = new URL(baseURL.trim());
  const ollamaCloud = isOllamaCloudBaseURL(baseURL);
  base.pathname = ollamaCloud
    ? "/api/tags"
    : `${base.pathname.replace(/\/+$/, "")}/models`;
  base.search = "";
  base.hash = "";
  const key = apiKey?.trim();
  return {
    url: base.toString(),
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    allowPrivateNetwork: true,
  };
}

export function ollamaCloudModelDetailsRequest(
  model: string,
  apiKey: string | null | undefined,
): ModelDiscoveryRequest {
  const key = apiKey?.trim();
  const body = new TextEncoder().encode(JSON.stringify({ model }));
  return {
    url: "https://ollama.com/api/show",
    method: "POST",
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
    },
    body: Array.from(body),
    // The origin is fixed above, but proxy/TUN DNS may map it to 198.18/15.
    allowPrivateNetwork: true,
  };
}

/** Parse both OpenAI (`data[].id`) and Ollama (`models[].name|model`) lists. */
export function parseDiscoveredModelIds(
  body: string | Uint8Array | readonly number[],
): string[] {
  const text =
    typeof body === "string"
      ? body
      : new TextDecoder().decode(Uint8Array.from(body));
  const payload = JSON.parse(text) as {
    data?: Array<{ id?: unknown }>;
    models?: Array<{ name?: unknown; model?: unknown }>;
  };
  const raw = Array.isArray(payload.data)
    ? payload.data.map((item) => item.id)
    : Array.isArray(payload.models)
      ? payload.models.map((item) => item.model ?? item.name)
      : [];
  const ids = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

export function parseOllamaCloudModelDetails(
  body: string | Uint8Array | readonly number[],
  name: string,
): OllamaCloudModel {
  const text =
    typeof body === "string"
      ? body
      : new TextDecoder().decode(Uint8Array.from(body));
  const payload = JSON.parse(text) as {
    capabilities?: unknown;
    details?: { parameter_size?: unknown };
    model_info?: Record<string, unknown>;
  };
  const contextValues = Object.entries(payload.model_info ?? {})
    .filter(
      ([key, value]) =>
        key.endsWith(".context_length") && typeof value === "number",
    )
    .map(([, value]) => value as number)
    .filter((value) => Number.isFinite(value) && value > 0);
  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
    : [];
  const parameterSize = payload.details?.parameter_size;
  return {
    name: name.trim(),
    contextLimit: contextValues.length > 0 ? Math.max(...contextValues) : null,
    capabilities,
    ...(typeof parameterSize === "string" && parameterSize.trim()
      ? { parameterSize: parameterSize.trim() }
      : {}),
  };
}
