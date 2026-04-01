import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. Allow Vite to use any available port instead of strict 5173 to avoid permission issues
  server: {
    port: 3000,  // 使用不同的端口
    strictPort: false,  // 允许使用其他可用端口
    host: host || '127.0.0.1',  // 绑定到回环地址，避免权限问题
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 3001,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // 4. Optimize deps configuration for libraw-wasm
  optimizeDeps: {
    exclude: ['libraw-wasm']
  },
  worker: {
    format: 'es' as const
  }
}));
