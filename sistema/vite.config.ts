import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Split vendors into stable chunks so browser cache survives app updates.
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react/jsx-runtime", "react-router-dom"],
          "supabase": ["@supabase/supabase-js"],
          "query": ["@tanstack/react-query", "@tanstack/query-core"],
          // Bibliotecas pesadas isoladas: só entram na rede quando a rota/ação
          // que as usa é carregada dinamicamente.
          "react-pdf": ["@react-pdf/renderer"],
          "charts": ["recharts"],
          "motion": ["framer-motion"],
          "radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
