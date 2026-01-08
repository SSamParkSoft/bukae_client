import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "apps/**/.next/**",
    "apps/bukae_viewer/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // TODO: remove after step3 refactor 완료
    "apps/bukae_creator/app/video/create/step3/page.tsx",
  ]),
]);

export default eslintConfig;
