import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/sensecheck/schema.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
});
