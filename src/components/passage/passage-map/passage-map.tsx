import * as React from 'react';
import {DraggableData} from 'react-draggable';
import {Passage, Story} from '../../../store/stories';
import {boundingRect, Point} from '../../../util/geometry';
import {useCloseAllPassages} from '../../../routes/story-edit/use-close-all-passages';
import {PassageConnections} from '../passage-connections';
import {PassageCardGroup} from '../passage-card-group';
import {PassageMapContextMenu, PassageMapContextMenuHandle} from './passage-map-context-menu';
import {PassageEditInline} from '../passage-edit-inline';
import {useRelativePassageEditorsContext} from '../../../store/relative-passage-editors';
import {usePassageCopyPasteShortcuts} from '../../../util/use-passage-copy-paste-shortcuts';
import './passage-map.css';
import classnames from 'classnames';

export interface PassageMapProps {
	clickOffCardsToClose?: boolean;
	formatName: string;
	formatVersion: string;
	onDeselect: (passage: Passage) => void;
	onDrag: (change: Point) => void;
	onEdit: (passage: Passage) => void;
	onSelect: (passage: Passage, exclusive: boolean) => void;
	passages: Passage[];
	startPassageId: string;
	story?: Story;
	storyId?: string;
	tagColors: Story['tagColors'];
	visibleZoom: number;
	zoom: number;
	highlightedTagNames?: string[];
}

interface DragState {
	dragging: boolean;
	dragX: number;
	dragY: number;
	startX: number;
	startY: number;
}

type DragAction =
	| {type: 'start'; x: number; y: number}
	| {type: 'move'; x: number; y: number}
	| {type: 'stop'; callback: (change: Point) => void};

function dragReducer(state: DragState, action: DragAction) {
	switch (action.type) {
		case 'start':
			return {
				dragging: true,
				dragX: action.x,
				dragY: action.y,
				startX: action.x,
				startY: action.y
			};

		case 'move':
			return {...state, dragX: action.x, dragY: action.y};

		case 'stop':
			// This is bad reducer practice, probably—this dispatch causes a side
			// effect. However, it allows us to avoid re-renders as state
			// changes--otherwise state becomes a dependency of the handleDragStop
			// callback below--which have a large performance impact.
			//
			// This also must be deferred to avoid changing state mid-render through
			// the callback.

			Promise.resolve().then(() =>
				action.callback({
					left: state.dragX - state.startX,
					top: state.dragY - state.startY
				})
			);
			return {dragging: false, dragX: 0, dragY: 0, startX: 0, startY: 0};
	}
}

const compactCardZoom = 0.6;

export const PassageMap = React.forwardRef<
	PassageMapContextMenuHandle,
	PassageMapProps
