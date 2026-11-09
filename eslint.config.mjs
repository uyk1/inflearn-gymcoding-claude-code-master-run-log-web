import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 관리자 쓰기 모듈(lib/notion/admin)은 관리자 영역 밖에서 import하지 못하게 막습니다.
    // 공개 화면 코드가 쓰기 키와 쓰기 코드에 닿지 않게 하는 안전장치입니다
    files: ["**/*.{js,mjs,ts,tsx}"],
    ignores: ["lib/notion/admin/**", "app/admin/**", "app/api/admin/**", "components/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/notion/admin", "@/lib/notion/admin/**", "**/notion/admin", "**/notion/admin/**", "./admin", "./admin/**"],
              message:
                "lib/notion/admin은 관리자 영역(lib/notion/admin, app/admin, app/api/admin, components/admin)에서만 import할 수 있습니다.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
