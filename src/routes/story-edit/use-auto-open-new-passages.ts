import * as React from 'react';
import {useStoriesContext} from '../../store/stories';
import {useDialogsContext, addPassageEditors} from '../../dialogs';
import {addRelativeEditor, useRelativePassageEditorsContext} from '../../store/relative-passage-editors';
import {usePrefsContext} from '../../store/prefs';

/**
 * Automatically opens newly created passages in the editor and autofocuses the title.
 * This works for both dialog and inline editor modes.
 */
export function useAutoOpenNewPassages(storyId: string) {
	const {stories} = useStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {dispatch: relativeDispatch} = useRelativePassageEditorsContext();
	const {prefs} = usePrefsContext();
	const previousPassageCountRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		// Check if auto-edit is enabled
		if (!prefs.autoEditNewPassages) {
			previousPassageCountRef.current = stories.find(s => s.id === storyId)?.passages.length ?? null;
			return;
		}

		const story = stories.find(s => s.id === storyId);
		if (!story) return;

		const currentPassageCount = story.passages.length;
		const previousPassageCount = previousPassageCountRef.current;

		// Initialize ref on first render
		if (previousPassageCount === null) {
			previousPassageCountRef.current = currentPassageCount;
			return;
		}

		// If a new passage was added, open it for editing
		if (currentPassageCount > previousPassageCount) {
			const numberOfNewPassages = currentPassageCount - previousPassageCount;

			// Only auto-open if exactly one passage was created (not multiple pastes)
			if (numberOfNewPassages === 1) {
				// Find the newly added passage (most recent one based on lastUpdate)
				const newPassages = story.passages.slice(previousPassageCount);

				if (newPassages.length > 0) {
					const newPassage = newPassages[0];

					if (prefs.passageRelativePosition) {
						relativeDispatch(
							addRelativeEditor(
								newPassage.id,
								storyId,
								{
									top: newPassage.top,
									left: newPassage.left,
									width: newPassage.width,
									height: newPassage.height
								},
								true // isNewlyCreated flag
							)
						);
					} else {
						dialogsDispatch(
							addPassageEditors(storyId, [newPassage.id], 6, true)
						);
					}
				}
			}
		}

		previousPassageCountRef.current = currentPassageCount;
	}, [stories, storyId, dialogsDispatch, relativeDispatch, prefs.passageRelativePosition, prefs.autoEditNewPassages]);
}
