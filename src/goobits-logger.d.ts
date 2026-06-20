declare module '@goobits/logger' {
	export type LoggerContext = Record<string, unknown>

	export interface Logger {
		readonly name?: string
		child(context: LoggerContext): Logger
		debug(...args: unknown[]): void
		error(...args: unknown[]): void
		info(...args: unknown[]): void
		warn(...args: unknown[]): void
	}

	export type LoggerInterface = Logger

	export type LogLevelName = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE' | 'SILENT'
	export type LogLevelValue = 0 | 1 | 2 | 3 | 4

	export const LEVELS: {
		readonly DEBUG: 0
		readonly INFO: 1
		readonly WARN: 2
		readonly ERROR: 3
		readonly NONE: 4
		readonly SILENT: 4
	}

	export function createLogger(moduleName: string, context?: LoggerContext): Logger
	export function getEffectiveLevel(moduleName: string | null): LogLevelValue
	export function setModuleLevel(moduleName: string, level: LogLevelValue | LogLevelName): void
}
