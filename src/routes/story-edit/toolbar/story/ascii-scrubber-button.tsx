import {IconLetterA} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';
import {AsciiScrubberDialog, useDialogsContext} from '../../../../dialogs';
import {Story} from '../../../../store/stories';

export interface AsciiScrubberButtonProps {
	story: Story;
}

export const AsciiScrubberButton: React.FC<AsciiScrubberButtonProps> = props => {
	const {story} = props;
	const {dispatch} = useDialogsContext();
	const {t} = useTranslation();

	return (
		<IconButton
			icon={<IconLetterA />}
			label={t('routes.storyEdit.toolbar.asciiScrubber')}
			onClick={() =>
				dispatch({
					type: 'addDialog',
					component: AsciiScrubberDialog,
					props: {
						storyId: story.id,
						mode: 'transliterate',
						stage: 'scan',
						previewChanges: [],
						summary: null,
						aggregated: null,
						errorMessage: null
					}
				})
			}
		/>
	);
};
