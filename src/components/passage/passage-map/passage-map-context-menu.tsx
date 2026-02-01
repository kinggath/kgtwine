import * as React from 'react';
import {CSSTransition} from 'react-transition-group';
import {IconPlus, IconCopy, IconClipboard} from '@tabler/icons';
import {useTranslation} from 'react-i18next';
import {ButtonBar} from '../../container/button-bar';
import {ButtonCard} from '../../container/button-card';
import {IconButton} from '../../control/icon-button';
import {CloseAllPassagesButton} from '../../../routes/story-edit/toolbar/passage/close-all-passages-button';
import {createUntitledPassage, Passage, Story} from '../../../store/stories';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
import {useDialogsContext} from '../../../dialogs';
import {PasteModeDialog} from '../../../dialogs/paste-mode';
import {
	copyPassages,
	pastePassages,
	getAvailablePasteModes,
	PasteMode
} from '../../../store/stories/action-creators/copy-paste-passages';
import {hasClipboardPassages, getClipboardPassages} from '../../../util/passage-clipboard';
import './passage-map-context-menu.css';

export interface PassageMapContextMenuHandle {
	close: () => void;
	open: (mapX: number, mapY: number, zoom: number) => void;
}

interface PassageMapContextMenuContentProps {
	isOpen: boolean;
	onClose: () => void;
	mapX: number;
	mapY: number;
	zoom: number;
	story?: Story;
	passages: Passage[];
	hasClipboard: boolean;
	setHasClipboard: (value: boolean) => void;
}

const PassageMapContextMenuContent = React.forwardRef<
	HTMLDivElement,
	PassageMapContextMenuContentProps