>((props, ref) => {
	const {
		clickOffCardsToClose,
		formatName,
		formatVersion,
		onDeselect,
		onDrag,
		onEdit,
		onSelect,
		passages,
		startPassageId,
		story,
		storyId: storyIdProp,
		tagColors,
		visibleZoom,
		zoom
	} = props;
	const [compactCards, setCompactCards] = React.useState(
		visibleZoom <= compactCardZoom
	);
	const {state: relativeEditorsState} = useRelativePassageEditorsContext();
	const container = React.useRef<HTMLDivElement>(null);
	const passageBounds = React.useMemo(() => {
		// Need to inject a fake rect at the very top-left corner to anchor the
		// bounds there.

		return boundingRect([...passages, {top: 0, left: 0, width: 0, height: 0}]);
	}, [passages]);

	// This is a separate memo so that there's less work when visibleZoom changes
	// during a zoom transition. The max() expression ensures that dialogs will
	// never overlap it--800px is the largest user-selectable dialog width (see
	// dialogs/app-prefs.tsx), so we leave 200px padding around that. We hardcode
	// it here instead of taking a prop mainly for simplicity's sake.

	const style = React.useMemo(() => {
		return {
			height: `calc(${passageBounds.height}px + max(50vh, ${
				1000 / visibleZoom
			}px))`,
			width: `calc(${passageBounds.width}px + max(50vw, ${
				1000 / visibleZoom
			}px))`,
			transform: `scale(${visibleZoom})`
		};
	}, [passageBounds.height, passageBounds.width, visibleZoom]);

	const [state, dispatch] = React.useReducer(dragReducer, {
		dragging: false,
		dragX: 0,
		dragY: 0,
		startX: 0,
		startY: 0
	});

	// Separate from the state above, we need to track whether the user was
	// recently dragging cards so that we maintain the correct card selection
	// after a drag. The issue is that the card fires a select event immediately
	// after a drag finishes, because it sees the mouseup event. We need to ignore
	// this callback, but *only* immediately after a drag.
	//
	// We use a ref to avoid unnecessary re-renders.

	const recentlyDragging = React.useRef(false);

	// Track right-click timing to distinguish between context menu (quick click)
	// and panning (click and hold).
	const contextMenuRef = React.useRef<PassageMapContextMenuHandle>(null);
	const rightClickTimeRef = React.useRef<number>(0);
	const rightClickStartRef = React.useRef<{x: number; y: number} | null>(null);
	const rightClickDistanceRef = React.useRef<number>(0);
	const MIN_PAN_HOLD_MS = 200;
	const MIN_PAN_DISTANCE_PX = 5;

	const {handleCloseAllPassages, canClose} = useCloseAllPassages();

	// Get selected passage IDs for keyboard shortcuts
	const selectedPassageIds = React.useMemo(
		() => passages.filter(p => p.selected).map(p => p.id),
		[passages]
	);

	// Set up keyboard shortcuts for copy/paste
	const {handleMouseMove} = usePassageCopyPasteShortcuts({
		selectedPassageIds,
		storyId: storyIdProp || story?.id,
		visibleZoom,
		containerRef: container
	});

	// Only update the compact card state when visibleZoom and zoom are the same.
	// This avoids re-rendering the cards in the middle of a zoom transition
	// (which causes jank).

	React.useEffect(() => {
		if (zoom === visibleZoom) {
			setCompactCards(zoom <= compactCardZoom);
		}
	}, [visibleZoom, zoom]);

	// Set CSS variables on the container for drag offsets.

	React.useEffect(() => {
		if (!container.current) {
			return;
		}

		container.current.style.setProperty(
			'--drag-offset-left',
			`${(state.dragX - state.startX) / visibleZoom}px`
		);
		container.current.style.setProperty(
			'--drag-offset-top',
			`${(state.dragY - state.startY) / visibleZoom}px`
		);
	}, [state.dragX, state.dragY, state.startX, state.startY, visibleZoom]);

	const handleDragStart = React.useCallback((event, data: DraggableData) => {
		document.body.classList.add('dragging-passages');
		dispatch({type: 'start', x: data.x, y: data.y});
	}, []);
	const handleDrag = React.useCallback(
		(event, data: DraggableData) =>
			dispatch({type: 'move', x: data.x, y: data.y}),
		[]
	);
	const handleDragStop = React.useCallback(() => {
		document.body.classList.remove('dragging-passages');
		dispatch({type: 'stop', callback: onDrag});

		// A 0 timeout is enough to swallow the incoming onSelect callback that the
		// card will send. Promise.resolve() doesn't appear to give us the timing we
		// want.
		//
		// We can't defer the dispatch() call above because it can lead to colliding
		// drags when users click rapidly on a passage. See
		// https://github.com/klembot/twinejs/issues/1426

		recentlyDragging.current = true;
		window.setTimeout(() => {
			recentlyDragging.current = false;
		}, 0);
	}, [onDrag]);
	const handleSelect = React.useCallback(
		(passage: Passage, exclusive: boolean) => {
			// See comments above about recentlyDragging.

			if (!recentlyDragging.current) {
				onSelect(passage, exclusive);
			}
		},
		[onSelect]
	);

	const handleContainerContextMenu = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.preventDefault();

			const timeSinceDown = Date.now() - rightClickTimeRef.current;
			const distanceMoved = rightClickDistanceRef.current;

			// If held for less than MIN_PAN_HOLD_MS and didn't move much, show context menu
			if (timeSinceDown < MIN_PAN_HOLD_MS && distanceMoved < MIN_PAN_DISTANCE_PX) {
				// Convert screen coordinates to passage map coordinates
				// The passage map is scaled by visibleZoom, so we need to account for that
				if (container.current) {
					const rect = container.current.getBoundingClientRect();
					// Get position relative to the scaled passage map element
					const mapX = (event.clientX - rect.left) / visibleZoom;
					const mapY = (event.clientY - rect.top) / visibleZoom;
					console.log('Opening context menu:', {
						screenX: event.clientX,
						screenY: event.clientY,
						mapX,
						mapY,
						rect,
						visibleZoom
					});
				contextMenuRef.current?.open(mapX, mapY, visibleZoom);
			}
		}
	},
	[visibleZoom]
);

	const handleContainerPointerDown = React.useCallback(
	(event: React.PointerEvent<HTMLDivElement>) => {
		// Close all passages if clicking off cards is enabled
		if (
				canClose
			) {
				handleCloseAllPassages();
			}

			if (event.button === 2) {
				rightClickTimeRef.current = Date.now();
				rightClickStartRef.current = {x: event.clientX, y: event.clientY};
				rightClickDistanceRef.current = 0;
			}
		},
		[clickOffCardsToClose, canClose, handleCloseAllPassages]
	);

	const handleContainerPointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (rightClickStartRef.current) {
				const dx = event.clientX - rightClickStartRef.current.x;
				const dy = event.clientY - rightClickStartRef.current.y;
				rightClickDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
			}
		},
		[]
	);

	const stopPropagation = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
	}, []);

	const handlePassageCardContextMenu = React.useCallback(
		(passage: Passage, event: React.MouseEvent<HTMLDivElement>) => {
			event.preventDefault();

			// Convert screen coordinates to passage map coordinates
			if (container.current) {
				const rect = container.current.getBoundingClientRect();
				// Get position relative to the scaled passage map element
				const mapX = (event.clientX - rect.left) / visibleZoom;
				const mapY = (event.clientY - rect.top) / visibleZoom;

				// If the passage is not selected, select it exclusively
				if (!passage.selected) {
					onSelect(passage, true);
				}

				// Open the context menu at the click position
				contextMenuRef.current?.open(mapX, mapY, visibleZoom);
			}
		},
		[onSelect, visibleZoom]
	);

	React.useImperativeHandle(ref, () => contextMenuRef.current!, []);

	return (
		<div
			className={classnames('passage-map', {
				'compact-passage-cards': compactCards
			})}
			ref={container}
			style={style}
			onPointerUp={handleContainerContextMenu}
			onPointerDown={handleContainerPointerDown}
			onPointerMove={handleContainerPointerMove}
			onMouseMove={handleMouseMove}
		>
			<PassageConnections
				formatName={formatName}
				formatVersion={formatVersion}
				offset={{
					left: (state.dragX - state.startX) / zoom,
					top: (state.dragY - state.startY) / zoom
				}}
				passages={passages}
				startPassageId={startPassageId}
			/>
			<div onPointerDown={stopPropagation}>
				<PassageCardGroup
					onDeselect={onDeselect}
					onDragStart={handleDragStart}
					onDrag={handleDrag}
					onDragStop={handleDragStop}
					onEdit={onEdit}
					onSelect={handleSelect}
					onContextMenu={handlePassageCardContextMenu}
					passages={passages}
					tagColors={tagColors}
					highlightedTagNames={props.highlightedTagNames}
				/>
				{relativeEditorsState.editors.map(editor => (
					<PassageEditInline
						key={editor.passageId}
						passageId={editor.passageId}
						storyId={editor.storyId}
						initialLeft={editor.passageCardPosition.left + editor.passageCardPosition.width + 8}
						initialTop={editor.passageCardPosition.top}
						isNewlyCreated={editor.isNewlyCreated}
					/>
				))}
			</div>
			<PassageMapContextMenu ref={contextMenuRef} story={story} passages={passages} />
		</div>
	);
});

PassageMap.displayName = 'PassageMap';
