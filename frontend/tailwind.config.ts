import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 배경 스케일 (다크 전용)
        base: "#0A0B0F",
        surface: "#0F1119",
        elevated: "#12141C",
        border: {
          DEFAULT: "#1A1D26",
          strong: "#1F2330",
          stronger: "#2A2F3D",
        },
        // 텍스트
        fg: {
          DEFAULT: "#E6E8EE",
          muted: "#8B93A3",
          dim: "#5B6472",
        },
        // 방향성 (한국식: 상방=빨강, 하방=파랑)
        bull: {
          DEFAULT: "#E5484D",
          fg: "#FF7A85",
          soft: "#E5484D14",
          softer: "#E5484D22",
          border: "#E5484D33",
        },
        bear: {
          DEFAULT: "#3E63DD",
          fg: "#5B7CFF",
          soft: "#3E63DD14",
          softer: "#3E63DD22",
          border: "#3E63DD33",
        },
        warn: {
          DEFAULT: "#F5A524",
          soft: "#F5A52414",
          border: "#F5A52433",
        },
        // MA 라인 색상
        ma5: "#F5A524",
        ma10: "#F97066",
        ma20: "#7DD87D",
        ma60: "#5B7CFF",
        ma120: "#C084FC",
        ma200: "#8B93A3",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      fontFeatureSettings: {
        default: "'ss03','tnum'",
      },
      borderRadius: {
        card: "16px",
        chip: "10px",
      },
      letterSpacing: {
        tightish: "-0.01em",
        tight2: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
