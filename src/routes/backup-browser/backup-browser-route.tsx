import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {MainContent} from '../../components/container/main-content';
import {LoadingCurtain} from '../../components/loading-curtain/loading-curtain';
import {importStories} from '../../util/import';
import {Story} from '../../store/stories';
import {isElectronRenderer} from '../../util/is-electron';
import type {
	BackupDirectory,
	TwineElectronWindow
} from '../../electron/shared/electron-shared.types';
import {BackupStoryGroups} from './backup-story-groups';
import {BackupBrowserToolbar} from './backup-browser-toolbar';
import './backup-browser-route.css';

interface BackupStoryEntry {
	story: Story;
	backupPath: string;
	backupFilePath: string;
	backupTimestamp: Date;
	backupName: string;
}

export const BackupBrowserRoute: React.FC = () => {
	const {t} = useTranslation();
	const [loading, setLoading] = React.useState(true);
	const [backupsByStory, setBackupsByStory] = React.useState<
		Map<string, BackupStoryEntry[]>
	>(new Map());
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (!isElectronRenderer()) {
			setError('Backups are only available in the desktop app.');
			setLoading(false);
			return;
		}

		const loadBackups = async () => {
			try {
				const electron = (window as TwineElectronWindow).twineElectron;

				if (!electron) {
					throw new Error('Electron bridge not available');
				}

				const backupDirs: BackupDirectory[] = await electron.listBackups();

				if (backupDirs.length === 0) {
					setLoading(false);
					return;
				}

				// Load stories from all backup directories
				const allBackupStories: BackupStoryEntry[] = [];

				for (const backupDir of backupDirs) {
					try {
						const backupData = await electron.loadBackupStories(backupDir.path);

						// Parse each HTML source into Story objects
						for (const data of backupData) {
							const htmlSource = (data as any).htmlSource;
							const backupFilePath = (data as any).backupPath;

							if (htmlSource) {
								const stories = importStories(
									htmlSource,
									backupDir.timestamp
								);

								for (const story of stories) {
									allBackupStories.push({
										story,
										backupPath: backupDir.path,
										backupFilePath,
										backupTimestamp: backupDir.timestamp,
										backupName: backupDir.name
									});
								}
							}
						}
					} catch (err) {
						console.warn(
							`Failed to load backup from ${backupDir.path}:`,
							err
						);
					}
				}

				// Group by story name
				const grouped = new Map<string, BackupStoryEntry[]>();

				for (const entry of allBackupStories) {
					const storyName = entry.story.name;

					if (!grouped.has(storyName)) {
						grouped.set(storyName, []);
					}

					grouped.get(storyName)!.push(entry);
				}

				// Sort entries within each group by timestamp (newest first)
				for (const entries of grouped.values()) {
					entries.sort(
						(a, b) =>
							b.backupTimestamp.getTime() - a.backupTimestamp.getTime()
					);
				}

				setBackupsByStory(grouped);
				setLoading(false);
			} catch (err) {
				console.error('Failed to load backups:', err);
				setError((err as Error).message);
				setLoading(false);
			}
		};

		loadBackups();
	}, []);

	if (loading) {
		return <LoadingCurtain />;
	}

	if (error) {
		return (
			<div className="backup-browser-route">
				<BackupBrowserToolbar />
				<MainContent title={t('routes.backupBrowser.title')}>
					<div className="backup-browser-error">
						<p>{t('routes.backupBrowser.error')}</p>
						<p className="error-detail">{error}</p>
					</div>
				</MainContent>
			</div>
		);
	}

	const storyNames = Array.from(backupsByStory.keys()).sort();

	return (
		<div className="backup-browser-route">
			<BackupBrowserToolbar />
			<MainContent title={t('routes.backupBrowser.title')}>
				{backupsByStory.size === 0 ? (
					<div className="no-backups">
						<p>{t('routes.backupBrowser.noBackups')}</p>
						<p className="help-text">
							{t('routes.backupBrowser.noBackupsHelp')}
						</p>
					</div>
				) : (
					<BackupStoryGroups
						backupsByStory={backupsByStory}
						storyNames={storyNames}
					/>
				)}
			</MainContent>
		</div>
	);
};
