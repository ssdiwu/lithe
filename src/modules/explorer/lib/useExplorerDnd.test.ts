import { describe, expect, it } from "vitest";
import { classifyExplorerDropTarget } from "./useExplorerDnd";

const source = "/workspace/src/file.ts";

describe("classifyExplorerDropTarget", () => {
  it("treats a terminal pane as path insertion, never a move to root", () => {
    expect(
      classifyExplorerDropTarget({
        source,
        rootPath: "/workspace",
        hitPath: null,
        hitIsDirectory: false,
        overExplorer: false,
        terminalLeafId: 7,
      }),
    ).toEqual({ kind: "terminal", leafId: 7 });
  });

  it("ignores drops outside both the explorer and terminal", () => {
    expect(
      classifyExplorerDropTarget({
        source,
        rootPath: "/workspace",
        hitPath: null,
        hitIsDirectory: false,
        overExplorer: false,
        terminalLeafId: null,
      }),
    ).toBeNull();
  });

  it("uses the workspace root only for blank space inside the explorer", () => {
    expect(
      classifyExplorerDropTarget({
        source,
        rootPath: "/workspace",
        hitPath: null,
        hitIsDirectory: false,
        overExplorer: true,
        terminalLeafId: null,
      }),
    ).toEqual({ kind: "directory", path: "/workspace" });
  });
});
