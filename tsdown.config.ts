import type { UserConfig } from "tsdown";

export default {
  entry: { index: "src/index.ts", data: "src/data.ts" },
  outDir: "lib",
  format: ["esm"],
  platform: "neutral",
  target: "es2023",
  fixedExtension: false,
  dts: false,
  clean: false,
  // Consumers bundle Zod once alongside Core's annotation schemas.
  deps: { neverBundle: ["zod"] },
} satisfies UserConfig;
