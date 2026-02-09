import {StoriesState} from '../stories.types';
import {
	buildBacklinkIndex,
	getBacklinks,
	removeLinkFromText
} from '../../../util/backlinks';

export function deletePassages(
	state: StoriesState,
	storyId: string,
	passageIds: string[]
) {
	let foundStory = false;
	let deletedCount = 0;

	const newState = state.map(story => {
		if (story.id !== storyId) {
			return story;
		}

		foundStory = true;

		// Find the original passages before deletion
		const originalStory = state.find(s => s.id === storyId);

		if (!originalStory) {
			return story;
		}

		const passagesToDelete = originalStory.passages.filter(p =>
			passageIds.includes(p.id)
		);

		// Filter out the passages to be deleted
		// eslint-disable-next-line prefer-const
		let newStory = {
			...story,
			passages: story.passages.filter(
				passage => !passageIds.includes(passage.id)
			)
		};

		if (newStory.passages.length < story.passages.length) {
			deletedCount = story.passages.length - newStory.passages.length;
			newStory.lastUpdate = new Date();

			// Build backlink index from original passages
			const oldBacklinkIndex = buildBacklinkIndex(originalStory.passages);

			// Remove links to all deleted passages from remaining passages
			newStory.passages = newStory.passages.map(passage => {
				let newText = passage.text;

				passagesToDelete.forEach(deletedPassage => {
					const parentPassageIds = getBacklinks(
						oldBacklinkIndex,
						deletedPassage.id
					);

					if (parentPassageIds.includes(passage.id)) {
						newText = removeLinkFromText(newText, deletedPassage.name);
					}
				});

				return {...passage, text: newText};
			});

			// Rebuild index after removing all links
			newStory.backlinkIndex = buildBacklinkIndex(newStory.passages);
		}

		return newStory;
	});

	if (!foundStory) {
		console.warn(`No story in state with ID "${storyId}", taking no action`);
		return state;
	}

	if (deletedCount === 0) {
		console.warn(
			`Asked to delete passages with IDs [${passageIds.join(', ')}], but none exist in story ID ${storyId}, taking no action`
		);
		return state;
	}

	return newState;}