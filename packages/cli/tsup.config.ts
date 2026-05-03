import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  outExtension: () => ({ js: ".js" }),
  clean: true,
  sourcemap: false,
  splitting: false,
  bundle: true,
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
});
