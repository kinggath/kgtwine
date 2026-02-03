import {
	StoriesAction,
	StoriesState,
	Story,
	Passage
} from '../stories.types';
import {isValidTagName} from '../../../util/tag';
import {storyPassageTags} from '../getters';
import {Thunk} from 'react-hook-thunk-reducer';
import {colorString, Color} from '../../../util/color';

/**
 * Adds multiple tags to multiple passages in a single action.
 */
export function addTagsToPassages(
	story: Story,
	passages: Passage[],
	tagNames: string[],
	tagColors?: Record<string, Color>
): Thunk<StoriesState, StoriesAction> {
	// Validate all inputs
	passages.forEach(passage => {
		if (passage.story !== story.id) {
			throw new Error('A passage does not belong to this story.');
		}
	});

	tagNames.forEach(tagName => {
		if (!isValidTagName(tagName)) {
			throw new Error(`"${tagName}" is not a valid tag name.`);
		}
	});

	return dispatch => {
		const storyTags = storyPassageTags(story);
		const newTagColors = {...story.tagColors};
		let tagsNeedColorAssignment = false;

		// Assign colors to any new tags that don't have them yet
		tagNames.forEach(tagName => {
			if (!storyTags.includes(tagName)) {
				// Use provided color if available, otherwise generate one
				newTagColors[tagName] = tagColors?.[tagName] ?? colorString(tagName);
				tagsNeedColorAssignment = true;
			} else if (tagColors?.[tagName]) {
				// Update color for existing tags if a new color was selected
				newTagColors[tagName] = tagColors[tagName];
				tagsNeedColorAssignment = true;
			}
		});

		// If new tags need color assignment, update the story first
		if (tagsNeedColorAssignment) {
			dispatch({
				type: 'updateStory',
				storyId: story.id,
				props: {
					tagColors: newTagColors
				}
			});
		}

		// Add tags to each passage
		passages.forEach(passage => {
			const newTags = Array.from(new Set([...passage.tags, ...tagNames]));
			dispatch({
				type: 'updatePassage',
				passageId: passage.id,
				storyId: story.id,
				props: {tags: newTags}
			});
		});
	};
}
