import {Story, StoriesState} from '../stories.types';
import {buildBacklinkIndex} from '../../../util/backlinks';

export function initState(state: StoriesState, init: Story[]) {
	// Ensure all loaded stories have their backlink indices initialized
	return init.map(story => ({
		...story,
		backlinkIndex: buildBacklinkIndex(story.passages)
	}));
}
