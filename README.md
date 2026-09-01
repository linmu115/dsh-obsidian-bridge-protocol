# dsh-obsidian-bridge-protocol

Shared, versioned lifecycle messages for the Obsidian DeepHarness Bridge and DSH-side adapters. The protocol is intentionally narrow: identity, status, lease-scoped loopback browser origins, the current authenticated DSH Viewer URL, drain, and resume. Browser origins and the Viewer target disappear when their controller lease expires or is released. The protocol does not expose plugin installation, unload, filesystem, or command execution.
