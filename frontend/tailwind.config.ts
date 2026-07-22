import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 배경 스케일 (다크 테마 v2 — 밝기·입체감 조정)
        base: "#131722",
        surface: "#1A1F2D",
        elevated: "#232A3B",
        border: {
          DEFAULT: "#272E3F",
          strong: "#333C52",
          stronger: "#43506C",
        },
        // 텍스트
        fg: {
          DEFAULT: "#ECEEF4",
          muted: "#9AA3B8",
          dim: "#6E7995",
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
      boxShadow: {
        // 입체감: 상단 하이라이트(inset) + 아래 드롭섀도
        card: "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.38)",
        tile: "inset 0 1px 0 rgba(255,255,255,0.05), 0 3px 10px rgba(0,0,0,0.28)",
        lift: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 24px rgba(0,0,0,0.45)",
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
