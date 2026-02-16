import {Thunk} from 'react-hook-thunk-reducer';
import {
	Patch,
	PreviewChange,
	ReplacementMode,
	scanStory
} from '../../../tools/ascii-scrubber';
import {storyWithId} from '../getters';
import {StoriesAction, StoriesState, Story, Passage} from '../stories.types';
import {updatePassage} from './update-passage';
import {updateStory} from './update-story';

/**
 * Scan a story for non-ASCII characters.
 */
export function scanStoryForNonAscii(
	storyId: string,
	fieldsToScan: Array<'name' | 'text' | 'script' | 'stylesheet' | 'tags'> = [
		'name',
		'text',
		'script',
		'stylesheet',
		'tags'
	],
	mode: ReplacementMode = 'transliterate'
) {
	return (dispatch: any, getState: () => StoriesState) => {
		const state = getState();
		const story = storyWithId(state, storyId);

		if (!story) {
			throw new Error(`Story with ID ${storyId} not found`);
		}

		const {previewChanges, summary, aggregated} = scanStory(story, mode, fieldsToScan);

		return {
			previewChanges,
			summary,
			aggregated
		};
	};
}

/**
 * Apply ASCII scrubber changes to a story.
 * This is a thunk that dispatches individual field updates and tracks patches for undo.
 */
export function applyAsciiScrubberChanges(
	storyId: string,
	previewChanges: PreviewChange[]
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		const state = getState();
		const story = storyWithId(state, storyId);

		if (!story) {
			throw new Error(`Story with ID ${storyId} not found`);
		}

		const patches: Patch[] = [];

		// Process each preview change
		for (const preview of previewChanges) {
			const {loc, before, after} = preview;

			if (loc.entityType === 'story') {
				// Story-level field update
				const props: Partial<Story> = {};

				if (loc.fieldIndex !== undefined) {
					// Array field (e.g., tags)
					if (loc.field === 'tags' && story.tags && Array.isArray(story.tags)) {
						const newTags = [...story.tags];
						newTags[loc.fieldIndex] = after;
						props.tags = newTags;
					}
				} else {
					// String field
					if (loc.field === 'name') {
						props.name = after;
					} else if (loc.field === 'script') {
						props.script = after;
					} else if (loc.field === 'stylesheet') {
						props.stylesheet = after;
					}
				}

				if (Object.keys(props).length > 0) {
					try {
						const state = getState();
						dispatch(updateStory(state, story, props));

						patches.push({loc, before, after});
					} catch (error) {
						console.error(`Failed to update story field ${loc.field}:`, error);
					}
				}
			} else if (loc.entityType === 'passage') {
				// Passage-level field update
				const passage = story.passages.find(p => p.id === loc.entityId);

				if (!passage) {
					console.warn(
						`Passage with ID ${loc.entityId} in story ${storyId} not found`
					);
					continue;
				}

				const props: Partial<Passage> = {};

				if (loc.fieldIndex !== undefined) {
					// Array field (e.g., tags)
					if (loc.field === 'tags' && passage.tags && Array.isArray(passage.tags)) {
						const newTags = [...passage.tags];
						newTags[loc.fieldIndex] = after;
						props.tags = newTags;
					}
				} else {
					// String field
					if (loc.field === 'name') {
						props.name = after;
					} else if (loc.field === 'text') {
						props.text = after;
					}
				}

				if (Object.keys(props).length > 0) {
					try {
						updatePassage(story, passage, props, {dontUpdateOthers: true})(
							dispatch,
							getState
						);
						patches.push({loc, before, after});
					} catch (error) {
						console.error(
							`Failed to update passage ${loc.entityId} field ${loc.field}:`,
							error
						);
					}
				}
			}
		}

		return patches;
	};
}

/**
 * Undo ASCII scrubber changes by restoring patches.
 */
export function undoAsciiScrubberChanges(
	storyId: string,
	patches: Patch[]
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		const state = getState();
		const story = storyWithId(state, storyId);

		if (!story) {
			throw new Error(`Story with ID ${storyId} not found`);
		}

		// Apply patches in reverse order (restore 'before' values)
		for (const patch of patches) {
			const {loc, before} = patch;

			if (loc.entityType === 'story') {
				const props: Partial<Story> = {};

				if (loc.fieldIndex !== undefined) {
					if (loc.field === 'tags' && story.tags && Array.isArray(story.tags)) {
						const newTags = [...story.tags];
						newTags[loc.fieldIndex] = before;
						props.tags = newTags;
					}
				} else {
					if (loc.field === 'name') {
						props.name = before;
					} else if (loc.field === 'script') {
						props.script = before;
					} else if (loc.field === 'stylesheet') {
						props.stylesheet = before;
					}
				}

				if (Object.keys(props).length > 0) {
					try {
						const state = getState();
						dispatch(updateStory(state, story, props));
					} catch (error) {
						console.error(`Failed to restore story field ${loc.field}:`, error);
					}
				}
			} else if (loc.entityType === 'passage') {
				const passage = story.passages.find(p => p.id === loc.entityId);

				if (!passage) {
					console.warn(
						`Passage with ID ${loc.entityId} in story ${storyId} not found`
					);
					continue;
				}

				const props: Partial<Passage> = {};

				if (loc.fieldIndex !== undefined) {
					if (loc.field === 'tags' && passage.tags && Array.isArray(passage.tags)) {
						const newTags = [...passage.tags];
						newTags[loc.fieldIndex] = before;
						props.tags = newTags;
					}
				} else {
					if (loc.field === 'name') {
						props.name = before;
					} else if (loc.field === 'text') {
						props.text = before;
					}
				}

				if (Object.keys(props).length > 0) {
					try {
						updatePassage(story, passage, props)(dispatch, getState);
					} catch (error) {
						console.error(
							`Failed to restore passage ${loc.entityId} field ${loc.field}:`,
							error
						);
					}
				}
			}
		}
	};
}
