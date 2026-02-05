import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconTag} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {Passage, Story} from '../../../../store/stories';

export interface BulkTagPassagesButtonProps {
	isOpen: boolean;
	passages: Passage[];
	story: Story;
	onToggleOpen: (open: boolean) => void;
}

export const BulkTagPassagesButton: React.FC<BulkTagPassagesButtonProps> = props => {
	const {isOpen, passages, onToggleOpen} = props;
	const {t} = useTranslation();

	const handleClick = React.useCallback(() => {
		onToggleOpen(!isOpen);
	}, [isOpen, onToggleOpen]);

	return (
		<IconButton
			disabled={passages.length === 0}
			icon={<IconTag />}
			label={t('common.tag')}
			onClick={handleClick}
			selected={isOpen}
		/>
	);
};
