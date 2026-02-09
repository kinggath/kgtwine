import {
	passageWithId,
	passageWithName,
	StoriesAction,
	StoriesState,
	storyWithId,
	storyWithName
} from '../../../stories';
import {isPersistablePassageChange} from '../../persistable-changes';
import {
	deletePassageById,
	deleteStory,
	doUpdateTransaction,
	savePassage,
	saveStory
} from './save';

let lastState: StoriesState;

/**
 * A middleware function to save changes to local storage. This should be called
 * *after* the main reducer runs.
 */
export function saveMiddleware(state: StoriesState, action: StoriesAction) {
	switch (action.type) {
		case 'init':
		case 'repair':
			// We take no action here on a repair action. This is to prevent messing up a
			// story's last modified date. If the user then edits the story, we'll save
			// their change and the repair then.
			break;

		case 'createPassage': {
			if (!action.props.name) {
				throw new Error('Passage was created but with no name specified');
			}

			const story = storyWithId(state, action.storyId);
			const passage = passageWithName(state, story.id, action.props.name);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				savePassage(transaction, passage);
			});
			break;
		}

		case 'createPassages': {
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				for (const props of action.props) {
					if (!props.name) {
						throw new Error('Passage was created but with no name specified');
					}

					savePassage(
						transaction,
						passageWithName(state, story.id, props.name)
					);
				}
			});
			break;
		}

		case 'createStory': {
			if (!action.props.name) {
				throw new Error('Story was created but with no name specified');
			}

			const story = storyWithName(state, action.props.name);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				for (const passage of story.passages) {
					savePassage(transaction, passage);
				}
			});
			break;
		}

		case 'deletePassage': {
			const story = storyWithId(state, action.storyId);

			// When a passage is deleted, we also remove links to it from parent passages.
			// We need to save the modified passages along with deleting the removed one.

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				
				// Save all passages (some may have had links removed)
				for (const passage of story.passages) {
					savePassage(transaction, passage);
				}
				
				// Delete the removed passage from storage
				deletePassageById(transaction, action.passageId);
			});
			break;
		}

		case 'deletePassages': {
			const story = storyWithId(state, action.storyId);

			// When passages are deleted, we also remove links to them from parent passages.
			// We need to save the modified passages along with deleting the removed ones.

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				// Save all remaining passages (some may have had links removed)
				for (const passage of story.passages) {
					savePassage(transaction, passage);
				}

				// Delete the removed passages from storage
				for (const passageId of action.passageIds) {
					deletePassageById(transaction, passageId);
				}
			});
			break;
		}

		case 'deleteStory': {
			// The story will be gone from state by the time we're called, so we
			// need a cached copy.

			const story = storyWithId(lastState, action.storyId);

			doUpdateTransaction(transaction => {
				// We have to delete all passages, then the story itself.

				for (const passage of story.passages) {
					deletePassageById(transaction, passage.id);
				}

				deleteStory(transaction, story);
			});
			break;
		}

		case 'updatePassage':
			if (isPersistablePassageChange(action.props)) {
				const story = storyWithId(state, action.storyId);
				const passage = passageWithId(state, action.storyId, action.passageId);

				doUpdateTransaction(transaction => {
					saveStory(transaction, story);
					savePassage(transaction, passage);
				});
				break;
			}
			break;

		case 'updatePassages': {
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				const passageIds = Object.keys(action.passageUpdates).filter(
					passageId =>
						isPersistablePassageChange(action.passageUpdates[passageId])
				);

				for (const passageId of passageIds) {
					savePassage(
						transaction,
						passageWithId(state, action.storyId, passageId)
					);
				}
			});
			break;
		}

		case 'createAndUpdatePassages': {
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				// Save all newly created passages
				for (const props of action.newPassageProps) {
					if (!props.name) {
						throw new Error('Passage was created but with no name specified');
					}

					savePassage(
						transaction,
						passageWithName(state, story.id, props.name)
					);
				}

				// Save all updated passages
				for (const passageId of Object.keys(action.passageUpdates)) {
					savePassage(
						transaction,
						passageWithId(state, action.storyId, passageId)
					);
				}
			});
			break;
		}

		case 'updateStory': {
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				// Special case: if the passages property is being set, we need to
				// delete any passages there were in the story, but aren't anymore.

				if (action.props.passages) {
					const lastStory = storyWithId(lastState, action.storyId);

					for (const passage of lastStory.passages) {
						if (!action.props.passages.some(({id}) => id === passage.id)) {
							deletePassageById(transaction, passage.id);
						}
					}
				}

				story.passages.forEach(passage => savePassage(transaction, passage));
			});
			break;
		}

		default:
			console.warn(
				`Story action ${
					(action as any).type
				} has no local storage persistence handler`
			);
	}

	lastState = state;
}
