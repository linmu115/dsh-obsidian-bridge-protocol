# dsh-obsidian-bridge-protocol

当前候选版本 **0.3.3-rc2.1** 针对 DSH **0.1.5-rc.2**。升级说明与验证范围见 CHANGELOG。


Shared, versioned lifecycle messages for the Obsidian DeepHarness Bridge and DSH-side adapters. The protocol is intentionally narrow: identity, status, lease-scoped loopback browser origins, the current authenticated DSH Viewer URL, drain, and resume. Browser origins and the Viewer target disappear when their controller lease expires or is released. The protocol does not expose plugin installation, unload, filesystem, or command execution.
