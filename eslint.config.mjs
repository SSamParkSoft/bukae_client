import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const step3LegacyBridgeFiles = [
  "apps/bukae_creator/app/video/create/_step3-components/index.ts",
  "apps/bukae_creator/app/video/create/_hooks/step3/index.ts",
  "apps/bukae_creator/app/video/create/_utils/step3/index.ts",
];

const legacyStep3ImportRestrictions = [
  {
    group: ["@/app/video/create/_step3-components/**"],
    message: 'Use "@/app/video/create/step3/shared/ui" instead.',
  },
  {
    group: ["@/app/video/create/_hooks/step3/**"],
    message: 'Use "@/app/video/create/step3/shared/hooks" instead.',
  },
  {
    group: ["@/app/video/create/_utils/step3/**"],
    message: 'Use "@/app/video/create/step3/shared/model" instead.',
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["apps/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    files: ["apps/**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-empty": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: step3LegacyBridgeFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: legacyStep3ImportRestrictions,
        },
      ],
    },
  },
  {
    files: ["apps/bukae_creator/app/video/create/fast/step3/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...legacyStep3ImportRestrictions,
            {
              group: ["@/app/video/create/pro/step3/**"],
              message:
                "Fast Step3 modules must not import Pro Step3 modules directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/bukae_creator/app/video/create/pro/step3/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...legacyStep3ImportRestrictions,
            {
              group: ["@/app/video/create/fast/step3/**"],
              message:
                "Pro Step3 modules must not import Fast Step3 modules directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/bukae_creator/app/video/create/step3/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...legacyStep3ImportRestrictions,
            {
              group: ["@/app/video/create/fast/step3/**"],
              message:
                "Shared Step3 modules must remain track-agnostic and cannot import Fast Step3 modules.",
            },
            {
              group: ["@/app/video/create/pro/step3/**"],
              message:
                "Shared Step3 modules must remain track-agnostic and cannot import Pro Step3 modules.",
            },
          ],
        },
      ],
    },
  },
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
