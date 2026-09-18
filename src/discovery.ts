import { mkdir, readFile, readdir, rename, lstat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bridgeDiscoveryRecordSchema, type BridgeDiscoveryRecord } from './binding.ts';

export interface DiscoveryOptions { directory?: string; now?: () => number; maxEntries?: number; }
export interface DiscoveryConflict { kind: 'dsh' | 'vault'; id: string; profileId?: string; publisherIds: string[]; }
export function getBridgeDiscoveryDirectory(env: Record<string, string | undefined> = process.env, home = homedir()): string {
  return env.DSH_OBSIDIAN_DISCOVERY_DIR?.trim() || join(home, '.dsh', 'obsidian-bridge', 'discovery-v1');
}
const filename = (publisherId: string, bootId: string) => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(publisherId) || !uuid.test(bootId)) throw new Error('Invalid discovery publisher identity');
  return `${publisherId}.${bootId}.json`;
};
export async function writeDiscoveryRecord(input: BridgeDiscoveryRecord, options: DiscoveryOptions = {}): Promise<void> {
  const record = bridgeDiscoveryRecordSchema.parse(input), now = (options.now ?? Date.now)();
  if (record.expiresAt <= now || record.updatedAt > now + 5_000) throw new Error('Discovery record is stale or from the future');
  const directory = options.directory ?? getBridgeDiscoveryDirectory();
  await mkdir(directory, { recursive: true });
  const path = join(directory, filename(record.publisherId, record.bootId)), temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(record), { encoding: 'utf8', mode: 0o600, flag: 'wx' }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => undefined); }
}
export async function readDiscoveryRecords(options: DiscoveryOptions = {}): Promise<{ records: BridgeDiscoveryRecord[]; conflicts: DiscoveryConflict[] }> {
  const directory = options.directory ?? getBridgeDiscoveryDirectory(), now = (options.now ?? Date.now)();
  let names: string[];
  try { names = await readdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { records: [], conflicts: [] }; throw error; }
  const records: BridgeDiscoveryRecord[] = [];
  for (const name of names.filter(name => name.endsWith('.json')).sort().slice(0, options.maxEntries ?? 512)) {
    try {
      const path = join(directory, name), info = await lstat(path);
      if (!info.isFile() || info.size > 65_536) continue;
      const data = await readFile(path, 'utf8'); if (Buffer.byteLength(data) > 65_536) continue;
      const record = bridgeDiscoveryRecordSchema.parse(JSON.parse(data));
      if (name !== filename(record.publisherId, record.bootId) || record.expiresAt <= now || record.updatedAt > now + 5_000) continue;
      records.push(record);
    } catch { /* Invalid or concurrently removed entries are never routing candidates. */ }
  }
  const groups = new Map<string, BridgeDiscoveryRecord[]>();
  for (const record of records) {
    const key = record.kind === 'dsh' ? JSON.stringify(['dsh', record.instanceId, record.profileId]) : JSON.stringify(['vault', record.vaultId]);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const conflicts: DiscoveryConflict[] = [], accepted: BridgeDiscoveryRecord[] = [];
  for (const group of groups.values()) {
    const record = group[0]!;
    if (group.length > 1) conflicts.push({ kind: record.kind, id: record.kind === 'dsh' ? record.instanceId : record.vaultId,
      ...(record.kind === 'dsh' ? { profileId: record.profileId } : {}), publisherIds: group.map(item => item.publisherId) });
    else accepted.push(record);
  }
  return { records: accepted, conflicts };
}
export async function removeDiscoveryRecord(owner: { kind: 'dsh' | 'vault'; publisherId: string; bootId: string }, options: DiscoveryOptions = {}): Promise<void> {
  const path = join(options.directory ?? getBridgeDiscoveryDirectory(), filename(owner.publisherId, owner.bootId));
  try {
    const record = bridgeDiscoveryRecordSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (record.kind === owner.kind && record.publisherId === owner.publisherId && record.bootId === owner.bootId) await unlink(path);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
