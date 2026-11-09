import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// Biome is the main linter. ESLint runs only React's own rules, which Biome doesn't have:
// the ones behind the React Compiler (a component breaking them is silently left unoptimised).
export default tseslint.config({
  files: ['apps/web/src/**/*.{ts,tsx}'],
  // shadcn components are generated code, kept as shipped (biome.json relaxes them too).
  ignores: ['apps/web/src/components/ui/**'],
  languageOptions: { parser: tseslint.parser },
  plugins: { 'react-hooks': reactHooks },
  linterOptions: { reportUnusedDisableDirectives: 'off' },
  rules: {
    ...reactHooks.configs.flat.recommended.rules,
    // Biome's useExhaustiveDependencies already covers this one.
    'react-hooks/exhaustive-deps': 'off',
  },
})
