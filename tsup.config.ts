import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "plugins/index": "src/plugins/index.ts",
    "platforms/index": "src/platforms/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: "dist",
  target: "node20",
  shims: true,
  skipNodeModulesBundle: true,
  external: [
    // Peer dependencies
    "@supabase/supabase-js",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
      "@/core": "./src/core",
      "@/platforms": "./src/platforms",
      "@/plugins": "./src/plugins",
      "@/database": "./src/database",
      "@/types": "./src/types",
      "@/utils": "./src/utils",
    };
  },
});
