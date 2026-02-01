import {IconTrash} from '@tabler/icons';
import * as React from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';
import {deletePassages, Passage, Story} from '../../../../store/stories';
import {useUndoableStoriesContext} from '../../../../store/undoable-stories';
import {
	removeRelativeEditor,
	useRelativePassageEditorsContext
} from '../../../../store/relative-passage-editors';
import {useDialogsContext, removePassageEditors} from '../../../../dialogs/context';

export interface DeletePassagesButtonProps {
	passages: Passage[];
	story: Story;
}

export const DeletePassagesButton: React.FC<
	DeletePassagesButtonProps
> = props => {
	const {passages, story} = props;
	const {dispatch} = useUndoableStoriesContext();
	const {dispatch: relativeEditorsDispatch} = useRelativePassageEditorsContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {t} = useTranslation();
	const disabled = React.useMemo(() => {
		if (passages.length === 0) {
			return true;
		}

		return passages.some(passage => story.startPassage === passage.id);
	}, [passages, story.startPassage]);
	const handleClick = React.useCallback(() => {
		if (passages.length === 0) {
			return;
		}

		const passageIds = passages.map(p => p.id);

		// Close any inline editors for these passages
		passageIds.forEach(passageId => {
			relativeEditorsDispatch(removeRelativeEditor(passageId));
		});

		// Close any dialog stack editors for these passages
		dialogsDispatch(removePassageEditors(passageIds));

		// Now delete the passages
		dispatch(
			deletePassages(story, passages),
			passages.length > 1
				? 'undoChange.deletePassages'
				: 'undoChange.deletePassage'
		);
	}, [dispatch, relativeEditorsDispatch, dialogsDispatch, passages, story]);

	useHotkeys('Backspace,Delete', handleClick, [handleClick]);

	return (
		<IconButton
			disabled={disabled}
			icon={<IconTrash />}
			label={
				!disabled && passages.length > 1
					? t('common.deleteCount', {count: passages.length})
					: t('common.delete')
			}
			onClick={handleClick}
		/>
	);
};
