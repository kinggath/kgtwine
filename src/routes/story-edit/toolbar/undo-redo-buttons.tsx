import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHotkeys} from 'react-hotkeys-hook';
import {IconArrowBack, IconArrowForward} from '@tabler/icons';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
import {IconButton} from '../../../components/control/icon-button';

export const UndoRedoButtons: React.FC = () => {
	const {redo, redoLabel, undo, undoLabel} = useUndoableStoriesContext();
	const {t} = useTranslation();

	// Check if any dialog is open
	const isDialogOpen = React.useCallback(() => {
		return document.querySelector('.dialog-card') !== null;
	}, []);

	// CTRL+Z - Undo
	useHotkeys(
		'ctrl+z,cmd+z',
		(event) => {
			event.preventDefault();
			if (undo) {
				undo();
			}
		},
		{
			enabled: !isDialogOpen() && !!undo
		},
		[undo, isDialogOpen]
	);

	// CTRL+SHIFT+Z or CTRL+Y - Redo
	useHotkeys(
		'ctrl+shift+z,cmd+shift+z,ctrl+y,cmd+y',
		(event) => {
			event.preventDefault();
			if (redo) {
				redo();
			}
		},
		{
			enabled: !isDialogOpen() && !!redo
		},
		[redo, isDialogOpen]
	);

	return (
		<>
			<IconButton
				disabled={!undo}
				icon={<IconArrowBack />}
				label={undoLabel ?? t('common.undo')}
				onClick={undo}
			/>
			<IconButton
				disabled={!redo}
				icon={<IconArrowForward />}
				label={redoLabel ?? t('common.redo')}
				onClick={redo}
			/>
		</>
	);
};
