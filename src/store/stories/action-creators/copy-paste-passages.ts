import {v4 as uuid} from '@lukeed/uuid';
import {Thunk} from 'react-hook-thunk-reducer';
import {Passage, Story, StoriesAction} from '../stories.types';
import {StoriesState} from '../stories.types';
import {parseLinks} from '../../../util/parse-links';
import {unusedName} from '../../../util/unused-name';
import {copyPassagesToClipboard, getClipboardPassages} from '../../../util/passage-clipboard';

export type PasteMode = 'withoutLinks' | 'withLinks' | 'withInternalLinks';

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
 * Determines which paste modes are available based on the clipboard contents.
 * 'withLinks' is available if any clipboard passage has any links (internal or external).
 * 'withInternalLinks' is available only for multiple cards with internal links.
 */
export function getAvailablePasteModes(
	story: Story,
	clipboardPassages: Passage[]
): PasteMode[] {
	if (clipboardPassages.length === 0) {
		return [];
	}

	const modes: PasteMode[] = ['withoutLinks'];
	const isMultipleCards = clipboardPassages.length > 1;

	// Check if any clipboard passage has any links (outbound)
	const hasAnyLinks = clipboardPassages.some(passage =>
		parseLinks(passage.text, true).length > 0
	);

	if (hasAnyLinks) {
		modes.push('withLinks');
	}

	// Only offer withInternalLinks for multiple cards
	if (isMultipleCards && hasAnyLinks) {
		const clipboardPassageNames = new Set(clipboardPassages.map(p => p.name));
		// Check if there are any internal links (links between copied cards)
		const hasInternalLinks = clipboardPassages.some(passage => {
			const linkedNames = parseLinks(passage.text, true);
			return linkedNames.some(name => clipboardPassageNames.has(name));
		});

		if (hasInternalLinks) {
			modes.push('withInternalLinks');
		}
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
 * Adds new links to a passage for each link pointing to a copied card.
 * Preserves original links while adding new links to the pasted copies.
 * For example, if passage has [[Card A]] and we're pasting Card A as Card A (copy),
 * we add a new link [[Card A (copy)]] after the original.
 */
function addNewLinksForCopies(text: string, nameMapping: Map<string, string>): string {
	let result = text;
	const newLinksToAdd: string[] = [];

	// Find all existing links
	const linkMatches = text.match(/\[\[[^[\]]*]]/g) || [];

	for (const linkMatch of linkMatches) {
		// Extract the link content (without brackets)
		const linkContent = linkMatch.slice(2, -2); // Remove [[ and ]]

		// Parse the link to find the target (the part after | or at the end)
		// Formats: [[Card]], [[display|Card]], [[display->Card]], [[Card<-display]]
		let targetName = linkContent;

		// Handle [[display|target]] format
		if (linkContent.includes('|')) {
			const parts = linkContent.split('|');
			targetName = parts[parts.length - 1]; // Take the last part after |
		}

		// Handle [[display->target]] format
		if (linkContent.includes('->')) {
			const parts = linkContent.split('->');
			targetName = parts[parts.length - 1];
		}

		// Handle [[target<-display]] format
		if (linkContent.includes('<-')) {
			const parts = linkContent.split('<-');
			targetName = parts[0];
		}

		// If this target is being copied, add a new link to the copy
		if (nameMapping.has(targetName)) {
			const newTargetName = nameMapping.get(targetName)!;
			newLinksToAdd.push(`[[${newTargetName}]]`);
		}
	}

	// Append all new links at the end
	if (newLinksToAdd.length > 0) {
		result = result + ' ' + newLinksToAdd.join(' ');
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
 * Determines if a passage is a boundary card: has links to passages NOT in the clipboard.
 */
function isBoundaryCard(
	passage: Passage,
	clipboardPassageNames: Set<string>
): boolean {
	const linkedNames = parseLinks(passage.text, true);
	return linkedNames.some(name => !clipboardPassageNames.has(name));
}

/**
 * Removes external links (links to passages not in the mapping) from text.
 * Internal links (in the mapping) are preserved so they can be relinked.
 */
function removeExternalLinks(
	text: string,
	externalLinks: Set<string>
): string {
	if (externalLinks.size === 0) {
		return text;
	}

	let result = text;

	// For each external link, remove it from the text
	for (const linkName of externalLinks) {
		// Escape special regex characters in the link name
		const escapedName = linkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// Match the link with or without a display text
		const linkRegex = new RegExp(`\\[\\[(${escapedName})(?:\\|([^[\\]]*?))?\\]\\]|\\[\\[([^[\\]]*)\\|(${escapedName})\\]\\]`, 'g');
		result = result.replace(linkRegex, (match, target1, display1, display2) => {
			// If there's a display text (piped), keep it; otherwise remove entirely
			return display1 || display2 || '';
		});
	}

	return result;
}

/**
 * Pastes previously copied passages into a story with optional link handling.
 * When pasting with links:
 * - Single card: preserve all links as-is
 * - Multiple cards with boundary cards:
 *   - Keep ALL external links for boundary cards
 *   - Relink ALL internal links to new card names
 * - Non-boundary cards:
 *   - Remove external links, keep internal links
 *   - Relink internal links to new card names
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
		const clipboardPassageNames = new Set(clipboardPassages.map(p => p.name));

		// Calculate position offset for each passage
		const minLeft = Math.min(...clipboardPassages.map(p => p.left));
		const minTop = Math.min(...clipboardPassages.map(p => p.top));

		const isSingleCard = clipboardPassages.length === 1;

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
			} else if (pasteMode === 'withInternalLinks') {
				// Preserve only internal links (links between copied cards)
				const linkedNames = parseLinks(passage.text, true);
				const externalLinks = new Set(
					linkedNames.filter(name => !clipboardPassageNames.has(name))
				);

				// First relink internal links
				let tempText = updateLinksInText(passage.text, nameMapping);

				// Then remove external links
				tempText = removeExternalLinks(tempText, externalLinks);

				newText = tempText;
			} else if (pasteMode === 'withLinks') {
				if (isSingleCard) {
					// Single card: preserve all links as-is
					newText = passage.text;
				} else {
					// Multiple cards: check if boundary card
					const isBoundary = isBoundaryCard(passage, clipboardPassageNames);
					if (isBoundary) {
						// Boundary card: keep ALL links, but relink internal ones to new names
						newText = updateLinksInText(passage.text, nameMapping);
					} else {
						// Non-boundary card: remove external links, relink internal ones
						const linkedNames = parseLinks(passage.text, true);
						const externalLinks = new Set(
							linkedNames.filter(name => !clipboardPassageNames.has(name))
						);

						// First relink internal links
						let tempText = updateLinksInText(passage.text, nameMapping);

						// Then remove external links
						tempText = removeExternalLinks(tempText, externalLinks);

						newText = tempText;
					}
				}
			}

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

		// If using withLinks, update existing passages that link to the copied passages
		const passageUpdates: Record<string, Partial<Passage>> = {};

		if (pasteMode === 'withLinks') {
			// Get clipboard passage IDs to exclude them from updates
			const clipboardPassageIds = new Set(clipboardPassages.map(p => p.id));

			for (const passage of story.passages) {
				// Skip passages that were in the clipboard (the originals A, B, C)
				if (clipboardPassageIds.has(passage.id)) {
					continue;
				}

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
					// Add new links to the pasted copies while preserving original links
					const updatedText = addNewLinksForCopies(passage.text, nameMapping);
					passageUpdates[passage.id] = {text: updatedText};
				}
			}
		}

		// Use composite action to ensure both creating passages and updating them are undone together
		if (Object.keys(passageUpdates).length > 0) {
			dispatch({
				type: 'createAndUpdatePassages',
				newPassageProps,
				passageUpdates,
				storyId
			});
		} else {
			dispatch({
				type: 'createPassages',
				props: newPassageProps,
				storyId
			});
		}
	};
}
