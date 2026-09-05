import { describe, expect, it } from "vitest";
import { parseBridgeMessage, sessionNoteDocumentSchema, stickerBacklinkTargetSchema } from "../src/data.ts";

const target = {
  stickerId: "9bb3a80e-230d-44d1-a37c-f7b79d2bf315",
  sessionId: "native-session", anchorId: "native-anchor", quoteHash: "sha256:quote",
  logicalSessionId: "logical-session", logicalAnchorId: "logical-anchor",
  legacySessionId: "older-native-session", legacyAnchorId: "older-native-anchor",
};

describe("shared Bridge data protocol", () => {
  it("preserves logical and legacy identities on backlink operations", () => {
    expect(stickerBacklinkTargetSchema.parse(target)).toEqual(target);
  });

  it("preserves targeted navigation while rejecting an invalid surface identity", () => {
    const message = {
      ...target, protocolVersion: 1, type: "deep-link",
      actionId: "550e8400-e29b-41d4-a716-446655440000",
      targetSurfaceId: "550e8400-e29b-41d4-a716-446655440001",
    };
    expect(parseBridgeMessage(message)).toEqual(message);
    expect(() => parseBridgeMessage({ ...message, targetSurfaceId: "not-a-surface-id" })).toThrow();
  });

  it("round-trips note state without changing revision or sticker identity", () => {
    const document = {
      protocolVersion: 1, type: "session-note", sessionId: target.sessionId, revision: "sha256:current",
      stickers: [{ ...target, role: "assistant", quote: "quote", occurrence: 0, markdown: "note", tags: [], color: "yellow" }],
    };
    expect(sessionNoteDocumentSchema.parse(document)).toEqual(document);
    expect(() => sessionNoteDocumentSchema.parse({ ...document, protocolVersion: 2 })).toThrow();
  });

  it("retains legacy citation decoding for the Obsidian migration path", () => {
    const citation = {
      protocolVersion: 1, type: "pending-citation", citationId: target.stickerId,
      notePath: "note.md", blockId: "block", text: "quote", contentHash: "sha256:quote",
    };
    expect(parseBridgeMessage(citation)).toEqual(citation);
  });
});
