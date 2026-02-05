import {Thunk} from 'react-hook-thunk-reducer';
import {
	CreatePassagesAction,
	StoriesState,
	Story
} from '../stories.types';
import {passageDefaults} from '../defaults';
import {rectsIntersect} from '../../../util/geometry';
import {updatePassage} from './update-passage';

export interface CreateBatchParams {
	count: number;
	baseName: string;
	orientation: 'horizontal' | 'vertical';
	autoLink: boolean;
	centerX: number;
	centerY: number;
	sourcePassageId?: string; // If creating from an existing passage
	linkToSourceCard?: boolean; // Link new cards TO the source passage
	linkInternalChain?: boolean; // Link new cards to each other (vertical only)
}

interface NewPassageData {
	name: string;
	left: number;
	top: number;
	text?: string;
}

/**
 * Creates multiple passages in a batch with optional auto-linking.
 * Returns a thunk that dispatches createPassages and optionally updatePassage actions.
 */
export function createBatchPassages(
	story: Story,
	params: CreateBatchParams
): Thunk<StoriesState, CreatePassagesAction> {
	return dispatch => {
		const defs = passageDefaults();
		const passageGap = 25;
		const {count, baseName, orientation, centerX, centerY, sourcePassageId, linkToSourceCard, linkInternalChain} = params;

		// Calculate initial position
		let startX = centerX;
		const startY = centerY;

		if (orientation === 'horizontal') {
			// For horizontal, center the entire batch horizontally
			const totalWidth = count * defs.width + (count - 1) * passageGap;
			startX = centerX - totalWidth / 2;
		}

		// Create passage data for all new cards
		const newPassages: NewPassageData[] = [];
		let currentX = startX;
		let currentY = startY;

		for (let i = 1; i <= count; i++) {
			const bounds = {
				height: defs.height,
				left: currentX,
				top: currentY,
				width: defs.width
			};

			// Apply grid snapping if needed
			if (story.snapToGrid) {
				bounds.left = Math.round(bounds.left / passageGap) * passageGap;
				bounds.top = Math.round(bounds.top / passageGap) * passageGap;
			}

			// Move out of overlaps
			const needsMoving = () =>
				story.passages.some(passage => rectsIntersect(passage, bounds)) ||
				newPassages.some(p => rectsIntersect({...p, height: defs.height, width: defs.width}, bounds));

			while (needsMoving()) {
				if (orientation === 'horizontal') {
					// Try rightward
					bounds.left += defs.width + passageGap;
				} else {
					// Try downward
					bounds.top += defs.height + passageGap;
				}

				if (!needsMoving()) {
					break;
				}

				// If still overlapping, move down and reset horizontal
				bounds.top += defs.height + passageGap;
				if (orientation === 'horizontal') {
					bounds.left = startX;
				}
			}

		// Generate unique passage name
		let passageName = `${baseName} ${i}`;
		const nameExists = (name: string) => 
			story.passages.some(p => p.name === name) || 
			newPassages.some(p => p.name === name);
		
		// If name exists, keep appending the same digit until unique
		while (nameExists(passageName)) {
			passageName = passageName + i;
		}

		newPassages.push({
			name: passageName,
			left: bounds.left,
			top: bounds.top
		});

		// Update position for next iteration
		if (orientation === 'horizontal') {
			currentX = bounds.left + defs.width + passageGap;
		} else {
			currentY = bounds.top + defs.height + passageGap;
		}
	}

	const newPassageNames = newPassages.map(p => p.name);

	// Add source passage linking before creating passages (if enabled)
	if (linkToSourceCard && sourcePassageId) {
		const sourcePassage = story.passages.find(p => p.id === sourcePassageId);
		if (sourcePassage) {
			// Update the source passage to link to new passages
			let linkText = '';
			if (orientation === 'horizontal') {
				// All new cards link from source
				linkText = newPassageNames.map(name => `[[${name}]]`).join(' ');
			} else {
				// Only first card links from source
				linkText = `[[${newPassageNames[0]}]]`;
			}
			const newText = sourcePassage.text + '\n' + linkText;
			dispatch(updatePassage(story, sourcePassage, {text: newText}, {dontUpdateOthers: true}) as any);
		}
	}

	// Add internal chain linking before creating passages (if enabled for vertical)
		if (orientation === 'vertical' && linkInternalChain) {
			for (let i = 0; i < newPassages.length - 1; i++) {
				const nextPassageName = newPassages[i + 1].name;
				const linkText = '\n[[' + nextPassageName + ']]';
				newPassages[i].text = (newPassages[i].text || '') + linkText;
			}
		}

		// Dispatch action to create all passages
		dispatch({
			type: 'createPassages',
			storyId: story.id,
			props: newPassages
		});

		return {
			newPassageNames,
			sourcePassageId
		};
	};
}
