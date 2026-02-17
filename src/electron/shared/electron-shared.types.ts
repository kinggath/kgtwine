import {Story} from '../../store/stories/stories.types';

export interface BackupDirectory {
	path: string;
	timestamp: Date;
	name: string;
}

export interface BackupStory extends Story {
	backupPath: string;
	backupTimestamp: Date;
}

export interface RestoreResult {
	success: boolean;
	restoredStoryName: string;
	error?: string;
}

export interface TwineElectronWindow extends Window {
	twineElectron?: {
		deleteStory(story: Story): void;
		getAppPref(name: string): Promise<unknown>;
		listBackups(): Promise<BackupDirectory[]>;
		loadBackupStories(backupPath: string): Promise<BackupStory[]>;
		loadPrefs(): Promise<any>;
		loadStories(): Promise<any>;
		loadStoryFormats(): Promise<any>;
		onceStoryRenamed(callback: () => void): void;
		onceStoryRestored(callback: () => void): void;
		openWithScratchFile(data: string, filename: string): void;
		renameStory(oldStory: Story, newStory: Story): void;
		restoreBackupStory(
			backupPath: string,
			backupFilePath: string,
			originalStoryName: string
		): Promise<RestoreResult>;
		saveStoryHtml(story: Story, data: string): void;
		saveJson(filename: string, data: any): void;
		setAppPref(name: string, value: unknown): Promise<void>;
	};
}
