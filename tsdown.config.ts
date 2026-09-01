import type { UserConfig } from "tsdown";

export default {
  entry: { index: "src/index.ts" },
  outDir: "lib",
  format: ["esm"],
  platform: "neutral",
  target: "es2023",
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: { alwaysBundle: ["zod"] },
} satisfies UserConfig;
