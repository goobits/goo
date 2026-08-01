/** @type {import('knip').KnipConfig} */
export default {
	// Known patterns we accept:
	// - Svelte component barrels re-export default components under their public names.
	// - Exported functions and types are public package API not always used internally.
	rules: {
		exports: 'off',
		types: 'off',
		duplicates: 'off'
	}
}
