import {StoriesState, Passage} from '../stories.types';
import {createPassages} from './create-passages';
import {updatePassages} from './update-passages';

export function createAndUpdatePassages(
	state: StoriesState,
	storyId: string,
	newPassageProps: Partial<Passage>[],
	passageUpdates: Record<string, Partial<Passage>>
): StoriesState {
	let newState = createPassages(state, storyId, newPassageProps);
	newState = updatePassages(newState, storyId, passageUpdates);
	return newState;
}
