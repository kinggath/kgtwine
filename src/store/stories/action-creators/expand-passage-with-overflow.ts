import {Thunk} from 'react-hook-thunk-reducer';
import {Passage, Story, StoriesAction, StoriesState} from '../stories.types';
import {updatePassage} from './update-passage';
import {measurePassageText} from '../../../util/measure-passage-text';

/**
 * Expands a passage that has detected actual overflow.
 * Called by the PassageCard component when scrollHeight/Width > clientHeight/Width.
 */
export function expandPassageWithOverflow(
	stories: Story[],
	story: Story,
	passage: Passage
): Thunk<StoriesState, StoriesAction> {
	return (dispatch) => {
		const measuredDimensions = measurePassageText(passage.text);

		dispatch(
			updatePassage(
				story,
				passage,
				{
					fullViewOriginalWidth: passage.width,
					fullViewOriginalHeight: passage.height,
					// Position is already saved in toggle-full-view-mode
					width: measuredDimensions.width,
					height: measuredDimensions.height,
					checkingForOverflow: undefined
				},
				{dontUpdateOthers: true}
			)
		);
	};
}
