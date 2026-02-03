import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHotkeys} from 'react-hotkeys-hook';
import {IconArrowBack, IconArrowForward} from '@tabler/icons';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
import {useDialogsContext} from '../../../dialogs';
import {useRelativePassageEditorsContext} from '../../../store/relative-passage-editors';
import {IconButton} from '../../../components/control/icon-button';

export const UndoRedoButtons: React.FC = () => {
	const {redo, redoLabel, undo, undoLabel} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {dispatch: relativeDispatch} = useRelativePassageEditorsContext();
	const {t} = useTranslation();

	// Check if any dialog is open
	const isDialogOpen = React.useCallback(() => {
		return document.querySelector('.dialog-card') !== null;
	}, []);

	// Close all open editors (both inline and dialog) before undo/redo
	const closeAllEditors = React.useCallback(() => {
		relativeDispatch({type: 'closeAll'});
		// Close all dialogs by dispatching remove for each one
		dialogsDispatch((dispatch, state) => {
			const dialogs = state();
			// Remove dialogs in reverse order to avoid index shifting
			for (let i = dialogs.length - 1; i >= 0; i--) {
				dispatch({type: 'removeDialog', index: i});
			}
		});
	}, [dialogsDispatch, relativeDispatch]);

	// CTRL+Z - Undo
	useHotkeys(
		'ctrl+z,cmd+z',
		(event) => {
			event.preventDefault();
			if (undo) {
				closeAllEditors();
				undo();
			}
		},
		{
			enabled: !isDialogOpen() && !!undo
		},
		[undo, isDialogOpen, closeAllEditors]
	);

	// CTRL+SHIFT+Z or CTRL+Y - Redo
	useHotkeys(
		'ctrl+shift+z,cmd+shift+z,ctrl+y,cmd+y',
		(event) => {
			event.preventDefault();
			if (redo) {
				closeAllEditors();
				redo();
			}
		},
		{
			enabled: !isDialogOpen() && !!redo
		},
		[redo, isDialogOpen, closeAllEditors]
	);

	return (
		<>
			<IconButton
				disabled={!undo}
				icon={<IconArrowBack />}
				label={undoLabel ?? t('common.undo')}
				onClick={() => {
					closeAllEditors();
					undo?.();
				}}
			/>
			<IconButton
				disabled={!redo}
				icon={<IconArrowForward />}
				label={redoLabel ?? t('common.redo')}
				onClick={() => {
					closeAllEditors();
					redo?.();
				}}
			/>
		</>
	);
};
