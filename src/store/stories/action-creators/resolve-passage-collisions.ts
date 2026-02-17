import {Thunk} from 'react-hook-thunk-reducer';
import {Story, StoriesAction, StoriesState} from '../stories.types';
import {updatePassage} from './update-passage';
import {DialogsAction} from '../../../dialogs/dialogs.types';

/**
 * Check if two rectangular cards overlap on both X and Y axes.
 */
function cardsOverlap(
	a: {left: number; top: number; width: number; height: number},
	b: {left: number; top: number; width: number; height: number},
	padding: number = 0
): boolean {
	const aRight = a.left + a.width;
	const aBottom = a.top + a.height;
	const bRight = b.left + b.width;
	const bBottom = b.top + b.height;

	// Cards overlap if they overlap on BOTH axes
	const xOverlap = a.left < bRight + padding && aRight + padding > b.left;
	const yOverlap = a.top < bBottom + padding && aBottom + padding > b.top;

	return xOverlap && yOverlap;
}

/**
 * Resolves collisions between cards by repositioning them.
 * Sorts cards by Y position, then ensures each card doesn't overlap with previous ones.
 */
export function resolvePassageCollisions(
	stories: Story[],
	story: Story,
	dispatchDialog?: React.Dispatch<DialogsAction>,
	relocatingDialogComponent?: React.ComponentType<any>
): Thunk<StoriesState, StoriesAction> {
	return (dispatch) => {
		console.log('[Collision Resolution] Starting...');
		
		// Show dialog if dispatch and component provided
		let dialogIndex: number | undefined;
		if (dispatchDialog && relocatingDialogComponent) {
			console.log('[Collision Resolution] Showing dialog');
			// Add dialog - we need to track which index it gets
			const currentLength = 0; // We'll assume it goes to the end
			dispatchDialog({
				type: 'addDialog',
				component: relocatingDialogComponent
			});
			dialogIndex = currentLength;
		}
		
		// Use setTimeout to allow React to render the indicator before starting work
		setTimeout(() => {
			// Get all passages and sort by Y coordinate (top to bottom)
			const allCards = story.passages;
		
		console.log(`[Collision Resolution] Processing ${allCards.length} cards`);
		
		if (allCards.length === 0) {
			console.log('[Collision Resolution] No cards, nothing to resolve');
			return;
		}

		// Sort all cards by Y coordinate (top to bottom), then by X (left to right)
		const sortedCards = [...allCards].sort((a, b) => {
			const yDiff = a.top - b.top;
			return yDiff !== 0 ? yDiff : a.left - b.left;
		});
		
		console.log('[Collision Resolution] Sorted cards:');
		sortedCards.forEach(p => {
			console.log(`  - "${p.name}": (${p.left}, ${p.top}), size: ${p.width}x${p.height}`);
		});

		const PADDING = 10;
		const processedCards: Array<{
			left: number;
			top: number;
			width: number;
			height: number;
		}> = [];

		// Loop through sorted cards and ensure each doesn't overlap with previous ones
		sortedCards.forEach((passage) => {
			let newLeft = passage.left;
			let newTop = passage.top;
			let attempts = 0;
			const MAX_ATTEMPTS = 20;

			// Keep trying to find a non-overlapping position
			while (attempts < MAX_ATTEMPTS) {
				let hasCollision = false;
				
				const currentBounds = {
					left: newLeft,
					top: newTop,
					width: passage.width,
					height: passage.height
				};

				// Check against all previously processed cards
				for (const processed of processedCards) {
					if (cardsOverlap(currentBounds, processed, PADDING)) {
						hasCollision = true;
						
						// Try moving down first
						const moveDownTop = processed.top + processed.height + PADDING;
						
						// Try moving right as alternative
						const moveRightLeft = processed.left + processed.width + PADDING;
						
						// Choose the option that moves the card less from its original position
						const distanceDown = Math.abs(moveDownTop - passage.top);
						const distanceRight = Math.abs(moveRightLeft - passage.left);

						if (distanceDown <= distanceRight) {
							// Move down
							newTop = moveDownTop;
							console.log(`[Collision Resolution] "${passage.name}" overlaps with processed card, trying DOWN to y=${newTop}`);
						} else {
							// Move right
							newLeft = moveRightLeft;
							console.log(`[Collision Resolution] "${passage.name}" overlaps with processed card, trying RIGHT to x=${newLeft}`);
						}
						
						break; // Re-check from the start with new position
					}
				}

				if (!hasCollision) {
					// Found a valid position
					break;
				}

				attempts++;
			}

			// If position changed, update the passage
			if (newLeft !== passage.left || newTop !== passage.top) {
				console.log(`[Collision Resolution] Moving "${passage.name}" from (${passage.left}, ${passage.top}) to (${newLeft}, ${newTop})`);
				
				dispatch(
					updatePassage(
						story,
						passage,
						{ left: newLeft, top: newTop },
						{ dontUpdateOthers: true }
					)
				);
			}

			// Add this card to processed list with its final position
			processedCards.push({
				left: newLeft,
				top: newTop,
				width: passage.width,
				height: passage.height
			});
		});

		console.log('[Collision Resolution] Done');
		
		// Close dialog if it was shown
		if (dispatchDialog && dialogIndex !== undefined) {
			console.log('[Collision Resolution] Closing dialog');
			dispatchDialog({
				type: 'removeDialog',
				index: dialogIndex
			});
		}
		}, 50); // Small delay to let React render the indicator
	};
}
