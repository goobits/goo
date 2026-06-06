/**
 * @fileoverview ChildContainer utilities - Shared child management for Panel and Folder.
 * Provides folder/controller tracking, add/remove operations, and SSR hydration.
 * @module goobits/utils/_childContainer
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Interface for components that contain child folders and controllers.
 */
export interface ChildContainerHost {
	contentElement: HTMLElement | null
	_folders: HTMLElement[]
	_controllers: HTMLElement[]
	_pendingChildren: HTMLElement[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Track a child element in the appropriate collection.
 * @param host - The container host
 * @param element - Element to track
 */
export function trackChild(host: ChildContainerHost, element: HTMLElement): void {
	const tag = element.tagName?.toLowerCase()
	if (tag === 'goo-folder' || element.classList?.contains('goo-folder')) {
		host._folders.push(element)
	} else if (element.classList?.contains('goo-controller')) {
		host._controllers.push(element)
	}
}

/**
 * Add a child element to the container's content area.
 * @param host - The container host
 * @param element - Element to add
 * @returns The added element
 */
export function addChild<T extends HTMLElement>(host: ChildContainerHost, element: T): T {
	if (host.contentElement) {
		host.contentElement.appendChild(element)
		trackChild(host, element)
	} else {
		// Buffer children until the content region is available.
		host._pendingChildren.push(element)
	}
	return element
}

/**
 * Remove a child element from the container.
 * @param host - The container host
 * @param element - Element to remove
 * @returns Whether element was removed
 */
export function removeChild(host: ChildContainerHost, element: HTMLElement): boolean {
	if (!host.contentElement?.contains(element)) return false

	element.remove()

	// Remove from tracking arrays
	const folderIdx = host._folders.indexOf(element)
	if (folderIdx !== -1) host._folders.splice(folderIdx, 1)

	const ctrlIdx = host._controllers.indexOf(element)
	if (ctrlIdx !== -1) host._controllers.splice(ctrlIdx, 1)

	return true
}

/**
 * Remove all children from the container.
 * @param host - The container host
 */
export function clearChildren(host: ChildContainerHost): void {
	if (host.contentElement) {
		host.contentElement.innerHTML = ''
	}
	host._folders = []
	host._controllers = []
}

/**
 * Hydrate children from pre-rendered DOM and flush pending children.
 * Call this from _hydrateFromDOM() after setting up $content.
 * @param host - The container host
 */
export function hydrateChildren(host: ChildContainerHost): void {
	if (!host.contentElement) return

	// Collect existing children from DOM
	for (const child of host.contentElement.children) {
		trackChild(host, child as HTMLElement)
	}

	// Flush any children that were added before DOM connection
	if (host._pendingChildren?.length) {
		for (const child of host._pendingChildren) {
			if (child?.nodeType) {
				host.contentElement.appendChild(child)
				trackChild(host, child)
			}
		}
		host._pendingChildren = []
	}
}

/**
 * Reset child tracking arrays (call from _destroyElement).
 * @param host - The container host
 */
export function resetChildren(host: ChildContainerHost): void {
	host._folders = []
	host._controllers = []
	host._pendingChildren = []
}
