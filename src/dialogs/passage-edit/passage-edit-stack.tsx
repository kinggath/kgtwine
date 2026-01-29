import classNames from 'classnames';
import * as React from 'react';
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
	useStoriesContext
} from '../../store/stories';
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
	const storyTagColors = storyWithId(stories, storyId).tagColors;
	const passageInfo = passageIds.map(passageId => {
		const passage = passageWithId(stories, storyId, passageId);

		return {name: passage.name, tags: passage.tags};
	});
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
								headerDisplayLabel={
									<>
										<TagGrid
											tags={passageInfo[index].tags}
											tagColors={storyTagColors}
										/>
										<VisibleWhitespace value={passageInfo[index].name} />
									</>
								}
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
							headerDisplayLabel={
								<>
									<TagGrid
										tags={passageInfo[index].tags}
										tagColors={storyTagColors}
									/>
									<VisibleWhitespace value={passageInfo[index].name} />
								</>
							}
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
