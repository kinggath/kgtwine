import * as React from 'react';
import * as ReactDOM from 'react-dom';
import classNames from 'classnames';
import {IconMinimize, IconX, IconMaximize} from '@tabler/icons';
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
	const dragOffsetRef = React.useRef({x: 0, y: 0});

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
		if (!isDragging) return;

		const handleMouseMove = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();

			const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
			if (!parentRect) return;

			// Calculate new position based on mouse position minus the drag offset
			setPosition({
				left: event.clientX - parentRect.left - dragOffsetRef.current.x,
				top: event.clientY - parentRect.top - dragOffsetRef.current.y
			});
		};

		const handleMouseUp = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			setIsDragging(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging]);

    const onChangeMaximized = React.useCallback(
        (newMaximized: boolean) => {
            setMaximized(newMaximized);
            if (newMaximized) {
                setPosition({top: initialTop, left: initialLeft});
            }
        },
        [initialLeft, initialTop]
    );

	const component = (
		<div
			className={classNames('passage-edit-inline', {maximized, dragging: isDragging, active: isActive})}
			ref={containerRef}
			style={maximized ? undefined : {
				top: `${position.top}px`,
				left: `${position.left}px`
			}}
			onMouseDown={handleMouseDown}
		>
			<h2 className="passage-edit-inline-header">
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
