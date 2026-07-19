import { describe, expect, it } from "vitest";

import { TerminalImeFallback } from "./terminalImeFallback";

const key229 = { keyCode: 229 };
const physicalCommaKey = { keyCode: 188 };
const unidentifiedKeyup = { keyCode: 0 };
const spaceKeyup = { keyCode: 32 };

describe("TerminalImeFallback", () => {
  it("flushes punctuation that only becomes visible at keyup", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, "");

    expect(fallback.keyup(key229, "，")).toBe("，");
  });

  it("flushes punctuation when WebKit changes keyup to Unidentified", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, "");

    expect(fallback.keyup(unidentifiedKeyup, "，")).toBe("，");
  });

  it("flushes IME space when WebKit restores the physical key code at keyup", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, "");

    expect(fallback.keyup(spaceKeyup, " ")).toBe(" ");
  });

  it("flushes third-party IME punctuation reported as a physical key", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(physicalCommaKey, "");

    expect(fallback.keyup(physicalCommaKey, "，")).toBe("，");
  });

  it("keeps the earliest baseline when WebKit delays multiple punctuation keys", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, "");
    expect(fallback.keyup(key229, "")).toBeNull();
    fallback.keydown(key229, "");

    expect(fallback.keyup(key229, "，。")).toBe("，。");
  });

  it("converts an equal-length IME replacement into delete plus insert", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, " ");

    expect(fallback.keyup(key229, "。")).toBe("\x7f。");
  });

  it("does not duplicate data already emitted by xterm", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(physicalCommaKey, "");
    expect(fallback.handleNativeData(",")).toBe(true);

    expect(fallback.keyup(physicalCommaKey, ",")).toBeNull();
  });

  it("suppresses a late duplicate after the keyup fallback writes", () => {
    const fallback = new TerminalImeFallback();

    fallback.keydown(key229, "");
    expect(fallback.keyup(key229, "，")).toBe("，");

    expect(fallback.handleNativeData("，")).toBe(false);
    expect(fallback.handleNativeData("。")).toBe(true);
  });

  it("leaves real composition sequences to xterm", () => {
    const fallback = new TerminalImeFallback();

    fallback.compositionStart();
    fallback.keydown(key229, "");
    fallback.compositionEnd();

    expect(fallback.keyup(key229, "中文")).toBeNull();
  });
});
