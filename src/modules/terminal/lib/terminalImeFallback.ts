const DELETE = "\x7f";

type ImeKeyEvent = Pick<KeyboardEvent, "keyCode">;

function textareaDelta(baseline: string, current: string): string | null {
  if (baseline === current) return null;

  // xterm treats a shorter hidden-textarea value as one user backspace. Keep
  // that contract instead of deriving a bulk deletion from accessibility text.
  if (current.length < baseline.length) return DELETE;

  let commonPrefixLength = 0;
  while (
    commonPrefixLength < baseline.length &&
    commonPrefixLength < current.length &&
    baseline.charCodeAt(commonPrefixLength) ===
      current.charCodeAt(commonPrefixLength)
  ) {
    commonPrefixLength += 1;
  }

  const removedCount = baseline.length - commonPrefixLength;
  const inserted = current.slice(commonPrefixLength);
  return `${DELETE.repeat(removedCount)}${inserted}`;
}

/**
 * WKWebView can update xterm's hidden textarea only at keyup for punctuation
 * entered while a CJK IME is active. xterm 6.0 only checks at keydown + timer,
 * so the character can remain buffered until later input. This small state
 * machine adds the missing keyup observation without taking over real
 * composition sequences.
 */
export class TerminalImeFallback {
  private baseline: string | undefined;
  private composing = false;
  private suppressNextNativeData = false;

  compositionStart(): void {
    this.composing = true;
    this.baseline = undefined;
    this.suppressNextNativeData = false;
  }

  compositionEnd(): void {
    this.composing = false;
    this.baseline = undefined;
  }

  keydown(_event: ImeKeyEvent, textareaValue: string): void {
    if (this.composing) return;

    // The capture listener runs before xterm. If xterm handles this key,
    // handleNativeData clears the baseline before keyup. Keeping the earliest
    // unchanged baseline also covers IMEs that expose several delayed symbols
    // together.
    this.suppressNextNativeData = false;
    this.baseline ??= textareaValue;
  }

  keyup(_event: ImeKeyEvent, textareaValue: string): string | null {
    // IMEs disagree on key codes: WebKit can report 229/0, while third-party
    // macOS IMEs can keep the physical punctuation code. Native xterm data,
    // rather than a particular key code, decides whether fallback is needed.
    if (this.composing) return null;
    if (this.baseline === undefined) return null;

    const payload = textareaDelta(this.baseline, textareaValue);
    if (payload === null) {
      // Keep the earliest baseline: some WebKit builds expose several delayed
      // punctuation characters together on a later keyup.
      return null;
    }

    this.baseline = undefined;
    this.suppressNextNativeData = true;
    return payload;
  }

  /** Returns false only for xterm's late duplicate of a keyup fallback write. */
  handleNativeData(_data: string): boolean {
    if (this.suppressNextNativeData) {
      this.suppressNextNativeData = false;
      return false;
    }
    this.baseline = undefined;
    return true;
  }

  expireNativeSuppression(): void {
    this.suppressNextNativeData = false;
  }

  reset(): void {
    this.baseline = undefined;
    this.composing = false;
    this.suppressNextNativeData = false;
  }
}

export type TerminalImeBinding = {
  handleNativeData(data: string): boolean;
  reset(): void;
  dispose(): void;
};

export function bindTerminalImeFallback(
  textarea: HTMLTextAreaElement,
  write: (data: string) => void,
): TerminalImeBinding {
  const fallback = new TerminalImeFallback();

  const onCompositionStart = () => fallback.compositionStart();
  const onCompositionEnd = () => fallback.compositionEnd();
  const onKeydown = (event: KeyboardEvent) => {
    if (event.target !== textarea) return;
    fallback.keydown(event, textarea.value);
  };
  const onKeyup = (event: KeyboardEvent) => {
    const payload = fallback.keyup(event, textarea.value);
    if (payload === null) return;
    write(payload);
    setTimeout(() => fallback.expireNativeSuppression(), 0);
  };

  textarea.addEventListener("compositionstart", onCompositionStart);
  textarea.addEventListener("compositionend", onCompositionEnd);
  // Window capture runs before xterm's target listener. This lets native
  // onData clear the baseline when xterm handled an ordinary English key.
  window.addEventListener("keydown", onKeydown, true);
  textarea.addEventListener("keyup", onKeyup);

  return {
    handleNativeData: (data) => fallback.handleNativeData(data),
    reset: () => fallback.reset(),
    dispose: () => {
      textarea.removeEventListener("compositionstart", onCompositionStart);
      textarea.removeEventListener("compositionend", onCompositionEnd);
      window.removeEventListener("keydown", onKeydown, true);
      textarea.removeEventListener("keyup", onKeyup);
      fallback.reset();
    },
  };
}
