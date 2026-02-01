import {Passage} from '../store/stories';

/**
 * Session-only clipboard for copying and pasting passages.
 * Stores copied passages in memory during the current session.
 */
interface ClipboardData {
	type: 'passage';
	passages: Passage[];
}

let clipboard: ClipboardData | null = null;

/**
 * Stores passages to the session clipboard.
 */
export function copyPassagesToClipboard(passages: Passage[]): void {
	if (passages.length === 0) {
		clipboard = null;
		return;
	}

	clipboard = {
		type: 'passage',
		passages: passages.slice() // Shallow copy array
	};
}

/**
 * Retrieves passages from the session clipboard.
 * Returns null if clipboard is empty or doesn't contain passages.
 */
export function getClipboardPassages(): Passage[] | null {
	if (!clipboard || clipboard.type !== 'passage') {
		return null;
	}

	return clipboard.passages;
}

/**
 * Clears the session clipboard.
 */
export function clearClipboard(): void {
	clipboard = null;
}

/**
 * Checks if the clipboard contains passages.
 */
export function hasClipboardPassages(): boolean {
	return clipboard !== null && clipboard.type === 'passage' && clipboard.passages.length > 0;
}
