import type { Config } from "tailwindcss";
import preset from "@emerald/configs/tailwind/preset";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
};

export default config;
