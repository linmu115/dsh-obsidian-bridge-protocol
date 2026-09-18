import { z } from 'zod';

export const DISCOVERY_PROTOCOL_VERSION = 1 as const;
export const VAULT_BINDING_PROTOCOL_VERSION = 1 as const;
export const DSH_IDENTITY_PATH = '/obsidian-bridge/identity';
export const VAULT_IDENTITY_PATH = '/discovery/v1/identity';
export const VAULT_BINDING_PATH = '/control/v1/binding';
export const BINDING_CAPABILITY = 'vault-instance-binding-v1';
export const discoveryOriginSchema = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
      && url.origin === value && !url.username && !url.password;
  } catch { return false; }
}, 'Discovery origin must be a credential-free HTTP loopback origin');
const id = z.string().min(1).max(256);
export const bindingTargetSchema = z.object({ instanceId: id, profileId: id }).strict();
export type BindingTarget = z.infer<typeof bindingTargetSchema>;
export const vaultBindingSnapshotSchema = z.object({
  bindingProtocolVersion: z.literal(1), vaultId: id, revision: z.number().int().nonnegative(),
  target: bindingTargetSchema.nullable(), updatedAt: z.number().int().nonnegative(), lastOperationId: id.optional(),
}).strict();
export type VaultBindingSnapshot = z.infer<typeof vaultBindingSnapshotSchema>;
const identity = {
  discoveryProtocolVersion: z.literal(1), bootId: z.string().uuid(), publisherId: z.string().uuid(),
  displayName: z.string().min(1).max(256), origin: discoveryOriginSchema,
  capabilities: z.array(z.string().min(1).max(128)).max(64),
};
export const dshInstanceIdentitySchema = z.object({ ...identity, kind: z.literal('dsh'), instanceId: id, profileId: id }).strict();
export const vaultIdentitySchema = z.object({ ...identity, kind: z.literal('vault'), vaultId: id, binding: vaultBindingSnapshotSchema }).strict()
  .refine(value => value.binding.vaultId === value.vaultId, 'Binding Vault identity must match publisher');
export type DshInstanceIdentity = z.infer<typeof dshInstanceIdentitySchema>;
export type VaultIdentity = z.infer<typeof vaultIdentitySchema>;
const times = { updatedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive() };
export const bridgeDiscoveryRecordSchema = z.union([
  dshInstanceIdentitySchema.extend(times), vaultIdentitySchema.safeExtend(times),
]).refine(value => value.expiresAt > value.updatedAt && value.expiresAt - value.updatedAt <= 120_000, 'Invalid discovery lifetime');
export type BridgeDiscoveryRecord = z.infer<typeof bridgeDiscoveryRecordSchema>;
export const changeVaultBindingRequestSchema = z.object({
  operationId: id, expectedRevision: z.number().int().nonnegative(), intent: z.enum(['bind', 'rebind', 'unbind']),
  target: bindingTargetSchema.nullable(), candidate: z.object({ origin: discoveryOriginSchema, bootId: z.string().uuid() }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.intent === 'unbind' ? value.target !== null : !value.target || !value.candidate)
    ctx.addIssue({ code: 'custom', message: 'Bind/rebind require a target and live candidate; unbind requires null target' });
});
export type ChangeVaultBindingRequest = z.infer<typeof changeVaultBindingRequestSchema>;
export const boundOperationRouteSchema = z.object({
  vaultId: id, instanceId: id, profileId: id, bindingRevision: z.number().int().nonnegative(),
}).strict();
export type BoundOperationRoute = z.infer<typeof boundOperationRouteSchema>;

/** Optional capability fields preserve the original lifecycle wire version. */
export const bindingControlFields = {
  bindingProtocolVersion: z.literal(1).optional(), vaultId: id.optional(), bindingRevision: z.number().int().nonnegative().optional(),
  dshBootId: z.string().uuid().optional(), profileId: id.optional(), dshOrigin: discoveryOriginSchema.optional(),
};

