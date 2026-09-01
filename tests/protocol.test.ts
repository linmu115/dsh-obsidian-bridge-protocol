import { describe, expect, it } from "vitest";

import {
  BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
  acceptsBridgeWork,
  acquireBridgeLeaseRequestSchema,
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
      lifecycleProtocolVersion: BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
      clientId: "dsh-host-web",
      role: "controller",
    }).role).toBe("controller");
  });

  it("accepts exact loopback browser origins and rejects broad or remote origins", () => {
    const request = acquireBridgeLeaseRequestSchema.parse({
      lifecycleProtocolVersion: BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
      expectedBootId: identity.bootId,
      ttlMs: 15_000,
      browserOrigins: ["http://127.0.0.1:23686"],
    });
    expect(request.browserOrigins).toEqual(["http://127.0.0.1:23686"]);
    for (const origin of ["*", "https://example.com", "http://127.0.0.1:23686/path"]) {
      expect(() => acquireBridgeLeaseRequestSchema.parse({ ...request, browserOrigins: [origin] })).toThrow();
    }
  });

  it("fences drains to the current boot identity", () => {
    expect(() => drainBridgeRequestSchema.parse({
      lifecycleProtocolVersion: BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
      requestId: "550e8400-e29b-41d4-a716-446655440001",
      expectedBootId: "stale",
      deadlineMs: 5000,
      reason: "profile shutdown",
    })).toThrow();
  });
});
