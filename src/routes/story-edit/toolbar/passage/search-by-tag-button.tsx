import {IconSearch} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';

export interface SearchByTagButtonProps {
	disabled?: boolean;
	onClick?: () => void;
}

export const SearchByTagButton: React.FC<SearchByTagButtonProps> = props => {
	const {t} = useTranslation();

	return (
		<IconButton
			disabled={props.disabled}
			icon={<IconSearch />}
			label={t('dialogs.searchByTag.title')}
			onClick={props.onClick}
		/>
	);
};
