import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bridgeDiscoveryRecordSchema, dshInstanceIdentitySchema, type BridgeDiscoveryRecord } from '../src/binding.ts';
import { readDiscoveryRecords, writeDiscoveryRecord, removeDiscoveryRecord } from '../src/discovery.ts';
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function fixture() { const directory = await mkdtemp(join(tmpdir(), 'bridge-discovery-')); directories.push(directory); return { directory, now: () => 1_000 }; }
function record(): BridgeDiscoveryRecord { return { discoveryProtocolVersion: 1, kind: 'dsh', instanceId: 'stable', profileId: 'web', bootId: randomUUID(), publisherId: randomUUID(), displayName: 'Test', origin: 'http://127.0.0.1:3300', capabilities: ['vault-instance-binding-v1'], updatedAt: 900, expiresAt: 31_000 }; }
it('publishes and removes only its own runtime metadata', async () => {
  const options = await fixture(), first = record(), other = { ...record(), instanceId: 'other' };
  await writeDiscoveryRecord(first, options); await writeDiscoveryRecord(other, options);
  expect((await readDiscoveryRecords(options)).records).toHaveLength(2);
  await removeDiscoveryRecord(first, options);
  expect((await readDiscoveryRecords(options)).records).toEqual([other]);
});
it('withholds duplicate stable identities instead of choosing the last publisher', async () => {
  const options = await fixture(); await writeDiscoveryRecord(record(), options); await writeDiscoveryRecord(record(), options);
  const result = await readDiscoveryRecords(options); expect(result.records).toEqual([]); expect(result.conflicts[0]).toMatchObject({ id: 'stable', profileId: 'web' });
});
it('rejects expired, oversized, credentialed and polluted records', async () => {
  const options = await fixture();
  const valid = record(); await writeDiscoveryRecord(valid, options);
  expect((await readDiscoveryRecords({ ...options, now: () => 40_000 })).records).toEqual([]);
  const path = join(options.directory, `${valid.publisherId}.${valid.bootId}.json`);
  await writeFile(path, JSON.stringify({ ...valid, token: 'secret' })); expect((await readDiscoveryRecords(options)).records).toEqual([]);
  await writeFile(path, ' '.repeat(65_537)); expect((await readDiscoveryRecords(options)).records).toEqual([]);
  expect(bridgeDiscoveryRecordSchema.safeParse({ ...valid, origin: 'http://127.0.0.1:3300/?token=secret' }).success).toBe(false);
  expect(bridgeDiscoveryRecordSchema.safeParse({ ...valid, origin: 'https://example.com' }).success).toBe(false);
  expect(dshInstanceIdentitySchema.safeParse({ ...valid, authenticatedUrl: 'secret' }).success).toBe(false);
});
