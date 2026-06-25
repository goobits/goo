declare module '@goobits/logger' {
	export type GoobitsLogger = {
		debug: (...args: unknown[]) => void
		info: (...args: unknown[]) => void
		warn: (...args: unknown[]) => void
		error: (...args: unknown[]) => void
	}

	export const createLogger: (_name: string) => GoobitsLogger
}
