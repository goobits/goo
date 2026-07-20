import { getByPath } from './pathUtils.ts'
import type { GooSchemaChoiceOption, GooSchemaCondition, GooSchemaNode } from './types.ts'

type ConditionData = Record<string, unknown>

export function shouldRenderSchemaNode(node: GooSchemaNode, data: ConditionData): boolean {
	return shouldRenderSchemaItem(node, data)
}

/** Test the shared `if` and `unless` contract used by nodes and choices. */
export function shouldRenderSchemaItem(
	item: GooSchemaNode | GooSchemaChoiceOption,
	data: ConditionData
): boolean {
	if ('if' in item && !matchesCondition(item.if, data, true)) {
		return false
	}

	if ('unless' in item && !matchesCondition(item.unless, data, false)) {
		return false
	}

	return true
}

function matchesCondition(
	condition: GooSchemaCondition | undefined,
	data: ConditionData,
	expected: boolean
): boolean {
	if (!condition) {
		return true
	}

	if (typeof condition === 'string') {
		return Boolean(getByPath(data, condition)) === expected
	}

	const actualValue = getByPath(data, condition.path)
	if ('equals' in condition) {
		return Object.is(actualValue, condition.equals) === expected
	}
	if ('notEquals' in condition) {
		return (!Object.is(actualValue, condition.notEquals)) === expected
	}

	return Boolean(actualValue) === expected
}
