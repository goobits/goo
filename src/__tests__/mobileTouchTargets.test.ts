import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const gooSrcDir = resolve(currentDir, '..')

const coarsePointerTargets = [
	[ 'button/GooButton.css', 'button controls', /\.goo-button[\s\S]*(?:44px|2\.75rem)/ ],
	[ 'button-group/GooButtonGroup.css', 'button group controls', /--goo-button-group-height:\s*max\(var\(--goo-theme-control-height-touch,\s*44px\)/ ],
	[ 'dialog/GooDialog.css', 'dialog controls', /\.goo-dialog__close\s*\{[\s\S]*min-height:\s*44px[\s\S]*min-width:\s*44px/ ],
	[ 'schema/GooSchema.css', 'schema controls', /--goo-theme-control-height-md:\s*2\.75rem/ ],
	[ 'select/GooSelect.css', 'select and menu controls', /--goo-select-height:\s*var\(--goo-theme-control-height-touch,\s*44px\)/ ]
] as const

describe('Goo mobile touch target contracts', () => {
	it.each(coarsePointerTargets)('%s keeps coarse pointer controls touch-sized', async(file, label, contract) => {
		const source = await readFile(resolve(gooSrcDir, file), 'utf8')

		expect(source, label).toContain('@media (hover: none) and (pointer: coarse)')
		expect(source, label).toMatch(contract)
	})
})
