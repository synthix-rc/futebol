import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        resenha: {
          navy: "#142F47",
          navyDark: "#0E2234",
          blue: "#31688E",
          blueLight: "#EBF2F7",
          cream: "#F4F0E8",
          sand: "#EAE3D5",
          border: "#DDD5C7",
          gold: "#8C5E2A",
          goldBg: "#F9F3EB",
        },
      },
    },
  },
  plugins: [],
};
export default config;