>(({isOpen, onClose, mapX, mapY, zoom, story, passages, hasClipboard, setHasClipboard}, ref) => {
	const {dispatch: undoableDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {t} = useTranslation();
	const [menuEl, setMenuEl] = React.useState<HTMLDivElement | null>(null);
	const selectedPassagesRef = React.useRef<Passage[]>([]);

	// Capture selected passages when menu opens
	React.useEffect(() => {
		if (isOpen) {
			selectedPassagesRef.current = passages.filter(p => p.selected);
		}
	}, [isOpen, passages]);



	const handleCreatePassage = React.useCallback(() => {
		if (story) {
			undoableDispatch(createUntitledPassage(story, mapX, mapY), 'undoChange.newPassage');
			onClose();
		}
	}, [story, mapX, mapY, undoableDispatch, onClose]);

	const handleCopyPassages = React.useCallback(() => {
		// Use captured passages instead of filtered current passages
		// because parent deselects on click event
		const toCopy = selectedPassagesRef.current;
		if (toCopy.length > 0) {
			undoableDispatch(copyPassages(toCopy.map(p => p.id)));
			setHasClipboard(true);
			onClose();
		}
	}, [undoableDispatch, onClose, setHasClipboard]);

	const handlePastePassages = React.useCallback(() => {
		if (!story) return;

		const clipboardPassages = getClipboardPassages();
		if (!clipboardPassages || clipboardPassages.length === 0) return;

		const availableModes = getAvailablePasteModes(story, clipboardPassages);

		if (availableModes.length === 0) return;

		const handlePasteConfirm = (mode: PasteMode) => {
			undoableDispatch(
				pastePassages(story.id, mapX, mapY, mode),
				`undoChange.pastePassages`
			);
			setHasClipboard(false);
		};

		dialogsDispatch({
			type: 'addDialog',
			component: PasteModeDialog,
			props: {
				availableModes,
				pasteCount: clipboardPassages.length,
				onPaste: handlePasteConfirm
			}
		});

		onClose();
	}, [story, mapX, mapY, undoableDispatch, dialogsDispatch, onClose, setHasClipboard]);
	
	// Calculate menu position using logical coordinates with a small offset
	const menuLeft = mapX + 5;
	const menuTop = mapY + 5;

	// Sync the external ref with our internal state ref
	React.useEffect(() => {
		if (ref) {
			if (typeof ref === 'function') {
				ref(menuEl);
			} else {
				ref.current = menuEl;
			}
		}
	}, [menuEl, ref]);

	React.useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (menuEl && !menuEl.contains(event.target as Node)) {
				onClose();
			}
		};

		// Add a slight delay to avoid closing immediately after opening
		const timeoutId = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen, menuEl, onClose]);

	return (
		<CSSTransition
			classNames="fade-out"
			in={isOpen}
			mountOnEnter
			timeout={10}
			unmountOnExit
		>
			<div
				className="passage-map-context-menu"
				ref={setMenuEl}
				style={{
					top: `${menuTop}px`,
					left: `${menuLeft}px`,
					transform: `scale(${1 / zoom})`,
					transformOrigin: '-5px -5px'
				}}
				onPointerDown={(e) => {
					e.stopPropagation();
				}}
				onClick={(e) => {
					e.stopPropagation();
				}}
				onMouseDown={(e) => {
					e.stopPropagation();
				}}
			>
				<ButtonCard floating>
					<ButtonBar orientation="vertical">
						<div
							onPointerDown={(e) => {
								e.stopPropagation();
								e.preventDefault();
								if (e.button !== 0) return;
								handleCreatePassage();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							style={{display: 'flex', width: '100%'}}
						>
							<IconButton
								icon={<IconPlus />}
								label={t('common.new')}
								disabled={!story}
							/>
						</div>
						<div
							onPointerDown={(e) => {
								e.stopPropagation();
								e.preventDefault();
								if (e.button !== 0) return;
								handleCopyPassages();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							style={{display: 'flex', width: '100%'}}
						>
							<IconButton
								icon={<IconCopy />}
								label={t('common.copy')}
								disabled={selectedPassagesRef.current.length === 0}
							/>
						</div>
						<div
							onPointerDown={(e) => {
								e.stopPropagation();
								e.preventDefault();
								if (e.button !== 0) return;
								handlePastePassages();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							style={{display: 'flex', width: '100%'}}
						>
							<IconButton
								icon={<IconClipboard />}
								label={t('common.paste')}
								disabled={!hasClipboard}
							/>
						</div>
						<CloseAllPassagesButton onClose={onClose} />
					</ButtonBar>
				</ButtonCard>
			</div>
		</CSSTransition>
	);
});

PassageMapContextMenuContent.displayName = 'PassageMapContextMenuContent';

export interface PassageMapContextMenuProps {
	story?: Story;
	passages: Passage[];
}

export const PassageMapContextMenu = React.forwardRef<
	PassageMapContextMenuHandle,
	PassageMapContextMenuProps
>(({story, passages}, ref) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const [mapPosition, setMapPosition] = React.useState({x: 0, y: 0});
	const [zoom, setZoom] = React.useState(1);
	const [hasClipboard, setHasClipboard] = React.useState(hasClipboardPassages());
	const menuRef = React.useRef<HTMLDivElement>(null);

	const handleOpen = React.useCallback((mapX: number, mapY: number, zoom: number) => {
		const hasClip = hasClipboardPassages();
		setMapPosition({x: mapX, y: mapY});
		setZoom(zoom);
		setIsOpen(true);
		setHasClipboard(hasClip);
	}, []);

	const handleClose = React.useCallback(() => {
		setIsOpen(false);
	}, []);

	React.useImperativeHandle(ref, () => ({
		open: handleOpen,
		close: handleClose
	}));

	return (
		<PassageMapContextMenuContent
			isOpen={isOpen}
			onClose={handleClose}
			ref={menuRef}
			mapX={mapPosition.x}
			mapY={mapPosition.y}
			zoom={zoom}
			story={story}
			passages={passages}
			hasClipboard={hasClipboard}
			setHasClipboard={setHasClipboard}
		/>
	);
});

PassageMapContextMenu.displayName = 'PassageMapContextMenu';
