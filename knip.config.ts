/** @type {import('knip').KnipConfig} */
export default {
	// Known patterns we accept:
	// - Svelte component barrels expose named aliases for component defaults.
	// - Exported functions and types are public package API not always used internally.
	rules: {
		exports: 'off',
		types: 'off',
		duplicates: 'off'
	}
}
