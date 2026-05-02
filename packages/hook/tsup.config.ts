import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/pretool.ts"],
  format: ["esm"],
  outExtension: () => ({ js: ".js" }),
  clean: true,
  sourcemap: false,
  minify: false,
  splitting: false,
  bundle: true,
  noExternal: [/.*/],
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
});
