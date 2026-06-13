import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        command: {
          bg: "#020617",
          panel: "#0f172a",
          card: "#111827",
          line: "#1e293b",
          green: "#34d399",
          amber: "#f59e0b",
          red: "#f87171",
          blue: "#38bdf8",
          violet: "#8b5cf6",
          cyan: "#22d3ee"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 211, 238, 0.12)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.35)",
        neon: "0 0 24px rgba(34, 211, 238, 0.22), 0 0 80px rgba(139, 92, 246, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
