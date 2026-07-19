import { invoke } from "@tauri-apps/api/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import i18n, {
  applyLanguagePreference,
  detectSystemLanguage,
  FALLBACK_LANGUAGE,
  initI18n,
  isLanguagePreference,
  normalizeLocale,
  resolveLanguagePreference,
  SYSTEM_LANGUAGE,
  Trans,
} from "./index";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  isTauri: vi.fn(() => true),
}));

function dottedLeafTranslations(resources: Record<string, unknown>): {
  key: string;
  value: string;
}[] {
  const translations: { key: string; value: string }[] = [];

  const visit = (
    namespace: string,
    value: unknown,
    segments: string[],
  ): void => {
    if (typeof value === "string") {
      if (segments.some((segment) => segment.includes("."))) {
        translations.push({
          key: `${namespace}:${segments.join(".")}`,
          value,
        });
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [segment, child] of Object.entries(value)) {
      visit(namespace, child, [...segments, segment]);
    }
  };

  for (const [namespace, value] of Object.entries(resources)) {
    visit(namespace, value, []);
  }
  return translations;
}

describe("locale resolution", () => {
  it("normalizes exact, underscored, and regional locale tags", () => {
    expect(normalizeLocale("zh_CN")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans-SG")).toBe("zh-CN");
    expect(normalizeLocale("en-GB")).toBe("en");
    expect(normalizeLocale("de-DE")).toBeNull();
  });

  it("selects the first supported system language", () => {
    expect(detectSystemLanguage(["de-DE", "zh-Hans"])).toBe("zh-CN");
    expect(detectSystemLanguage(["de-DE", "fr-FR"])).toBe(FALLBACK_LANGUAGE);
  });

  it("resolves system, explicit, and invalid preferences safely", () => {
    expect(resolveLanguagePreference(SYSTEM_LANGUAGE, ["zh-CN"])).toBe("zh-CN");
    expect(resolveLanguagePreference("en", ["zh-CN"])).toBe("en");
    expect(resolveLanguagePreference("unknown", ["zh-CN"])).toBe(
      FALLBACK_LANGUAGE,
    );
    expect(isLanguagePreference("zh-CN")).toBe(true);
    expect(isLanguagePreference("unknown")).toBe(false);
  });
});

describe("translation runtime", () => {
  it("loads locales, resolves plurals, interpolates, and renders rich text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const bundle = String(input).includes("zh-CN") ? zhCN : en;
        return new Response(JSON.stringify(bundle), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }),
    );

    await initI18n();
    expect(i18n.t("sourceControl:stagedFiles", { count: 1 })).toBe(
      "1 file staged",
    );
    expect(i18n.t("sourceControl:stagedFiles", { count: 2 })).toBe(
      "2 files staged",
    );

    vi.mocked(invoke).mockClear();
    await applyLanguagePreference("zh-CN");
    expect(i18n.language).toBe("zh-CN");
    expect(invoke).toHaveBeenCalledWith("set_native_menu", {
      locale: "zh-CN",
      labels: expect.objectContaining({
        file: "文件",
        edit: "编辑",
        view: "显示",
        window: "窗口",
        help: "帮助",
      }),
    });
    expect(i18n.t("commandPalette:cmd.settings.open")).toBe("打开设置");
    expect(i18n.t("shortcuts:label.settings.open")).toBe("打开设置");
    expect(
      i18n.t("modelHint.gpt-5.5", {
        ns: "aiModels",
        keySeparator: false,
        defaultValue: "Flagship",
      }),
    ).toBe("旗舰");
    const dottedTranslations = dottedLeafTranslations(zhCN.resources);
    expect(dottedTranslations.length).toBeGreaterThan(0);
    for (const translation of dottedTranslations) {
      expect(i18n.t(translation.key)).toBe(translation.value);
    }
    expect(i18n.t("agents:signal.finished", { name: "Pi" })).toContain("Pi");
    expect(i18n.t("missing:key", { defaultValue: "fallback" })).toBe(
      "fallback",
    );

    const richText = renderToStaticMarkup(
      createElement(Trans, {
        i18nKey: "lsp:notFoundOnPath",
        values: { command: "rust-analyzer" },
        components: { code: createElement("code") },
      }),
    );
    expect(richText).toContain("<code>rust-analyzer</code>");
    expect(richText).toContain("Lithe");

    await applyLanguagePreference("en");
    vi.unstubAllGlobals();
  });
});
