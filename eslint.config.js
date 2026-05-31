import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'build/**',
			'.turbo/**',
			'.svelte-kit/**',
			'coverage/**',
			'playwright-report/**',
			'test-results/**'
		]
	},
	js.configs.recommended,
	{
		files: [ '**/*.js', '**/*.mjs', '**/*.ts' ],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'@stylistic': stylistic,
			'simple-import-sort': simpleImportSort
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser: tseslint.parser,
			globals: {
				afterAll: 'readonly',
				afterEach: 'readonly',
				beforeAll: 'readonly',
				beforeEach: 'readonly',
				cancelAnimationFrame: 'readonly',
				clearInterval: 'readonly',
				clearTimeout: 'readonly',
				console: 'readonly',
				customElements: 'readonly',
				describe: 'readonly',
				document: 'readonly',
				Element: 'readonly',
				Event: 'readonly',
				expect: 'readonly',
				HTMLElement: 'readonly',
				Image: 'readonly',
				it: 'readonly',
				KeyboardEvent: 'readonly',
				location: 'readonly',
				MouseEvent: 'readonly',
				navigator: 'readonly',
				PointerEvent: 'readonly',
				process: 'readonly',
				requestAnimationFrame: 'readonly',
				setInterval: 'readonly',
				setTimeout: 'readonly',
				test: 'readonly',
				vi: 'readonly',
				window: 'readonly'
			}
		},
		rules: {
			'@stylistic/array-bracket-spacing': [ 'warn', 'always' ],
			'@stylistic/arrow-parens': [ 'warn', 'as-needed' ],
			'@stylistic/comma-dangle': [ 'warn', 'never' ],
			'@stylistic/comma-spacing': [ 'warn', { before: false, after: true } ],
			'@stylistic/indent': [ 'warn', 'tab' ],
			'@stylistic/object-curly-spacing': [ 'warn', 'always' ],
			'@stylistic/quotes': [ 'warn', 'single', { avoidEscape: true } ],
			'@stylistic/semi': [ 'warn', 'never' ],
			'@stylistic/space-before-function-paren': [ 'warn', 'never' ],
			'@stylistic/template-curly-spacing': [ 'warn', 'always' ],
			'no-console': 'off',
			'no-debugger': 'warn',
			'no-redeclare': [ 'error', { builtinGlobals: false } ],
			'no-unused-vars': [ 'warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' } ],
			'no-var': 'error',
			'prefer-const': 'warn',
			'simple-import-sort/exports': 'warn',
			'simple-import-sort/imports': 'warn'
		}
	},
	{
		files: [ '**/*.ts' ],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-redeclare': [ 'error', { ignoreDeclarationMerge: true } ],
			'@typescript-eslint/no-unused-vars': [ 'warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' } ],
			'no-redeclare': 'off',
			'no-undef': 'off',
			'no-unused-vars': 'off'
		}
	},
	{
		files: [ '**/*.d.ts' ],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	}
]
