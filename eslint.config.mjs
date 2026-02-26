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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client
    "src/lib/generated/**",
    // Scratch/utility files
    "write-files.js",
  ]),
  {
    rules: {
      // Project convention: zodResolver(schema) as any, server action casts, etc.
      "@typescript-eslint/no-explicit-any": "warn",
      // Pre-existing unused vars (many across codebase)
      "@typescript-eslint/no-unused-vars": "warn",
      // Unescaped entities in JSX (pre-existing Portuguese text)
      "react/no-unescaped-entities": "warn",
      // React Compiler strict mode — setState in effects (pre-existing patterns)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
