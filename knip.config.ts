/** @type {import('knip').KnipConfig} */
export default {
	// Known patterns we accept:
	// - Duplicate exports: named + default for ES module flexibility.
	// - Exported functions and types: public package API not always used internally.
	rules: {
		exports: 'off',
		types: 'off',
		duplicates: 'off'
	}
}
