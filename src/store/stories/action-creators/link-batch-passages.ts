import {Thunk} from 'react-hook-thunk-reducer';
import {StoriesAction, StoriesState, Story} from '../stories.types';
import {updatePassage} from './update-passage';

export interface LinkBatchParams {
	sourcePassageId: string;
	newPassageNames: string[];
	orientation: 'horizontal' | 'vertical';
}

/**
 * Links a batch of newly created passages to a source passage.
 * For horizontal orientation: source → each new passage
 * For vertical orientation: source → first passage, then chain downward
 */
export function linkBatchPassages(
	story: Story,
	params: LinkBatchParams
): Thunk<StoriesState, StoriesAction> {
	return dispatch => {
		const {sourcePassageId, newPassageNames, orientation} = params;
		const sourcePassage = story.passages.find(p => p.id === sourcePassageId);

		if (!sourcePassage || newPassageNames.length === 0) {
			return;
		}

		if (orientation === 'horizontal') {
			// Horizontal: Add links from source to each new passage
			const links = newPassageNames.map(name => `[[${name}]]`).join(' ');
			const newText = sourcePassage.text + '\n' + links;
			dispatch(updatePassage(story, sourcePassage, {text: newText}));
		} else {
			// Vertical: Chain the passages
			// Source → first passage
			const newText = sourcePassage.text + '\n[[' + newPassageNames[0] + ']]';
			dispatch(updatePassage(story, sourcePassage, {text: newText}));

			// Then chain first → second → third, etc.
			for (let i = 0; i < newPassageNames.length - 1; i++) {
				const currentPassage = story.passages.find(p => p.name === newPassageNames[i]);
				if (currentPassage) {
					const nextPassageName = newPassageNames[i + 1];
					const linkText = '\n[[' + nextPassageName + ']]';
					dispatch(
						updatePassage(story, currentPassage, {
							text: currentPassage.text + linkText
						})
					);
				}
			}
		}
	};
}
