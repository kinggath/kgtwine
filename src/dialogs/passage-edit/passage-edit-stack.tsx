import classNames from 'classnames';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {
	BackgroundDialogCard,
	DialogCard
} from '../../components/container/dialog-card';
import {DialogStack} from '../../components/container/dialog-card/dialog-stack';
import {TagGrid} from '../../components/tag';
import {VisibleWhitespace} from '../../components/visible-whitespace';
import {
	passageWithId,
	storyWithId,
	updatePassage,
	useStoriesContext
} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {
	addRelativeEditor,
	useRelativePassageEditorsContext
} from '../../store/relative-passage-editors';
import {
	addPassageEditors,
	removePassageEditors,
	useDialogsContext
} from '../context';
import {DialogComponentProps} from '../dialogs.types';
import {PassageEditContents} from './passage-edit-contents';
import './passage-edit-stack.css';

export interface PassageEditStackProps extends DialogComponentProps {
	passageIds: string[];
	storyId: string;
}

const InnerPassageEditStack: React.FC<PassageEditStackProps> = props => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const {onChangeProps, onClose, passageIds, storyId, ...managementProps} =
		props;
	const {dispatch, dialogs} = useDialogsContext();
	const {dispatch: relativeEditorsDispatch} = useRelativePassageEditorsContext();
	const {stories} = useStoriesContext();
	const {dispatch: storiesDispatch} = useUndoableStoriesContext();
	const {t} = useTranslation();
	const story = storyWithId(stories, storyId);
	const storyTagColors = story.tagColors;
	const passageInfo = passageIds.map(passageId => {
		const passage = passageWithId(stories, storyId, passageId);

		return {id: passage.id, name: passage.name, tags: passage.tags};
	});
	const [editingPassageId, setEditingPassageId] = React.useState<string | null>(null);
	const [editedName, setEditedName] = React.useState('');
	const [validationError, setValidationError] = React.useState('');
	const titleInputRef = React.useRef<HTMLInputElement>(null);

	// Validation function for passage name
	const validateName = React.useCallback(
		(name: string, passageId: string): string => {
			if (name.trim() === '') {
				return t('components.renamePassageButton.emptyName');
			}

			if (story.passages.some(p => p.id !== passageId && p.name === name)) {
				return t('components.renamePassageButton.nameAlreadyUsed');
			}

			return '';
		},
		[story.passages, t]
	);

	// Handle starting title edit
	const handleStartTitleEdit = React.useCallback((passageId: string, currentName: string) => {
		setEditedName(currentName);
		setValidationError('');
		setEditingPassageId(passageId);
	}, []);

	// Handle confirming title edit
	const handleConfirmTitleEdit = React.useCallback((passageId: string, originalName: string) => {
		const error = validateName(editedName, passageId);
		if (error) {
			// If there's a validation error, revert and exit edit mode
			setEditingPassageId(null);
			setEditedName('');
			setValidationError('');
			return;
		}

		if (editedName !== originalName) {
			const passage = passageWithId(stories, storyId, passageId);
			storiesDispatch(updatePassage(story, passage, {name: editedName}));
		}

		setEditingPassageId(null);
		setValidationError('');
	}, [editedName, stories, storyId, story, storiesDispatch, validateName]);

	// Handle canceling title edit
	const handleCancelTitleEdit = React.useCallback(() => {
		setEditingPassageId(null);
		setEditedName('');
		setValidationError('');
	}, []);

	// Handle title input change
	const handleTitleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>, passageId: string) => {
			const newName = event.target.value;
			setEditedName(newName);
			const error = validateName(newName, passageId);
			setValidationError(error);
		},
		[validateName]
	);

	// Handle title input key down
	const handleTitleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>, passageId: string, originalName: string) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				handleConfirmTitleEdit(passageId, originalName);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				handleCancelTitleEdit();
			}
		},
		[handleConfirmTitleEdit, handleCancelTitleEdit]
	);

	// Auto-focus and select text when entering edit mode
	React.useEffect(() => {
		if (editingPassageId && titleInputRef.current) {
			titleInputRef.current.focus();
			titleInputRef.current.select();
		}
	}, [editingPassageId]);

	// Render title (either editable or static)
	const renderTitle = React.useCallback((passageId: string, name: string, tags: string[]) => {
		const isEditing = editingPassageId === passageId;
		return (
			<>
				<TagGrid tags={tags} tagColors={storyTagColors} />
				{isEditing ? (
					<input
						ref={titleInputRef}
						type="text"
						value={editedName}
						onChange={(e) => handleTitleChange(e, passageId)}
						onBlur={() => handleConfirmTitleEdit(passageId, name)}
						onKeyDown={(e) => handleTitleKeyDown(e, passageId, name)}
						className="passage-title-input"
						style={{color: validationError ? 'red' : undefined}}
					/>
				) : (
					<div onClick={() => handleStartTitleEdit(passageId, name)} style={{cursor: 'pointer'}}>
						<VisibleWhitespace value={name} />
					</div>
				)}
			</>
		);
	}, [editingPassageId, editedName, validationError, storyTagColors, handleTitleChange, handleConfirmTitleEdit, handleTitleKeyDown, handleStartTitleEdit]);

	const style: React.CSSProperties = {};

	if (managementProps.collapsed) {
		style.height = `calc(var(--control-height) * ${passageIds.length})`;

		if (managementProps.maximized) {
			style.bottom = 0;
			style.position = 'absolute';
		}
	}

	function handleClose(
		passageId: string,
		event?: React.KeyboardEvent | React.MouseEvent
	) {
		if (event?.shiftKey) {
			onClose(event);
		} else {
			dispatch(removePassageEditors([passageId]));
		}
	}

	function handleRemoveFromStack(
		passageId: string,
		event?: React.KeyboardEvent | React.MouseEvent
	) {
		event?.preventDefault();
		event?.stopPropagation();

		// Get the scroll position of the main-content container
		const mainContentEl = document.querySelector('.main-content') as HTMLElement;
		const scrollTop = mainContentEl?.scrollTop || 0;
		const scrollLeft = mainContentEl?.scrollLeft || 0;

		// Calculate bottom-right position: window width - card width (600px) - 16px padding
		// Add scroll position to offset the editor within the passage-map
		const left = scrollLeft + window.innerWidth - 600 - 16;
		// Position at 8px from top (titlebar offset) plus scroll position
		const top = scrollTop + 8;

		// Add the relative editor at bottom-right position
		// We use width = -8 so that when PassageMap calculates initialLeft as:
		// left + width + 8, it results in the correct viewport position
		relativeEditorsDispatch(
			addRelativeEditor(passageId, storyId, {
				top,
				left,
				width: -8,
				height: 600
			})
		);

		// Collapse all remaining dialogs in the stack
		dialogs.forEach((_, index) => {
			dispatch({type: 'setDialogCollapsed', collapsed: true, index});
		});

		// Remove from dialog stack
		dispatch(removePassageEditors([passageId]));
	}

	return (
		<div
			className={classNames('passage-edit-stack', {
				collapsed: managementProps.collapsed
			})}
			style={style}
		>
			<DialogStack childKeys={passageIds}>
				{passageIds.map((passageId, index) => {
					if (index !== 0) {
						return (
							<BackgroundDialogCard
								{...managementProps}
								headerDisplayLabel={renderTitle(
									passageId,
									passageInfo[index].name,
									passageInfo[index].tags
								)}
								headerLabel={passageInfo[index].name}
								key={passageId}
								onClose={event => handleClose(passageId, event)}
								onRaise={() =>
									dispatch(addPassageEditors(storyId, [passageId]))
								}
							>
								<PassageEditContents
									disabled
									passageId={passageId}
									storyId={storyId}
								/>
							</BackgroundDialogCard>
						);
					}

					return (
						<DialogCard
							{...managementProps}
							headerDisplayLabel={renderTitle(
								passageId,
								passageInfo[index].name,
								passageInfo[index].tags
							)}
							headerLabel={passageInfo[index].name}
							key={passageId}
							maximizable
							onClose={event => handleClose(passageId, event)}
							onRemoveFromStack={event => handleRemoveFromStack(passageId, event)}
						>
							<PassageEditContents passageId={passageId} storyId={storyId} />
						</DialogCard>
					);
				})}
			</DialogStack>
		</div>
	);
};

export const PassageEditStack: React.FC<PassageEditStackProps> = props => {
	const {passageIds, storyId} = props;
	const {stories} = useStoriesContext();

	const existingPassageIds = passageIds.filter(passageId => {
		try {
			passageWithId(stories, storyId, passageId);
		} catch {
			return false;
		}

		return true;
	});

	// If there aren't any passages to display, render nothing and call onClose.

	if (existingPassageIds.length === 0) {
		props.onClose();
		return null;
	}

	// If passages differ from what we were asked to display, change our props.

	if (existingPassageIds.length !== passageIds.length) {
		props.onChangeProps({...props, passageIds: existingPassageIds});
		return null;
	}

	// We're good to display dialogs normally.

	return <InnerPassageEditStack {...props} />;
};
