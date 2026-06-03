import { getByPath } from './pathUtils.ts'
import type { GooSchemaCondition, GooSchemaNode } from './types.ts'

type ConditionData = Record<string, unknown>

export function shouldRenderSchemaNode(node: GooSchemaNode, data: ConditionData): boolean {
	if ('if' in node && !matchesCondition(node.if, data, true)) {
		return false
	}

	if ('unless' in node && !matchesCondition(node.unless, data, false)) {
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
