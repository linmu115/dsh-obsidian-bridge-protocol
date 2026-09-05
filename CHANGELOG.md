# Changelog

## 0.3.2 - Unreleased

- Export neutral sticker/session-note/backlink/navigation schemas from `./data`,
  shared by both applications. Core remains the annotation schema authority.
- Leave Zod external in this library so application builds bundle one schema
  runtime. Preserve annotation 2, sticker 1 and lifecycle 3 wire formats.

## 0.3.1 - 2026-09-04

- Pin Zod 4.4.3 as the shared RC1 suite schema identity.
- Keep lifecycle v3, targeted surface, action acknowledgement, backlink, and
  deletion wire contracts unchanged.
