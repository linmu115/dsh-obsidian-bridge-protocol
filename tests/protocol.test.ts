import { describe, expect, it } from "vitest";

import {
  BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
  acceptsBridgeWork,
  bridgeControlHandshakeRequestSchema,
  bridgeStatusSchema,
  drainBridgeRequestSchema,
} from "../src/index.ts";

const identity = {
  lifecycleProtocolVersion: BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
  instanceId: "vault-a",
  bootId: "550e8400-e29b-41d4-a716-446655440000",
  bridgeVersion: "0.4.0",
  startedAt: 1,
};

describe("Bridge lifecycle protocol", () => {
  it("parses a ready status and marks it as work-capable", () => {
    const status = bridgeStatusSchema.parse({
      ...identity,
      state: "READY",
      stateChangedAt: 2,
      activeLeaseCount: 1,
      inFlightRequestCount: 0,
    });
    expect(acceptsBridgeWork(status)).toBe(true);
  });

  it("requires controller intent to be explicit at handshake", () => {
    expect(bridgeControlHandshakeRequestSchema.parse({
      lifecycleProtocolVersion: 1,
      clientId: "dsh-host-web",
      role: "controller",
    }).role).toBe("controller");
  });

  it("fences drains to the current boot identity", () => {
    expect(() => drainBridgeRequestSchema.parse({
      lifecycleProtocolVersion: 1,
      requestId: "550e8400-e29b-41d4-a716-446655440001",
      expectedBootId: "stale",
      deadlineMs: 5000,
      reason: "profile shutdown",
    })).toThrow();
  });
});
