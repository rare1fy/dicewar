import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages 部署到 https://rare1fy.github.io/dicewar/ 需要 base='/dicewar/'
// 本地 dev 用 '/' 避免资源路径错乱
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/dicewar/" : "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
}));