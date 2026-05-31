/**
 * @fileoverview GooDialogManager - Manages dialog queue and z-index stacking.
 * @module goobits/dialog/GooDialogManager
 */

const BASE_Z_INDEX = 99999

/** Minimal dialog surface the manager needs to stack and close dialogs. */
export interface ManagedDialog {
	close(): Promise<void>
}

/**
 * Manages multiple dialogs, handling z-index stacking and queue.
 */
class GooDialogManager {
	#dialogs: ManagedDialog[] = []

	/** Register a dialog so it participates in stacking and close-top handling. */
	register(dialog: ManagedDialog): void {
		if (!this.#dialogs.includes(dialog)) {
			this.#dialogs.push(dialog)
		}
	}

	/** Remove a dialog from the stack. */
	unregister(dialog: ManagedDialog): void {
		const index = this.#dialogs.indexOf(dialog)
		if (index !== -1) {
			this.#dialogs.splice(index, 1)
		}
	}

	/** Compute the stacking z-index for a dialog based on its position in the stack. */
	getZIndex(dialog: ManagedDialog): number {
		const index = this.#dialogs.indexOf(dialog)
		return BASE_Z_INDEX + (index >= 0 ? index * 2 : this.#dialogs.length * 2)
	}

	/** Snapshot of the currently open dialogs, ordered bottom to top. */
	getDialogs(): ManagedDialog[] {
		return [ ...this.#dialogs ]
	}

	/** The topmost (most recently opened) dialog, if any. */
	getTopDialog(): ManagedDialog | undefined {
		return this.#dialogs[this.#dialogs.length - 1]
	}

	/** Whether any dialog is currently open. */
	hasOpenDialogs(): boolean {
		return this.#dialogs.length > 0
	}

	/** Close every open dialog. */
	async closeAll(): Promise<void> {
		const dialogs = [ ...this.#dialogs ]
		await Promise.all(dialogs.map(dialog => dialog.close()))
	}

	/** Close the topmost dialog, if any. */
	async closeTop(): Promise<void> {
		await this.getTopDialog()?.close()
	}
}

// Singleton instance
export const dialogManager = new GooDialogManager()

// Also export class for testing
export { GooDialogManager }
