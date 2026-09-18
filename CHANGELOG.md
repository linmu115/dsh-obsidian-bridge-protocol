# Changelog

## 0.4.0-rc2.1 — 2026-09-18

Add versioned binding/discovery DTOs and a separate Node-only registry provider. Strict loopback metadata excludes credentials, expired/oversized entries and conflicting identities. Lifecycle 3 and sticker 1 remain unchanged; bindingProtocolVersion 1 and vault-instance-binding-v1 opt into explicit binding. Add optional Vault identity to legacy note associations and note/backlink operations.

## 0.3.3-rc2.1 — DSH 0.1.5-rc.2 (2026-09-12)

10 tests passed. Add optional dshInstanceId to data/control contracts. Lifecycle v3, annotation v2 and sticker v1 stay compatible with historical records.


## 0.3.2 - Unreleased

- Export neutral sticker/session-note/backlink/navigation schemas from `./data`,
  shared by both applications. Core remains the annotation schema authority.
- Leave Zod external in this library so application builds bundle one schema
  runtime. Preserve annotation 2, sticker 1 and lifecycle 3 wire formats.

## 0.3.1 - 2026-09-04

- Pin Zod 4.4.3 as the shared RC1 suite schema identity.
- Keep lifecycle v3, targeted surface, action acknowledgement, backlink, and
  deletion wire contracts unchanged.
