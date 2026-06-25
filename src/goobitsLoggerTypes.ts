declare module '@goobits/logger' {
	export type LoggerContext = Record<string, unknown>

	export interface Logger {
		child(context: LoggerContext): Logger
		debug(...args: unknown[]): void
		error(...args: unknown[]): void
		info(...args: unknown[]): void
		warn(...args: unknown[]): void
	}

	export function createLogger(moduleName: string, context?: LoggerContext): Logger
}
