import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  rootPath: string;
  isDir: (path: string) => boolean | undefined;
  onMove: (from: string, toDir: string) => void;
  onTerminalDrop?: (path: string, leafId: number) => void;
};

export type ExplorerDropTarget =
  | { kind: "directory"; path: string }
  | { kind: "terminal"; leafId: number };

const THRESHOLD = 5;

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : path;
}

function sameDropTarget(
  left: ExplorerDropTarget | null,
  right: ExplorerDropTarget | null,
): boolean {
  if (left === right) return true;
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.kind === "directory" && right.kind === "directory") {
    return left.path === right.path;
  }
  if (left.kind === "terminal" && right.kind === "terminal") {
    return left.leafId === right.leafId;
  }
  return false;
}

export function classifyExplorerDropTarget({
  source,
  rootPath,
  hitPath,
  hitIsDirectory,
  overExplorer,
  terminalLeafId,
}: {
  source: string;
  rootPath: string;
  hitPath: string | null;
  hitIsDirectory: boolean;
  overExplorer: boolean;
  terminalLeafId: number | null;
}): ExplorerDropTarget | null {
  if (terminalLeafId !== null) {
    return { kind: "terminal", leafId: terminalLeafId };
  }
  const path = hitPath
    ? hitIsDirectory
      ? hitPath
      : parentDir(hitPath)
    : overExplorer
      ? rootPath
      : null;
  if (
    !path ||
    path === source ||
    path.startsWith(`${source}/`) ||
    parentDir(source) === path
  ) {
    return null;
  }
  return { kind: "directory", path };
}

// Pointer-based, delegated on the container (no per-row handlers); sidesteps
// native HTML5 DnD which Tauri intercepts when dragDropEnabled is on. The ghost
// follows the cursor via direct DOM writes, so dragging re-renders only when the
// drop target changes, not on every move.
export function useExplorerDnd({
  rootPath,
  isDir,
  onMove,
  onTerminalDrop,
}: Options) {
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [dropTargetDir, setDropTargetDir] = useState<string | null>(null);
  const [terminalTargetLeafId, setTerminalTargetLeafId] = useState<
    number | null
  >(null);

  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const dropTargetRef = useRef<ExplorerDropTarget | null>(null);
  const suppressClickRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const optsRef = useRef({ rootPath, isDir, onMove, onTerminalDrop });
  optsRef.current = { rootPath, isDir, onMove, onTerminalDrop };

  const placeGhost = useCallback((x: number, y: number) => {
    lastPosRef.current = { x, y };
    const g = ghostElRef.current;
    if (g) {
      g.style.left = `${x + 12}px`;
      g.style.top = `${y + 8}px`;
    }
  }, []);

  const ghostRef = useCallback(
    (el: HTMLDivElement | null) => {
      ghostElRef.current = el;
      if (el) placeGhost(lastPosRef.current.x, lastPosRef.current.y);
    },
    [placeGhost],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-fs-path]",
      );
      const source = el?.getAttribute("data-fs-path");
      if (!source) return;
      const name = source.slice(source.lastIndexOf("/") + 1);
      const sx = e.clientX;
      const sy = e.clientY;
      let active = false;

      const move = (ev: PointerEvent) => {
        if (!active) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return;
          active = true;
          lastPosRef.current = { x: ev.clientX, y: ev.clientY };
          setDragLabel(name);
        }
        placeGhost(ev.clientX, ev.clientY);
        const { rootPath, isDir } = optsRef.current;
        const element = document.elementFromPoint(ev.clientX, ev.clientY);
        const hit = element?.closest<HTMLElement>("[data-fs-path]");
        const p = hit?.getAttribute("data-fs-path");
        const terminalLeaf = element?.closest<HTMLElement>("[data-pane-leaf]");
        const terminalLeafId = Number(terminalLeaf?.dataset.paneLeaf);
        const target = classifyExplorerDropTarget({
          source,
          rootPath,
          hitPath: p ?? null,
          hitIsDirectory: p ? isDir(p) === true : false,
          overExplorer: !!element?.closest("[data-explorer-drop]"),
          terminalLeafId: Number.isFinite(terminalLeafId)
            ? terminalLeafId
            : null,
        });
        const previous = dropTargetRef.current;
        if (!sameDropTarget(previous, target)) {
          dropTargetRef.current = target;
          setDropTargetDir(target?.kind === "directory" ? target.path : null);
          setTerminalTargetLeafId(
            target?.kind === "terminal" ? target.leafId : null,
          );
        }
      };
      const detach = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        cleanupRef.current = null;
      };
      const end = (commit: boolean) => {
        detach();
        if (!active) return;
        const target = dropTargetRef.current;
        if (commit && target?.kind === "directory") {
          optsRef.current.onMove(source, target.path);
        } else if (commit && target?.kind === "terminal") {
          optsRef.current.onTerminalDrop?.(source, target.leafId);
        }
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        dropTargetRef.current = null;
        setDragLabel(null);
        setDropTargetDir(null);
        setTerminalTargetLeafId(null);
      };
      const up = () => end(true);
      const cancel = () => end(false);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      cleanupRef.current = detach;
    },
    [placeGhost],
  );

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return {
    ghostRef,
    dragLabel,
    dropTargetDir,
    terminalTargetLeafId,
    onPointerDown,
    onClickCapture,
  };
}
