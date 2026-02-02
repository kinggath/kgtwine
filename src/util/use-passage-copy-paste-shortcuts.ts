import * as React from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {useUndoableStoriesContext} from '../store/undoable-stories/undoable-stories-context';
import {copyPassages, pastePassages} from '../store/stories/action-creators/copy-paste-passages';

export interface UsePassageCopyPasteShortcutsProps {
	selectedPassageIds: string[];
	storyId?: string;
	visibleZoom: number;
	containerRef: React.RefObject<HTMLDivElement>;
}

export function usePassageCopyPasteShortcuts({
	selectedPassageIds,
	storyId,
	visibleZoom,
	containerRef
}: UsePassageCopyPasteShortcutsProps) {
	const {dispatch} = useUndoableStoriesContext();
	const lastMousePosRef = React.useRef<{x: number; y: number} | null>(null);

	const isDialogOpen = React.useCallback(() => {
		return document.querySelector('.dialog-card') !== null;
	}, []);

	const handleMouseMove = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!containerRef.current) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			lastMousePosRef.current = {
				x: (event.clientX - rect.left) / visibleZoom,
				y: (event.clientY - rect.top) / visibleZoom
			};
		},
		[visibleZoom, containerRef]
	);

	useHotkeys(
		'ctrl+c,cmd+c',
		(event) => {
			event.preventDefault();

			if (selectedPassageIds.length === 0) {
				console.log('No passages selected');
				return;
			}

			dispatch(copyPassages(selectedPassageIds));
			console.log(`Copied ${selectedPassageIds.length} passage(s)`);
		},
		{
			enabled: !isDialogOpen()
		},
		[selectedPassageIds, dispatch, isDialogOpen]
	);

	useHotkeys(
		'ctrl+v,cmd+v',
		(event) => {
			event.preventDefault();

			if (!storyId || !lastMousePosRef.current) {
				console.log('Cannot paste: no position or story available');
				return;
			}

			dispatch(
				pastePassages(
					storyId,
					lastMousePosRef.current.x,
					lastMousePosRef.current.y,
					'withInternalLinks'
				),
				'undoChange.pastePassages'
			);
		},
		{
			enabled: !isDialogOpen()
		},
		[storyId, dispatch, isDialogOpen]
	);

	return {handleMouseMove};
}
