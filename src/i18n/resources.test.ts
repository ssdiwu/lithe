import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

function flatten(value: unknown, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result.set(path, child);
    else for (const entry of flatten(child, path)) result.set(...entry);
  }
  return result;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
    .map((match) => match[1] ?? "")
    .sort();
}

describe("locale resources", () => {
  const english = flatten(en.resources);
  const chinese = flatten(zhCN.resources);

  it("keeps namespace and translation keys aligned", () => {
    expect([...chinese.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("keeps interpolation parameters aligned", () => {
    for (const [key, englishValue] of english) {
      expect(placeholders(chinese.get(key) ?? ""), key).toEqual(
        placeholders(englishValue),
      );
    }
  });
});
