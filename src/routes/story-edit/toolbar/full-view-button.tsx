import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconArrowsMaximize} from '@tabler/icons';
import {IconButton} from '../../../components/control/icon-button';
import {toggleFullViewMode, useStoriesContext, Story} from '../../../store/stories';
import {useDialogsContext, RelocatingPassagesDialog} from '../../../dialogs';

export interface FullViewButtonProps {
	story: Story;
}

export const FullViewButton: React.FC<FullViewButtonProps> = React.memo(({story}) => {
	const {dispatch, stories} = useStoriesContext();
	const {dispatch: dispatchDialog} = useDialogsContext();
	const {t} = useTranslation();

	const handleToggleFullView = React.useCallback(
		() => {
			dispatch(toggleFullViewMode(stories, story, dispatchDialog, RelocatingPassagesDialog));
		},
		[dispatch, stories, story, dispatchDialog]
	);

	return (
		<IconButton
			icon={<IconArrowsMaximize />}
			iconOnly
			label={t('routes.storyEdit.fullViewButton.label')}
			onClick={handleToggleFullView}
			selectable
			selected={story.fullViewMode}
		/>
	);
});

FullViewButton.displayName = 'FullViewButton';
