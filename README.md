# dsh-obsidian-bridge-protocol

Shared, versioned lifecycle messages for the Obsidian DeepHarness Bridge and DSH-side adapters. The protocol is intentionally narrow: identity, status, lease-scoped loopback browser origins, drain, and resume. Browser origins disappear when their controller lease expires or is released. The protocol does not expose plugin installation, unload, filesystem, or command execution.
