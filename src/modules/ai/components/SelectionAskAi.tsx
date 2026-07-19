import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useTranslation } from "@/i18n";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import type { PresenceState } from "@/lib/usePresence";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type SelectionAskAiProps = {
  state: PresenceState;
  x: number;
  y: number;
  onAsk: () => void;
  onDismiss: () => void;
};

const MIN_WIDTH = 110;
const OFFSET = 32;

type SelectionAskPositionInput = {
  anchorX: number;
  anchorY: number;
  popupWidth: number;
  viewportWidth: number;
};

export function getSelectionAskPosition({
  anchorX,
  anchorY,
  popupWidth,
  viewportWidth,
}: SelectionAskPositionInput): { top: number; left: number } {
  return {
    top: Math.max(8, anchorY - OFFSET),
    left: Math.max(
      8,
      Math.min(anchorX - popupWidth / 2, viewportWidth - popupWidth - 8),
    ),
  };
}

export function SelectionAskAi({
  state,
  x,
  y,
  onAsk,
  onDismiss,
}: SelectionAskAiProps) {
  const { t } = useTranslation("ai");
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const open = state === "open";
  const label = t("selectionAsk");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const popupWidth =
        popupRef.current?.getBoundingClientRect().width ?? MIN_WIDTH;
      setPos(
        getSelectionAskPosition({
          anchorX: x,
          anchorY: y,
          popupWidth,
          viewportWidth: window.innerWidth,
        }),
      );
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    if (popupRef.current) resizeObserver.observe(popupRef.current);
    window.addEventListener("resize", updatePosition);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, x, y]);

  return (
    <div
      ref={popupRef}
      data-selection-ask-ai
      data-state={state}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-50 w-max min-w-[110px] max-w-[calc(100vw-1rem)] duration-150 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-1"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAsk();
        }}
        className="flex h-7 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-card/95 px-2 text-xs shadow-lg backdrop-blur-md hover:border-border hover:bg-accent"
      >
        <span className="min-w-0 truncate">{label}</span>
        <KbdGroup className="shrink-0">
          <Kbd className="h-4 min-w-4 px-1 text-[10px]">
            {fmtShortcut(MOD_KEY, "L")}
          </Kbd>
        </KbdGroup>
      </button>
    </div>
  );
}
