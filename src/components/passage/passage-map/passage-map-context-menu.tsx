import * as React from 'react';
import {CSSTransition} from 'react-transition-group';
import {IconPlus} from '@tabler/icons';
import {useTranslation} from 'react-i18next';
import {ButtonBar} from '../../container/button-bar';
import {ButtonCard} from '../../container/button-card';
import {IconButton} from '../../control/icon-button';
import {CloseAllPassagesButton} from '../../../routes/story-edit/toolbar/passage/close-all-passages-button';
import {createUntitledPassage, Story} from '../../../store/stories';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
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
}

const PassageMapContextMenuContent = React.forwardRef<
	HTMLDivElement,
	PassageMapContextMenuContentProps
>(({isOpen, onClose, mapX, mapY, zoom, story}, ref) => {
	const {dispatch} = useUndoableStoriesContext();
	const {t} = useTranslation();
	const [menuEl, setMenuEl] = React.useState<HTMLDivElement | null>(null);

	const handleCreatePassage = React.useCallback(() => {
		if (story) {
			dispatch(createUntitledPassage(story, mapX, mapY), 'undoChange.newPassage');
			onClose();
		}
	}, [story, mapX, mapY, dispatch, onClose]);
	
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
			>
				<ButtonCard floating>
					<ButtonBar orientation="vertical">
					<div
						onPointerDown={(e) => {
							if (e.button !== 0) return;
							e.preventDefault();
							e.stopPropagation();
							handleCreatePassage();
						}}
						onMouseDown={(e) => e.stopPropagation()}
						style={{ display: "flex", width: "100%" }}
					>
						<IconButton
							icon={<IconPlus />}
							label={t('common.new')}
							disabled={!story}
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
}

export const PassageMapContextMenu = React.forwardRef<
	PassageMapContextMenuHandle,
	PassageMapContextMenuProps
>(({story}, ref) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const [mapPosition, setMapPosition] = React.useState({x: 0, y: 0});
	const [zoom, setZoom] = React.useState(1);
	const menuRef = React.useRef<HTMLDivElement>(null);

	const handleOpen = React.useCallback((mapX: number, mapY: number, zoom: number) => {
		setMapPosition({x: mapX, y: mapY});
		setZoom(zoom);
		setIsOpen(true);
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
		/>
	);
});

PassageMapContextMenu.displayName = 'PassageMapContextMenu';
