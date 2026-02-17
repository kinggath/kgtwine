import {app, dialog, ipcMain} from 'electron';
import debounce from 'lodash/debounce';
import type {DebouncedFunc} from 'lodash';
import {readdir, readFile, copy, stat, writeFile} from 'fs-extra';
import {join} from 'path';
import {i18n} from './locales';
import {saveJsonFile} from './json-file';
import {
	deleteStory,
	loadStories,
	renameStory,
	saveStoryHtml
} from './story-file';
import {loadStoryFormats} from './story-formats';
import {loadPrefs} from './prefs';
import {openWithScratchFile} from './scratch-file';
import {getStoryDirectoryPath} from './story-directory';
import {getAppPref, setAppPref} from './app-prefs';
import {storyFileName} from '../shared/story-filename';
import {Story} from '../../store/stories/stories.types';
import type {
	BackupDirectory,
	BackupStory,
	RestoreResult
} from '../shared/electron-shared.types';

export function initIpc() {
	// We want to debounce story saves so we aren't constantly writing to disk.
	// However, we need to have individual debounced functions per story so that
	// saves on multiple stories in one interval aren't lost. So we maintain a set
	// of debounced functions keyed by story ID.
	//
	// These still take an argument because the individual invocations will see a
	// different story object each time.

	const storySavers: Record<
		string,
		DebouncedFunc<
			(event: any, story: Story, storyHtml: string) => Promise<void>
		>
	> = {};

	ipcMain.on('delete-story', async (event, story) => {
		try {
			await deleteStory(story);
			event.sender.send('story-deleted', story);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storyDelete'),
				(error as Error).message
			);
			throw error;
		}
	});

	// These use handle() so that they can return data to the renderer process.

	ipcMain.handle('load-prefs', async () => {
		try {
			return await loadPrefs();
		} catch (error) {
			console.warn(`Could not load prefs, returning empty object: ${error}`);
			return {};
		}
	});

	ipcMain.handle('load-stories', loadStories);

	ipcMain.handle('load-story-formats', async () => {
		try {
			return await loadStoryFormats();
		} catch (error) {
			console.warn(
				`Could not load story formats, returning empty array: ${error}`
			);
			return [];
		}
	});

	ipcMain.on(
		'open-with-scratch-file',
		(event, data: string, filename: string) => {
			openWithScratchFile(data, filename);
		}
	);

	// This doesn't use handle() because state reducers in the renderer process
	// can't be be asynchronous--we have to send a signal back.

	ipcMain.on('rename-story', async (event, oldStory, newStory) => {
		try {
			await renameStory(oldStory, newStory);
			event.sender.send('story-renamed', oldStory, newStory);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storyRename'),
				(error as Error).message
			);
			throw error;
		}
	});

	ipcMain.on('save-json', async (event, filename: string, data: any) => {
		try {
			await saveJsonFile(filename, data);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.jsonSave'),
				(error as Error).message
			);
			throw error;
		}
	});

	ipcMain.on('save-story-html', async (event, story, storyHtml) => {
		try {
			if (typeof storyHtml !== 'string') {
				throw new Error('Asked to save non-string as story HTML');
			}

			if (storyHtml.trim() === '') {
				throw new Error('Asked to save empty string as story HTML');
			}

			if (!storySavers[story.id]) {
				storySavers[story.id] = debounce(
					async (
						saverEvent: any,
						saverStory: Story,
						saverStoryHtml: string
					) => {
						try {
							await saveStoryHtml(saverStory, saverStoryHtml);
							saverEvent.sender.send('story-html-saved', saverStory);
						} catch (error) {
							dialog.showErrorBox(
								i18n.t('electron.errors.storySave'),
								(error as Error).message
							);
							throw error;
						}
					},
					1000,
					{leading: true, trailing: true}
				);
			}

			storySavers[story.id](event, story, storyHtml);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storySave'),
				(error as Error).message
			);
			throw error;
		}
	});

	// Backup-related handlers

	ipcMain.handle('get-app-pref', async (event, name: string) => {
		return getAppPref(name as any);
	});

	ipcMain.handle('set-app-pref', async (event, name: string, value: any) => {
		await setAppPref(name as any, value);
	});

	ipcMain.handle('list-backups', async (): Promise<BackupDirectory[]> => {
		try {
			const prefPath = getAppPref('backupFolderPath');
			const backupPath =
				typeof prefPath === 'string'
					? prefPath
					: join(
							app.getPath('documents'),
							i18n.t('common.appName'),
							i18n.t('electron.backupsDirectoryName')
					  );

			try {
				const backupDirs = (
					await readdir(backupPath, {withFileTypes: true})
				).filter(file => file.isDirectory() && file.name[0] !== '.');

				const backups = await Promise.all(
					backupDirs.map(async directory => {
						const fullPath = join(backupPath, directory.name);
						const stats = await stat(fullPath);

						return {
							path: fullPath,
							timestamp: stats.mtime,
							name: directory.name
						};
					})
				);

				// Sort by timestamp, newest first
				backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

				return backups;
			} catch (error) {
				// Backup directory doesn't exist yet
				console.warn('Could not read backup directory:', error);
				return [];
			}
		} catch (error) {
			console.error('Error listing backups:', error);
			return [];
		}
	});

	ipcMain.handle(
		'load-backup-stories',
		async (event, backupPath: string): Promise<BackupStory[]> => {
			try {
				const files = await readdir(backupPath);
				const htmlFiles = files.filter(f => /\.html$/i.test(f));
				const backupStats = await stat(backupPath);

				const stories: BackupStory[] = [];

				for (const file of htmlFiles) {
					const filePath = join(backupPath, file);
					const htmlSource = await readFile(filePath, 'utf8');

					// Return the HTML source with metadata so the renderer can parse it
					// We're adding custom properties that will be attached after parsing
					stories.push({
						htmlSource,
						backupPath: filePath,
						backupTimestamp: backupStats.mtime
					} as any);
				}

				return stories;
			} catch (error) {
				console.error('Error loading backup stories:', error);
				throw error;
			}
		}
	);

	ipcMain.handle(
		'restore-backup-story',
		async (
			event,
			backupPath: string,
			backupFilePath: string,
			originalStoryName: string
		): Promise<RestoreResult> => {
			try {
				const storyPath = getStoryDirectoryPath();
				// Format: "Story Name (Restored - 2026-02-17 14:30:45)"
				const now = new Date();
				const dateStr = now.toLocaleString('en-US', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false
				});
				const restoredName = `${originalStoryName} (Restored - ${dateStr})`;
				const targetFileName = storyFileName({name: restoredName} as Story);
				const targetPath = join(storyPath, targetFileName);

				// Copy the backup file
				await copy(backupFilePath, targetPath);

				// Read the HTML file and update the story name inside
				let htmlSource = await readFile(targetPath, 'utf8');
				
				// Replace the story name in the tw-storydata element
				htmlSource = htmlSource.replace(
					/<tw-storydata[^>]*\sname="[^"]*"/,
					(`<tw-storydata name="${restoredName}"` as unknown) as string
				);

				// Update the file with the new name
				await writeFile(targetPath, htmlSource, 'utf8');

				console.log(
					`Restored backup from ${backupFilePath} to ${targetPath}`
				);

				// Trigger a reload by sending an event - renderer will listen for this
				event.sender.send('story-restored');

				return {
					success: true,
					restoredStoryName: restoredName
				};
			} catch (error) {
				console.error('Error restoring backup:', error);
				return {
					success: false,
					restoredStoryName: '',
					error: (error as Error).message
				};
			}
		}
	);

	app.on('will-quit', async () => {
		if (Object.keys(storySavers).length > 0) {
			// Flush all pending story saves.

			for (const storyId of Object.keys(storySavers)) {
				console.log(`Flushing pending story saves for story ID ${storyId}`);
				await storySavers[storyId].flush();
			}

			console.log('All pending story saves flushed successfully');
		} else {
			console.log('No pending story saves to flush');
		}
	});
}
