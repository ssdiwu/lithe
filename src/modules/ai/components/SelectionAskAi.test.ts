import { describe, expect, it } from "vitest";
import { getSelectionAskPosition } from "./SelectionAskAi";

describe("getSelectionAskPosition", () => {
  it("centers the popup using its measured localized width", () => {
    expect(
      getSelectionAskPosition({
        anchorX: 200,
        anchorY: 120,
        popupWidth: 148,
        viewportWidth: 800,
      }),
    ).toEqual({ top: 88, left: 126 });
  });

  it("keeps variable-width popups inside both viewport edges", () => {
    expect(
      getSelectionAskPosition({
        anchorX: 20,
        anchorY: 20,
        popupWidth: 148,
        viewportWidth: 320,
      }),
    ).toEqual({ top: 8, left: 8 });

    expect(
      getSelectionAskPosition({
        anchorX: 310,
        anchorY: 60,
        popupWidth: 148,
        viewportWidth: 320,
      }),
    ).toEqual({ top: 28, left: 164 });
  });
});
