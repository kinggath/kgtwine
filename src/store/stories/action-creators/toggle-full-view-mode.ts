import {Thunk} from 'react-hook-thunk-reducer';
import {Passage, Story, StoriesAction, StoriesState} from '../stories.types';
import {updatePassage} from './update-passage';
import {resolvePassageCollisions} from './resolve-passage-collisions';
import {DialogsAction} from '../../../dialogs/dialogs.types';

/**
 * Toggles Full View mode for a story. Uses two-phase expansion:
 * Phase 1: Set checkingForOverflow flag to show scrollbars and detect actual overflow
 * Phase 2: Expand only passages that have real overflow (done by component)
 * When exiting, passages return to their original sizes.
 */
export function toggleFullViewMode(
	stories: Story[],
	story: Story,
	dispatchDialog?: React.Dispatch<DialogsAction>,
	relocatingDialogComponent?: React.ComponentType<any>
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		const nowFullView = !story.fullViewMode;

		// Update each passage based on the new full view state
		story.passages.forEach(passage => {
			if (nowFullView) {
				// Phase 1: Save original position and enable overflow checking
				dispatch(
					updatePassage(
						story,
						passage,
						{
							fullViewOriginalLeft: passage.left,
							fullViewOriginalTop: passage.top,
							checkingForOverflow: true
						},
						{dontUpdateOthers: true}
					)
				);
			} else {
				// Exiting full view: restore original dimensions and positions
				if (passage.fullViewOriginalWidth !== undefined && passage.fullViewOriginalHeight !== undefined) {
					dispatch(
						updatePassage(
							story,
							passage,
							{
								width: passage.fullViewOriginalWidth,
								height: passage.fullViewOriginalHeight,
								left: passage.fullViewOriginalLeft ?? passage.left,
								top: passage.fullViewOriginalTop ?? passage.top,
								fullViewOriginalWidth: undefined,
								fullViewOriginalHeight: undefined,
								fullViewOriginalLeft: undefined,
								fullViewOriginalTop: undefined,
								checkingForOverflow: undefined
							},
							{dontUpdateOthers: true}
						)
					);
				} else {
					// Clear all full view flags and restore position even if not expanded
					const updates: Partial<Passage> = {checkingForOverflow: undefined};
					if (passage.fullViewOriginalLeft !== undefined) {
						updates.left = passage.fullViewOriginalLeft;
						updates.fullViewOriginalLeft = undefined;
					}
					if (passage.fullViewOriginalTop !== undefined) {
						updates.top = passage.fullViewOriginalTop;
						updates.fullViewOriginalTop = undefined;
					}
					dispatch(
						updatePassage(
							story,
							passage,
							updates,
							{dontUpdateOthers: true}
						)
					);
				}
			}
		});

		// Finally, toggle the fullViewMode flag on the story itself
		dispatch({
			props: {fullViewMode: nowFullView},
			storyId: story.id,
			type: 'updateStory'
		});

		// If entering full view mode, schedule collision resolution after cards expand
		if (nowFullView) {
			// Use a delay to let components finish expanding cards
			setTimeout(() => {
				const storiesState = getState(); // Get current state
				const currentStory = storiesState.find((s: Story) => s.id === story.id);
				if (currentStory) {
					dispatch(resolvePassageCollisions(storiesState, currentStory, dispatchDialog, relocatingDialogComponent));
				}
			}, 500);
		}
	};
}
