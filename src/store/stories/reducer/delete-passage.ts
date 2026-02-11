import {StoriesState} from '../stories.types';
import {
	buildBacklinkIndex,
	getBacklinks,
	removeLinkFromText
} from '../../../util/backlinks';

export function deletePassage(
	state: StoriesState,
	storyId: string,
	passageId: string
) {
	let foundStory = false;
	let deleted = false;

	const newState = state.map(story => {
		if (story.id !== storyId) {
			return story;
		}

		foundStory = true;

		const newStory = {
			...story,
			passages: story.passages.filter(passage => {
				if (passage.id === passageId) {
					deleted = true;
					return false;
				}

				return true;
			})
		};

		if (deleted) {
			newStory.lastUpdate = new Date();

			// Get all passages that link to the deleted passage
			const oldStory = state.find(s => s.id === storyId);

			if (oldStory) {
				const deletedPassage = oldStory.passages.find(
					p => p.id === passageId
				);

				if (deletedPassage) {
					// Get backlinks from the old story's index
					const oldBacklinkIndex =
						story.backlinkIndex || buildBacklinkIndex(oldStory.passages);
					const parentPassageIds = getBacklinks(
						oldBacklinkIndex,
						passageId
					);

					// Remove links to the deleted passage from all parent passages
					newStory.passages = newStory.passages.map(passage => {
						if (!parentPassageIds.includes(passage.id)) {
							return passage;
						}

						const newText = removeLinkFromText(
							passage.text,
							deletedPassage.name
						);

						return {...passage, text: newText};
					});

					// Rebuild index after removing links
					newStory.backlinkIndex = buildBacklinkIndex(
						newStory.passages
					);
				}
			}

			return newStory;
		}

		return story;
	});

	if (!foundStory) {
		console.warn(`No story in state with ID "${storyId}", taking no action`);
		return state;
	}

	if (!deleted) {
		console.warn(
			`Asked to delete a passage with ID "${passageId}", but it does not exist in story ID ${storyId}, taking no action`
		);
		return state;
	}

	return newState;
}
