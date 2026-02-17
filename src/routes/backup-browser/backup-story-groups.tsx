import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHistory} from 'react-router-dom';
import {CardGroup} from '../../components/container/card-group';
import {StoryCard} from '../../components/story/story-card';
import {Story} from '../../store/stories';
import {usePrefsContext} from '../../store/prefs';
import {useStoriesContext} from '../../store/stories';
import {isElectronRenderer} from '../../util/is-electron';
import type {TwineElectronWindow} from '../../electron/shared/electron-shared.types';
import {usePersistence} from '../../store/persistence/use-persistence';
import './backup-story-groups.css';

interface BackupStoryEntry {
	story: Story;
	backupPath: string;
	backupFilePath: string;
	backupTimestamp: Date;
	backupName: string;
}

export interface BackupStoryGroupsProps {
	backupsByStory: Map<string, BackupStoryEntry[]>;
	storyNames: string[];
}

export const BackupStoryGroups: React.FC<BackupStoryGroupsProps> = props => {
	const {backupsByStory, storyNames} = props;
	const {dispatch: storiesDispatch} = useStoriesContext();
	const {prefs} = usePrefsContext();
	const history = useHistory();
	const {stories: storiesPersistence} = usePersistence();
	const {t} = useTranslation();
	const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
		new Set()
	);
	const [restoring, setRestoring] = React.useState(false);

	// Listen for restore events and reload stories
	React.useEffect(() => {
		if (!isElectronRenderer()) {
			return;
		}

		const electron = (window as TwineElectronWindow).twineElectron;

		if (!electron) {
			return;
		}

		const handleStoryRestored = async () => {
			// Reload stories from disk
			const storiesState = await storiesPersistence.load();
			storiesDispatch({type: 'init', state: storiesState});
		};

		electron.onceStoryRestored(handleStoryRestored);

		return () => {
			// Cleanup listener if component unmounts
		};
	}, [storiesDispatch, storiesPersistence]
	);

	const toggleGroup = (storyName: string) => {
		setExpandedGroups(prev => {
			const next = new Set(prev);
			if (next.has(storyName)) {
				next.delete(storyName);
			} else {
				next.add(storyName);
			}
			return next;
		});
	};

	const handleRestore = async (entry: BackupStoryEntry) => {
		if (!isElectronRenderer() || restoring) {
			return;
		}

		try {
			setRestoring(true);
			const electron = (window as TwineElectronWindow).twineElectron;

			if (!electron) {
				throw new Error('Electron bridge not available');
			}

			const result = await electron.restoreBackupStory(
				entry.backupPath,
				entry.backupFilePath,
				entry.story.name
			);

			if (result.success) {
				// Navigate back to story list to see the restored story
				alert(
					t('routes.backupBrowser.restoreSuccess', {
						name: result.restoredStoryName
					})
				);
				history.push('/');
				// The 'story-restored' event will trigger a reload
			} else {
				alert(
					t('routes.backupBrowser.restoreError', {
						error: result.error || 'Unknown error'
					})
				);
			}
		} catch (err) {
			console.error('Failed to restore backup:', err);
			alert(
				t('routes.backupBrowser.restoreError', {
					error: (err as Error).message
				})
			);
		} finally {
			setRestoring(false);
		}
	};

	const formatTimestamp = (date: Date) => {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'medium'
		}).format(date);
	};

	return (
		<div className="backup-story-groups">
			{storyNames.map(storyName => {
				const entries = backupsByStory.get(storyName) || [];
				const isExpanded = expandedGroups.has(storyName);

				return (
					<div key={storyName} className="backup-story-group">
						<div
							className="backup-story-group-header"
							onClick={() => toggleGroup(storyName)}
						>
							<span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
							<h3 className="story-name">{storyName}</h3>
							<span className="backup-count">
								{t('routes.backupBrowser.backupCount', {count: entries.length})}
							</span>
						</div>
						{isExpanded && (
							<div className="backup-story-group-content">
								<CardGroup columnWidth="360px">
									{entries.map((entry, index) => (
										<div
											key={`${entry.backupName}-${index}`}
											className="backup-card-wrapper"
										>
											<div className="backup-timestamp">
												{formatTimestamp(entry.backupTimestamp)}
											</div>
											<StoryCard
												story={entry.story}
												storyTagColors={prefs.storyTagColors}
												onEdit={() => handleRestore(entry)}
												onSelect={() => {}}
												onChangeTagColor={() => {}}
												onRemoveTag={() => {}}
											/>
											<div className="backup-actions">
												<button
													className="restore-button"
													onClick={() => handleRestore(entry)}
													disabled={restoring}
												>
													{restoring
														? t('routes.backupBrowser.restoring')
														: t('routes.backupBrowser.restore')}
												</button>
											</div>
										</div>
									))}
								</CardGroup>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
