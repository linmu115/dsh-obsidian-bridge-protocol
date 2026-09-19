> **停止维护 / Archived — 2026-09-19**
> 本仓库已被统一桥项目 [dsh-obsidian-bridge](https://github.com/linmu115/dsh-obsidian-bridge) 替代，不再发布更新或接受新功能。
> 新问题和改动请转到新仓库。历史源码、许可证和以下旧版说明保留供回查，旧版安装说明不再作为当前推荐。
> Obsidian 侧插件 [obsidian-deepharness-bridge](https://github.com/linmu115/obsidian-deepharness-bridge) 继续维护。Protocol 源码转到新仓库 `vendor/protocol`；Suite 仅保留历史组合规格。

# DSH Obsidian Bridge Protocol

当前版本 **0.3.3-rc2.1**，用于 **DSH 0.1.5-rc.2** 配套的 Obsidian 引用系统。这是共享类型与数据校验库，供 DSH 与 Obsidian 两端对同一条消息作一致解释；它本身没有界面，也不启动 Bridge 服务。

日常安装与使用请从 [Obsidian Session Reference Suite](https://github.com/linmu115/dsh-obsidian-session-reference-suite/blob/codex/rc2-session-context-graph/README.md) 开始。本包作为成员依赖安装，不需要另建一个 DSH 根 Bundle 或 Obsidian 插件实例。

## 两个导出入口

| 入口 | 负责的约定 | 主要消费者 |
| --- | --- | --- |
| `dsh-obsidian-bridge-protocol` | Bridge 身份、状态、控制握手、租约、浏览器 origin、当前 Viewer 地址、排空与恢复请求 | DSH Bridge Lifecycle、Obsidian Companion 的 Bridge 服务 |
| `dsh-obsidian-bridge-protocol/data` | 贴纸、伴生会话笔记、回链、打开笔记、会话深链，以及旧引用迁移消息 | Reference Adapter、Sticker Board、Obsidian Companion |

协议版本与包版本分别管理：**Lifecycle 3、Sticker 1**。当前组合的 **Annotation 2** 类型仍由 Annotation Core 定义，本库不复制它的注释模型。旧引用消息保留用于兼容和迁移，不表示新引用应绕过 Core 的准备、提交与删除流程。

## 连接与目标身份

控制协议用 Bridge 的 `instanceId` 和每次启动生成的 `bootId` 区分服务及启动代次；握手可携带 `dshInstanceId` 指明目标 DSH 实例。续租、排空和恢复请求都绑定预期的启动身份，避免把旧连接的操作应用到另一次启动。

控制方通过租约提供允许访问的本机浏览器 origin 和可选的当前 DSH Viewer 地址。origin 只接受完整的本机 HTTP origin；Viewer 地址只接受本机根 URL，可携带一个启动 token。服务端与 Lifecycle 负责落实租约到期、释放及权限检查；本包负责消息形状和字段校验。

状态包括 `STARTING`、`READY`、`DEGRADED`、`DRAINING`、`DRAINED` 和客户端观察到的 `OFFLINE`。`acceptsBridgeWork()` 仅在 READY 或 DEGRADED 时返回真。协议不提供插件安装、卸载、任意文件访问或命令执行能力。

数据协议可以保留以下定位信息：

- `dshInstanceId`：DSH 实例身份。
- `logicalSessionId` / `logicalAnchorId`：Maintenance 稳定逻辑身份。
- `sessionId` / `anchorId` 及可选 legacy 字段：原生定位和兼容信息。
- 深链消息中的 `targetSurfaceId`：指定接收页面；`actionId` 用于标识操作。

历史记录可以没有新增的可选字段，解析不会凭空为它们指定一个实例。身份解析、目标校验、幂等处理及实际导航由消费者完成。

## 与当前引用功能的关系

Obsidian 笔记选段由配置的内嵌 DSH Viewer 定向领取，独立窗口不会抢走新投递。这项行为由 Companion、Lifecycle、Reference Adapter 和 Core 的运行时共同完成，不能只安装本库就获得。

“打开关联笔记”只导航，“引用到本轮”才创建待发送引用。引用气泡、提交回链、双向删除、共享 Owned 标记最后一个使用方解除后的清理，均由各自组件落实。本库提供它们使用的部分共同消息，不负责保存引用状态或修改笔记正文。

当前 Maintenance 集成中，新增及已迁移的贴纸、知识链接等结构以 Maintenance 为真源；Vault 继续管理笔记正文。`session-note` 等兼容传输类型不改变这项数据归属，也不是另一套会话真源。

完整组合的版本和配置以 Suite 的成员清单为准；当前消费者可以在不改变这些协议版本的情况下发布功能修复。

## 开发使用

本包导出 TypeScript 类型和 Zod 校验器。以下示例只解析状态，不建立连接或取得租约：

```ts
import {
  BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
  acceptsBridgeWork,
  bridgeStatusSchema,
} from "dsh-obsidian-bridge-protocol";

const status = bridgeStatusSchema.parse({
  lifecycleProtocolVersion: BRIDGE_LIFECYCLE_PROTOCOL_VERSION,
  instanceId: "example-vault",
  bootId: "550e8400-e29b-41d4-a716-446655440000",
  bridgeVersion: "0.6.4-rc2.6",
  startedAt: 1,
  state: "READY",
  stateChangedAt: 2,
  activeLeaseCount: 1,
  inFlightRequestCount: 0,
});

const canAcceptWork = acceptsBridgeWork(status); // true
```

收到数据消息时，从 `/data` 使用 `parseBridgeMessage(value)`，或按具体接口选用 `stickerBacklinkTargetSchema` 等校验器。校验不通过时由调用方处理错误，不应把无效对象当作成功结果继续执行。

## 从源码构建

[package.json](package.json) 指定 pnpm 11.19.0，运行时依赖为 Zod 4.4.3。本包将 Zod 保留为外部依赖，使应用构建可以统一使用同一份校验运行时。

在本仓库目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm pack --pack-destination .artifacts
```

`test` 和 `pack` 会先构建，输出位于 `lib`；本地打包生成 `.artifacts/dsh-obsidian-bridge-protocol-0.3.3-rc2.1.tgz`。源码版本和 `publishConfig` 不代表该候选包已发布到 npm 或 GitHub Releases；部署使用实际构建且与 Suite 相符的构件。

现有测试覆盖状态校验、本机 origin 和 Viewer 约束、目标页面身份、逻辑/旧身份保留及历史消息兼容。它们不替代 Bridge 服务的租约测试和两端实际点击验收。

实现见 [控制协议](src/index.ts)和[数据协议](src/data.ts)，测试见[控制协议测试](tests/protocol.test.ts)和[数据协议测试](tests/data.test.ts)，版本变化见 [CHANGELOG](CHANGELOG.md)。

## Vault binding and discovery (0.4.0-rc2.1)

`./binding` exports bindingProtocolVersion 1 schemas, stable instance/profile targets, revisioned Vault binding snapshots, CAS/idempotent change requests, bound job routes and public identity contracts. `vault-instance-binding-v1` is required to opt in; unchanged lifecycle 3/sticker 1 versions alone do not imply multi-Vault support. Optional `vaultId` in legacy sticker records identifies only their direct note association, not global managed sticker ownership.

`./discovery` is Node-only and exports `getBridgeDiscoveryDirectory`, `writeDiscoveryRecord`, `readDiscoveryRecords`, and `removeDiscoveryRecord`. Default storage is `~/.dsh/obsidian-bridge/discovery-v1`, overridable with `DSH_OBSIDIAN_DISCOVERY_DIR`. Publish only strict identity metadata: HTTP loopback origin, runtime boot/publisher identity, capabilities and bounded expiry. Authenticated Viewer URLs and tokens are rejected by the schemas. Readers discard expired, oversized, malformed and non-regular entries; conflicting stable identities are returned separately rather than selected. Entries are hints: consumers must verify live identity before connecting, and discovery never grants binding authority.

Protocol verification: TypeScript/build and 13 tests across 3 files pass. Tests use temporary directories only. No user registry, Vault or deployed runtime is modified.
