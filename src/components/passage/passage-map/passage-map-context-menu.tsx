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
import {CreateBatchDialog, CreateBatchParams} from '../../../dialogs/create-batch';
import {
	copyPassages,
	pastePassages,
	getAvailablePasteModes,
	PasteMode
} from '../../../store/stories/action-creators/copy-paste-passages';
import {createBatchPassages} from '../../../store/stories/action-creators/create-batch-passages';
import {hasClipboardPassages, getClipboardPassages} from '../../../util/passage-clipboard';
import './passage-map-context-menu.css';

export interface PassageMapContextMenuHandle {
	close: () => void;
	open: (mapX: number, mapY: number, zoom: number, passageId?: string) => void;
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
	availablePasteModes: PasteMode[];
	passageId?: string; // ID of passage that was right-clicked
}

const PassageMapContextMenuContent = React.forwardRef<
	HTMLDivElement,
	PassageMapContextMenuContentProps
>(({isOpen, onClose, mapX, mapY, zoom, story, passages, hasClipboard, setHasClipboard, availablePasteModes, passageId}, ref) => {
	const {dispatch: undoableDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogDispatch} = useDialogsContext();
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

	const handleCreateBatch = React.useCallback(() => {
		if (story) {
			dialogDispatch({
				type: 'addDialog',
				component: CreateBatchDialog,
				props: {
					sourcePassageId: passageId,
					onCreateBatch: (batchParams: CreateBatchParams) => {
						// Create the passages
						undoableDispatch(
							createBatchPassages(story, {
								...batchParams,
								centerX: mapX,
								centerY: mapY
							}),
							'undoChange.createBatch'
						);
					}
				}
			});
			onClose();
		}
	}, [story, mapX, mapY, passageId, dialogDispatch, undoableDispatch, onClose]);

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

	const handlePasteWithMode = React.useCallback((mode: PasteMode) => {
		if (!story) return;

		undoableDispatch(
			pastePassages(story.id, mapX, mapY, mode),
			`undoChange.pastePassages`
		);
		setHasClipboard(false);
		onClose();
	}, [story, mapX, mapY, undoableDispatch, onClose, setHasClipboard]);

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
								onClick={e => {
									handleCreatePassage();
									e.stopPropagation();
								}}
								disabled={!story}
							/>
						</div>
						<div
							onPointerDown={(e) => {
								e.stopPropagation();
								e.preventDefault();
								if (e.button !== 0) return;
								handleCreateBatch();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							style={{display: 'flex', width: '100%'}}
						>
							<IconButton
								icon={<IconPlus />}
								label={t('dialogs.createBatch.label')}
								onClick={e => {
									handleCreateBatch();
									e.stopPropagation();
								}}
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
							className="paste-submenu-wrapper"
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							style={{display: 'flex', width: '100%', position: 'relative', flexDirection: 'column'}}
						>
							<div style={{display: 'flex', width: '100%'}}>
								<IconButton
									icon={<IconClipboard />}
									label={t('common.paste')}
									disabled={!hasClipboard}
								/>
							</div>
							{hasClipboard && (
								<div className="paste-submenu">
									{(['withoutLinks', 'withLinks', 'withInternalLinks'] as PasteMode[]).map((mode) => {
										const isAvailable = availablePasteModes.includes(mode);
										const label =
											mode === 'withoutLinks'
												? t('dialogs.pasteMode.withoutLinks')
												: mode === 'withInternalLinks'
												? t('dialogs.pasteMode.withInternalLinks')
												: t('dialogs.pasteMode.withLinks');

										return (
											<button
												key={mode}
												className="paste-submenu-item"
												disabled={!isAvailable}
												onPointerDown={(e) => {
													e.stopPropagation();
													e.preventDefault();
													if (e.button !== 0) return;
													if (isAvailable) {
														handlePasteWithMode(mode);
													}
												}}
												onMouseDown={(e) => e.stopPropagation()}
												onClick={(e) => {
													e.stopPropagation();
												}}
											>
												{label}
											</button>
										);
									})}
								</div>
							)}
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
	const [availablePasteModes, setAvailablePasteModes] = React.useState<PasteMode[]>([]);
	const [passageId, setPassageId] = React.useState<string | undefined>(undefined);
	const menuRef = React.useRef<HTMLDivElement>(null);

	const handleOpen = React.useCallback((mapX: number, mapY: number, zoom: number, clickedPassageId?: string) => {
		console.log('handleOpen called with clickedPassageId:', clickedPassageId);
		const hasClip = hasClipboardPassages();
		setMapPosition({x: mapX, y: mapY});
		setZoom(zoom);
		setPassageId(clickedPassageId);
		setIsOpen(true);
		setHasClipboard(hasClip);
		// Update available paste modes when opening
		if (story) {
			const clipboardPassages = getClipboardPassages();
			if (clipboardPassages && clipboardPassages.length > 0) {
				const modes = getAvailablePasteModes(story, clipboardPassages);
				setAvailablePasteModes(modes);
			} else {
				setAvailablePasteModes([]);
			}
		}
	}, [story]);

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
			availablePasteModes={availablePasteModes}
			passageId={passageId}
		/>
	);
});

PassageMapContextMenu.displayName = 'PassageMapContextMenu';
