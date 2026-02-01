import {v4 as uuid} from '@lukeed/uuid';
import {Thunk} from 'react-hook-thunk-reducer';
import {Passage, Story, StoriesAction} from '../stories.types';
import {StoriesState} from '../stories.types';
import {parseLinks} from '../../../util/parse-links';
import {unusedName} from '../../../util/unused-name';
import {copyPassagesToClipboard, getClipboardPassages} from '../../../util/passage-clipboard';

export type PasteMode = 'withoutLinks' | 'withParentLinks' | 'withChildLinks';

/**
 * Stores selected passages to the session clipboard.
 */
export function copyPassages(
	passageIds: string[]
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		const stories = getState();
		const passages: Passage[] = [];

		for (const passageId of passageIds) {
			for (const story of stories) {
				const passage = story.passages.find(p => p.id === passageId);
				if (passage) {
					passages.push(passage);
					break;
				}
			}
		}

		copyPassagesToClipboard(passages);
	};
}

/**
 * Determines which paste modes are available based on the clipboard contents
 * and current story state.
 */
export function getAvailablePasteModes(
	story: Story,
	clipboardPassages: Passage[]
): PasteMode[] {
	if (clipboardPassages.length === 0) {
		return [];
	}

	const modes: PasteMode[] = ['withoutLinks'];
	const clipboardPassageNames = new Set(clipboardPassages.map(p => p.name));

	// Check if any clipboard passages have children (outbound links)
	const hasChildren = clipboardPassages.some(passage =>
		parseLinks(passage.text, true).length > 0
	);

	if (hasChildren) {
		modes.push('withChildLinks');
	}

	// Check if any other passages link to the clipboard passages (inbound links)
	const hasParents = story.passages.some(passage =>
		!clipboardPassageNames.has(passage.name) &&
		parseLinks(passage.text, true).some(linkName =>
			clipboardPassageNames.has(linkName)
		)
	);

	if (hasParents) {
		modes.push('withParentLinks');
	}

	return modes;
}

/**
 * Creates a mapping from old passage names to new passage names.
 */
function createNameMapping(
	clipboardPassages: Passage[],
	story: Story
): Map<string, string> {
	const existingNames = story.passages.map(p => p.name);
	const mapping = new Map<string, string>();

	for (const passage of clipboardPassages) {
		const newName = unusedName(passage.name, existingNames);
		mapping.set(passage.name, newName);
		existingNames.push(newName);
	}

	return mapping;
}

/**
 * Updates link text in a passage, replacing old names with new names.
 */
function updateLinksInText(text: string, nameMapping: Map<string, string>): string {
	let result = text;

	// Process each link replacement
	for (const [oldName, newName] of nameMapping) {
		// Escape special regex characters in names
		const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const escapedNewName = newName.replace(/\$/g, '$$$$'); // Escape $ for replacement

		// Match [[oldName]], [[display|oldName]], [[display->oldName]], [[oldName<-display]]
		// This handles: [[link]], [[display|link]], [[display->link]], [[link<-display]]
		result = result.replace(
			new RegExp(`\\[\\[([^\\[\\]]*)\\]\\]`, 'g'),
			(match) => {
				// Check if this link contains the old name
				if (!match.includes(oldName)) {
					return match;
				}

				// Replace the old name with the new name inside the link
				return match.replace(
					new RegExp(escapedOldName, 'g'),
					escapedNewName
				);
			}
		);
	}

	return result;
}

/**
 * Removes all wiki-style links from text.
 */
function removeLinks(text: string): string {
	// Remove [[...]] patterns entirely
	return text.replace(/\[\[.*?\]\]/g, '');
}

/**
 * Pastes previously copied passages into a story with optional link handling.
 */
export function pastePassages(
	storyId: string,
	pointerX: number,
	pointerY: number,
	pasteMode: PasteMode
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		const stories = getState();
		const story = stories.find(s => s.id === storyId);

		if (!story) {
			throw new Error(`Story with ID "${storyId}" not found`);
		}

		const clipboardPassages = getClipboardPassages();

		if (!clipboardPassages || clipboardPassages.length === 0) {
			throw new Error('No passages in clipboard');
		}

		// Create mapping from old names to new names
		const nameMapping = createNameMapping(clipboardPassages, story);

		// Calculate position offset for each passage
		const minLeft = Math.min(...clipboardPassages.map(p => p.left));
		const minTop = Math.min(...clipboardPassages.map(p => p.top));

		// Create new passages with adjusted positions and names
		const newPassageProps: Partial<Passage>[] = clipboardPassages.map(passage => {
			const newId = uuid();
			const newName = nameMapping.get(passage.name)!;
			const offsetX = passage.left - minLeft;
			const offsetY = passage.top - minTop;

			let newText = passage.text;

			// Handle links based on paste mode
			if (pasteMode === 'withoutLinks') {
				newText = removeLinks(passage.text);
			} else if (pasteMode === 'withParentLinks') {
				newText = updateLinksInText(passage.text, nameMapping);
			}
			// 'withChildLinks' keeps the text as-is

			return {
				id: newId,
				name: newName,
				text: newText,
				left: pointerX + offsetX,
				top: pointerY + offsetY,
				width: passage.width,
				height: passage.height,
				tags: [...passage.tags], // Shallow copy array
				story: storyId
			};
		});

		// Dispatch createPassages action
		dispatch({
			type: 'createPassages',
			props: newPassageProps,
			storyId
		});

		// If using withParentLinks, update passages that link to the copied passages
		if (pasteMode === 'withParentLinks') {
			const passageUpdates: Record<string, Partial<Passage>> = {};
			let hasUpdates = false;

			for (const passage of story.passages) {
				const linkedNames = parseLinks(passage.text, true);

				// Check if any links point to clipboard passages
				let needsUpdate = false;
				for (const linkedName of linkedNames) {
					if (nameMapping.has(linkedName)) {
						needsUpdate = true;
						break;
					}
				}

				if (needsUpdate) {
					const updatedText = updateLinksInText(passage.text, nameMapping);
					passageUpdates[passage.id] = {text: updatedText};
					hasUpdates = true;
				}
			}

			if (hasUpdates) {
				dispatch({
					type: 'updatePassages',
					passageUpdates,
					storyId
				});
			}
		}
	};
}
