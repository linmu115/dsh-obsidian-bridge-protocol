import { z } from "zod";

export const BRIDGE_LIFECYCLE_PROTOCOL_VERSION = 2 as const;

export const bridgeBrowserOriginSchema = z.string().url().superRefine((value, context) => {
  const url = new URL(value);
  if (url.protocol !== "http:" || (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")) {
    context.addIssue({ code: "custom", message: "Browser origin must use loopback HTTP" });
  }
  if (url.origin !== value || url.username !== "" || url.password !== "") {
    context.addIssue({ code: "custom", message: "Browser origin must not contain credentials, a path, query or fragment" });
  }
});
export type BridgeBrowserOrigin = z.infer<typeof bridgeBrowserOriginSchema>;

export const bridgeBrowserOriginsSchema = z.array(bridgeBrowserOriginSchema).max(8);

export const bridgeLifecycleStateSchema = z.enum([
  "STARTING",
  "READY",
  "DEGRADED",
  "DRAINING",
  "DRAINED",
  "OFFLINE",
]);
export type BridgeLifecycleState = z.infer<typeof bridgeLifecycleStateSchema>;

export const bridgeClientRoleSchema = z.enum(["controller", "surface"]);
export type BridgeClientRole = z.infer<typeof bridgeClientRoleSchema>;

export const bridgeIdentitySchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  instanceId: z.string().min(1).max(256),
  bootId: z.string().uuid(),
  bridgeVersion: z.string().min(1).max(64),
  startedAt: z.number().int().nonnegative(),
});
export type BridgeIdentity = z.infer<typeof bridgeIdentitySchema>;

export const bridgeLeaseSchema = z.object({
  leaseId: z.string().uuid(),
  clientId: z.string().min(1).max(128),
  role: bridgeClientRoleSchema,
  bootId: z.string().uuid(),
  acquiredAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
  browserOrigins: bridgeBrowserOriginsSchema,
});
export type BridgeLease = z.infer<typeof bridgeLeaseSchema>;

export const bridgeStatusSchema = z.object({
  ...bridgeIdentitySchema.shape,
  state: bridgeLifecycleStateSchema.exclude(["OFFLINE"]),
  stateChangedAt: z.number().int().nonnegative(),
  activeLeaseCount: z.number().int().nonnegative(),
  inFlightRequestCount: z.number().int().nonnegative(),
  degradedReason: z.string().min(1).max(512).optional(),
  drainRequestId: z.string().uuid().optional(),
});
export type BridgeStatus = z.infer<typeof bridgeStatusSchema>;

export const bridgeOfflineStatusSchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  state: z.literal("OFFLINE"),
  stateChangedAt: z.number().int().nonnegative(),
  lastKnownIdentity: bridgeIdentitySchema.optional(),
  reason: z.string().min(1).max(512).optional(),
});
export type BridgeOfflineStatus = z.infer<typeof bridgeOfflineStatusSchema>;
export type ObservedBridgeStatus = BridgeStatus | BridgeOfflineStatus;

export const bridgeControlHandshakeRequestSchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  clientId: z.string().min(1).max(128),
  role: bridgeClientRoleSchema,
  expectedBootId: z.string().uuid().optional(),
});
export type BridgeControlHandshakeRequest = z.infer<typeof bridgeControlHandshakeRequestSchema>;

export const bridgeControlHandshakeResponseSchema = z.object({
  ...bridgeStatusSchema.shape,
  clientId: z.string().min(1).max(128),
  role: bridgeClientRoleSchema,
  token: z.string().min(32),
  tokenExpiresAt: z.number().int().positive(),
});
export type BridgeControlHandshakeResponse = z.infer<typeof bridgeControlHandshakeResponseSchema>;

export const acquireBridgeLeaseRequestSchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  expectedBootId: z.string().uuid(),
  ttlMs: z.number().int().min(1_000).max(120_000),
  browserOrigins: bridgeBrowserOriginsSchema,
});
export type AcquireBridgeLeaseRequest = z.infer<typeof acquireBridgeLeaseRequestSchema>;

export const renewBridgeLeaseRequestSchema = acquireBridgeLeaseRequestSchema.extend({
  leaseId: z.string().uuid(),
});
export type RenewBridgeLeaseRequest = z.infer<typeof renewBridgeLeaseRequestSchema>;

export const drainBridgeRequestSchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  requestId: z.string().uuid(),
  expectedBootId: z.string().uuid(),
  deadlineMs: z.number().int().min(0).max(120_000),
  reason: z.string().min(1).max(512),
});
export type DrainBridgeRequest = z.infer<typeof drainBridgeRequestSchema>;

export const resumeBridgeRequestSchema = z.object({
  lifecycleProtocolVersion: z.literal(BRIDGE_LIFECYCLE_PROTOCOL_VERSION),
  requestId: z.string().uuid(),
  expectedBootId: z.string().uuid(),
});
export type ResumeBridgeRequest = z.infer<typeof resumeBridgeRequestSchema>;

export const bridgeControlErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "BOOT_MISMATCH",
    "NOT_CONTROLLER",
    "INVALID_STATE",
    "LEASE_NOT_FOUND",
    "PROTOCOL_MISMATCH",
  ]).optional(),
});
export type BridgeControlError = z.infer<typeof bridgeControlErrorSchema>;

export function isBridgeOnline(status: ObservedBridgeStatus): status is BridgeStatus {
  return status.state !== "OFFLINE";
}

export function acceptsBridgeWork(status: ObservedBridgeStatus): status is BridgeStatus {
  return status.state === "READY" || status.state === "DEGRADED";
}
