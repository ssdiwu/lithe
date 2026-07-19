import { describe, expect, it } from "vitest";
import {
  isOllamaCloudBaseURL,
  modelDiscoveryRequest,
  ollamaCloudModelDetailsRequest,
  parseOllamaCloudModelDetails,
  parseDiscoveredModelIds,
} from "./modelDiscovery";

describe("isOllamaCloudBaseURL", () => {
  it("recognizes the secure Ollama Cloud API origin", () => {
    expect(isOllamaCloudBaseURL("https://ollama.com/v1/")).toBe(true);
  });

  it("rejects lookalike and invalid URLs", () => {
    expect(isOllamaCloudBaseURL("https://ollama.com.example/v1")).toBe(false);
    expect(isOllamaCloudBaseURL("not a url")).toBe(false);
  });
});

describe("modelDiscoveryRequest", () => {
  it("uses Ollama Cloud's native model catalog with bearer auth", () => {
    expect(modelDiscoveryRequest("https://ollama.com/v1", "secret")).toEqual({
      url: "https://ollama.com/api/tags",
      headers: { Authorization: "Bearer secret" },
      allowPrivateNetwork: true,
    });
  });

  it("uses the OpenAI-compatible models route for other endpoints", () => {
    expect(modelDiscoveryRequest("https://api.example.com/v1/", null)).toEqual({
      url: "https://api.example.com/v1/models",
      headers: undefined,
      allowPrivateNetwork: true,
    });
  });
});

describe("parseDiscoveredModelIds", () => {
  it("parses and deduplicates OpenAI-compatible model ids", () => {
    expect(
      parseDiscoveredModelIds(
        JSON.stringify({
          data: [{ id: "model-b" }, { id: "model-b" }, { id: "model-a" }],
        }),
      ),
    ).toEqual(["model-b", "model-a"]);
  });

  it("parses Ollama model names", () => {
    expect(
      parseDiscoveredModelIds(
        JSON.stringify({ models: [{ model: "glm-5.2" }, { name: "qwen3.5" }] }),
      ),
    ).toEqual(["glm-5.2", "qwen3.5"]);
  });
});

describe("Ollama Cloud model details", () => {
  it("builds the official show-model request", () => {
    const request = ollamaCloudModelDetailsRequest("glm-5.2", "secret");
    expect(request.url).toBe("https://ollama.com/api/show");
    expect(request.method).toBe("POST");
    expect(request.allowPrivateNetwork).toBe(true);
    expect(request.headers).toEqual({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(
      JSON.parse(new TextDecoder().decode(Uint8Array.from(request.body ?? []))),
    ).toEqual({ model: "glm-5.2" });
  });

  it("reads the architecture-specific context window and capabilities", () => {
    expect(
      parseOllamaCloudModelDetails(
        JSON.stringify({
          capabilities: ["thinking", "completion", "tools"],
          details: { parameter_size: "744.4B" },
          model_info: {
            "glm5.context_length": 1_000_000,
            "glm5.embedding_length": 6144,
          },
        }),
        "glm-5.2",
      ),
    ).toEqual({
      name: "glm-5.2",
      contextLimit: 1_000_000,
      capabilities: ["thinking", "completion", "tools"],
      parameterSize: "744.4B",
    });
  });
});
