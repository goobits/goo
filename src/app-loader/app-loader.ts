import { createGooProgressRingTimer, type GooProgressRingTimer } from '../progress-ring/index.ts'

/** URL entry accepted by Goo's app loader. */
export type GooAppLoaderUrl = string | {
	bytes?: number
	url: string
}

/** Progress timer contract used by Goo's app loader. */
export interface GooAppLoaderTimer {
	setProgress(progress: number): void
}

/** Options for loading a batch of JavaScript and CSS resources. */
export interface GooAppLoaderOptions<Timer extends GooAppLoaderTimer = GooAppLoaderTimer> {
	createTimer?: () => Timer
}

/** Loads JavaScript and CSS resources with aggregate progress feedback. */
export async function AppLoader<Timer extends GooAppLoaderTimer = GooProgressRingTimer>(
	urls: GooAppLoaderUrl[],
	{ createTimer }: GooAppLoaderOptions<Timer> = {}
): Promise<Timer> {
	await waitForBodyAndHead()

	const timer = (createTimer ? createTimer() : createGooProgressRingTimer()) as Timer
	insertFiles(await loadUrls(urls, timer))

	return timer
}

/** Alias for callers that prefer Goo-prefixed API names. */
export const createGooAppLoader = AppLoader

async function loadUrls(urls: GooAppLoaderUrl[], timer: GooAppLoaderTimer): Promise<Record<string, string>> {
	if (!Array.isArray(urls)) {
		throw new TypeError('Goo AppLoader expects an array of URLs.')
	}

	const state = urls.map(normalizeUrl)
	const contents = await Promise.all(state.map((entry, index) => (
		loadText(entry.url, {
			totalBytes: entry.bytes,
			onProgress(progress, totalBytes) {
				state[index].progress = progress
				state[index].bytes ||= totalBytes
				timer.setProgress(calculateTotalProgress(state))
			}
		})
	)))

	timer.setProgress(0.99)
	globalThis.setTimeout(() => timer.setProgress(1), 250)

	return Object.fromEntries(state.map((entry, index) => [ entry.url, contents[index] ]))
}

function insertFiles(files: Record<string, string>): void {
	for (const [ path, content ] of Object.entries(files)) {
		if (path.includes('.js')) {
			const script = document.createElement('script')
			script.textContent = content
			document.head.append(script)
			script.remove()
			continue
		}

		const style = document.createElement('style')
		style.textContent = content.split('../').join('./')
		document.head.append(style)
	}
}

function loadText(
	url: string,
	{
		onProgress,
		totalBytes = 0
	}: {
		onProgress(progress: number, totalBytes: number): void
		totalBytes?: number
	}
): Promise<string> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', url, true)
		xhr.onload = () => {
			if (xhr.status === 200 || xhr.status === 304 || xhr.status === 308 || xhr.status === 0) {
				resolve(xhr.responseText)
				return
			}

			const error = new Error(`Request: ${ url }`) as Error & { status: number }
			error.status = xhr.status
			reject(error)
		}
		xhr.onerror = () => reject(new Error(`Request: ${ url }`))
		xhr.onprogress = event => {
			const nextTotalBytes = event.lengthComputable ? event.total : totalBytes
			onProgress(event.lengthComputable ? event.loaded / event.total : 0, nextTotalBytes)
		}
		xhr.send()
	})
}

function calculateTotalProgress(state: Array<{ bytes: number; progress: number }>): number {
	const hasBytes = state.every(entry => entry.bytes > 0)
	if (!hasBytes) {
		return Math.min(0.99, state.reduce((total, entry) => total + entry.progress, 0) / state.length)
	}

	const receivedBytes = state.reduce((total, entry) => total + entry.progress * entry.bytes, 0)
	const totalBytes = state.reduce((total, entry) => total + entry.bytes, 0)
	return Math.min(0.99, receivedBytes / totalBytes)
}

function normalizeUrl(value: GooAppLoaderUrl): { bytes: number; progress: number; url: string } {
	if (typeof value === 'string') {
		return {
			bytes: 0,
			progress: 0,
			url: value
		}
	}

	return {
		bytes: value.bytes ?? 0,
		progress: 0,
		url: value.url
	}
}

function waitForBodyAndHead(): Promise<void> {
	return new Promise(resolve => {
		if (document.body && document.head) {
			resolve()
			return
		}

		const interval = globalThis.setInterval(() => {
			if (document.body && document.head) {
				globalThis.clearInterval(interval)
				resolve()
			}
		}, 1)
	})
}
