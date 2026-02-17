import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHistory} from 'react-router-dom';
import {IconHistory} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {isElectronRenderer} from '../../../../util/is-electron';

export const BrowseBackupsButton: React.FC = () => {
	const {t} = useTranslation();
	const history = useHistory();

	// Only show on desktop (Electron)
	if (!isElectronRenderer()) {
		return null;
	}

	return (
		<IconButton
			icon={<IconHistory />}
			label={t('routes.storyList.toolbar.browseBackups')}
			onClick={() => history.push('/backups')}
		/>
	);
};
