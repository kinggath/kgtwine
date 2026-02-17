import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHistory} from 'react-router-dom';
import {IconChevronLeft} from '@tabler/icons';
import {
	RouteToolbar,
	RouteToolbarProps
} from '../../components/route-toolbar/route-toolbar';
import {IconButton} from '../../components/control/icon-button';

export const BackupBrowserToolbar: React.FC<Omit<
	RouteToolbarProps,
	'tabs'
>> = props => {
	const {t} = useTranslation();
	const history = useHistory();

	return (
		<RouteToolbar
			{...props}
			tabs={{
				[t('routes.storyList.titleGeneric')]: (
					<IconButton
						icon={<IconChevronLeft />}
						label={t('common.back')}
						onClick={() => history.push('/')}
					/>
				)
			}}
		/>
	);
};
