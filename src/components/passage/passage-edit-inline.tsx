import * as React from 'react';
import * as ReactDOM from 'react-dom';
import classNames from 'classnames';
import {IconMinimize, IconX, IconMaximize, IconChevronUp, IconChevronDown} from '@tabler/icons';
import {PassageEditContents} from '../../dialogs/passage-edit';
import {IconButton} from '../control/icon-button';
import {
	removeRelativeEditor,
	setActiveRelativeEditor,
	useRelativePassageEditorsContext
} from '../../store/relative-passage-editors';
import {TagGrid} from '../tag';
import {VisibleWhitespace} from '../visible-whitespace';
import {
	passageWithId,
	selectPassage,
	storyWithId,
	useStoriesContext
} from '../../store/stories';
import {useTranslation} from 'react-i18next';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import './passage-edit-inline.css';

export interface PassageEditInlineProps {
	passageId: string;
	storyId: string;
	initialLeft: number;
	initialTop: number;
}

export const PassageEditInline: React.FC<PassageEditInlineProps> = props => {
	const {passageId, storyId, initialLeft, initialTop} = props;
	const {dispatch, state} = useRelativePassageEditorsContext();
	const {stories} = useStoriesContext();
	const {dispatch: storiesDispatch} = useUndoableStoriesContext();
	const containerRef = React.useRef<HTMLDivElement>(null);
	const {t} = useTranslation();
	const isActive = state.activePassageId === passageId;
	const [position, setPosition] = React.useState({top: initialTop, left: initialLeft});
	const [isDragging, setIsDragging] = React.useState(false);
	const [dimensions, setDimensions] = React.useState<{width: number; height: number} | null>(null);
	const [isResizing, setIsResizing] = React.useState(false);
	const headerRef = React.useRef<HTMLHeadingElement>(null);
	const dragOffsetRef = React.useRef({x: 0, y: 0});
	const resizeDimensionsRef = React.useRef({initialWidth: 0, initialHeight: 0, initialX: 0, initialY: 0});
	const animationTimeoutRef = React.useRef<NodeJS.Timeout>();

	// Get passage and story data
	let passage: ReturnType<typeof passageWithId>;
	let story: ReturnType<typeof storyWithId>;
	let storyTagColors: ReturnType<typeof storyWithId>['tagColors'];

	try {
		passage = passageWithId(stories, storyId, passageId);
		story = storyWithId(stories, storyId);
		storyTagColors = story.tagColors;
	} catch {
		// Passage or story no longer exists
		React.useEffect(() => {
			dispatch(removeRelativeEditor(passageId));
		}, [dispatch, passageId]);
		return null;
	}

	const handleClose = React.useCallback(() => {
		// If this is the active editor, set the next one as active
		if (isActive && state.editors.length > 1) {
			const currentIndex = state.editors.findIndex(e => e.passageId === passageId);
			const nextIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex + 1;
			if (nextIndex >= 0 && nextIndex < state.editors.length) {
				const nextEditor = state.editors[nextIndex];
				if (nextEditor.passageId !== passageId) {
					dispatch(setActiveRelativeEditor(nextEditor.passageId));
				}
			}
		}
		setPosition({top: initialTop, left: initialLeft});
		dispatch(removeRelativeEditor(passageId));
	}, [dispatch, passageId, initialLeft, initialTop, state.editors, isActive]);

	// Set this editor as active when it mounts
	React.useEffect(() => {
		dispatch(setActiveRelativeEditor(passageId));
	}, [dispatch, passageId]);

    const [maximized, setMaximized] = React.useState(false);

	const [collapsed, setCollapsed] = React.useState(false);

	const handleMouseDown = React.useCallback(
		(event: React.MouseEvent) => {
			// Set this editor as active
			dispatch(setActiveRelativeEditor(passageId));

			// Only drag if not maximized and clicking on header area
			if (maximized) return;
			
			// Don't start drag if clicking on buttons
			if ((event.target as HTMLElement).closest('button')) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			// Select the passage when starting to drag
			if (!passage.selected) {
				storiesDispatch(selectPassage(story, passage, true));
			}

			setIsDragging(true);
			const rect = containerRef.current?.getBoundingClientRect();
			const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
			if (rect && parentRect) {
				// Store the offset from the mouse position to the element's current position
				dragOffsetRef.current = {
					x: event.clientX - rect.left,
					y: event.clientY - rect.top
				};
			}
		},
		[maximized, passage, story, storiesDispatch, dispatch, passageId]
	);

	const handleResizeStart = React.useCallback(
		(event: React.MouseEvent) => {
			if (maximized) return;

			event.preventDefault();
			event.stopPropagation();

			// Set this editor as active
			dispatch(setActiveRelativeEditor(passageId));

			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				resizeDimensionsRef.current = {
					initialWidth: rect.width,
					initialHeight: rect.height,
					initialX: event.clientX,
					initialY: event.clientY
				};
			}
			setIsResizing(true);
		},
		[maximized, dispatch, passageId]
	);

	// Global keydown listener for ESC key - only active editor responds
	React.useEffect(() => {
		if (!isActive) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				handleClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isActive, handleClose]);

	React.useEffect(() => {
		if (!isDragging && !isResizing) return;

		const MIN_WIDTH = 400;
		const MIN_HEIGHT = 300;
		const newZoom = story.zoom || 1;

		const handleMouseMove = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();

			if (isDragging) {
				const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
				if (!parentRect) return;

				// Calculate new position based on mouse position minus the drag offset
				// Account for zoom by dividing the screen-space movement by the current zoom level
				setPosition({
					left: (event.clientX - parentRect.left - dragOffsetRef.current.x) / newZoom,
					top: (event.clientY - parentRect.top - dragOffsetRef.current.y) / newZoom
				});
			} else if (isResizing) {
				// Calculate resize delta from initial position
				const deltaX = (event.clientX - resizeDimensionsRef.current.initialX) / newZoom;
				const deltaY = (event.clientY - resizeDimensionsRef.current.initialY) / newZoom;

				// Calculate new dimensions
				const newWidth = Math.max(MIN_WIDTH, resizeDimensionsRef.current.initialWidth + deltaX);
				const newHeight = Math.max(MIN_HEIGHT, resizeDimensionsRef.current.initialHeight + deltaY);

				setDimensions({
					width: newWidth,
					height: newHeight
				});
			}
		};

		const handleMouseUp = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			setIsDragging(false);
			setIsResizing(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, isResizing, story.zoom]);

    const onChangeMaximized = React.useCallback(
        (newMaximized: boolean) => {
            setMaximized(newMaximized);
            if (newMaximized) {
                setPosition({top: initialTop, left: initialLeft});
            }
        },
        [initialLeft, initialTop]
    );

	const onChangeCollapsed = React.useCallback(
		(newCollapsed: boolean) => {
			if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
			setCollapsed(newCollapsed);
		},
		[]
	);

	const component = (
		<div
			className={classNames('passage-edit-inline', {maximized, dragging: isDragging, active: isActive, resizing: isResizing, collapsed})}
			ref={containerRef}
			style={maximized ? undefined : {
				top: `${position.top}px`,
				left: `${position.left}px`,
				width: dimensions && !collapsed ? `${dimensions.width}px` : undefined,
				height: collapsed && headerRef.current 
					? `${headerRef.current.offsetHeight}px` 
					: (dimensions && !collapsed ? `${dimensions.height}px` : undefined),
				transform: `scale(${1 / (story.zoom || 1)})`,
				transformOrigin: 'top left'
			}}
			onMouseDown={handleMouseDown}
		>
			<h2 className="passage-edit-inline-header" ref={headerRef}>
                <div className="dialog-card-header">
                    <TagGrid
                        tags={passage.tags}
                        tagColors={storyTagColors}
                    />
                    <VisibleWhitespace value={passage.name} />
                </div>
                <div className="dialog-card-header-controls">
                    <IconButton
                        icon={maximized ? <IconMinimize /> : <IconMaximize />}
                        iconOnly
                        label={
                            maximized ? t('common.unmaximize') : t('common.maximize')
                        }
                        onClick={() => onChangeMaximized(!maximized)}
                        tooltipPosition="bottom"
                    />
					<IconButton
						icon={collapsed ? <IconChevronUp /> : <IconChevronDown />}
						iconOnly
						label={collapsed ? t('common.expand') : t('common.collapse')}
						onClick={() => onChangeCollapsed(!collapsed)}
						tooltipPosition="bottom"
					/>
                    <IconButton
                        icon={<IconX />}
                        iconOnly
                        label={t('common.close')}
                        onClick={handleClose}
                        tooltipPosition="bottom"
                    />
                </div>
			</h2>
			<div className="passage-edit-inline-contents">
				<PassageEditContents passageId={passageId} storyId={storyId} />
			</div>
			{!maximized && (
				<div
					className="passage-edit-inline-resize-handle"
					onMouseDown={handleResizeStart}
					title={t('common.resize')}
				/>
			)}
		</div>
	);

	// Render to portal only when maximized to escape positioned context
	if (maximized) {
		const dialogsContainer = document.querySelector('.dialogs');
		return dialogsContainer
			? ReactDOM.createPortal(component, dialogsContainer)
			: component;
	}

	return component;
};

PassageEditInline.displayName = 'PassageEditInline';
