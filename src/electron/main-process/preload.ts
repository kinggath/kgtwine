// Exposes a limited set of Electron modules to a renderer process. Because the
// renderer processes load remote content (e.g. story formats), they must be
// isolated.
//
// For now, we cannot use context isolation here because of jsonp. For jsonp
// loading to work, it expects a global property to be set--but because it
// crosses a context boundary, that global is in the wrong place. For now, we
// place a privileged jsonp function into renderer context.

import {contextBridge, ipcRenderer} from 'electron';
import {Story} from '../../store/stories/stories.types';

contextBridge.exposeInMainWorld('twineElectron', {
	deleteStory(story: Story) {
		ipcRenderer.send('delete-story', story);
	},
	getAppPref(name: string) {
		return ipcRenderer.invoke('get-app-pref', name);
	},
	listBackups() {
		return ipcRenderer.invoke('list-backups');
	},
	loadBackupStories(backupPath: string) {
		return ipcRenderer.invoke('load-backup-stories', backupPath);
	},
	loadPrefs() {
		return ipcRenderer.invoke('load-prefs');
	},
	loadStories() {
		return ipcRenderer.invoke('load-stories');
	},
	loadStoryFormats() {
		return ipcRenderer.invoke('load-story-formats');
	},
	onceStoryRenamed(callback: () => void): void {
		ipcRenderer.once('story-renamed', callback);
	},
	onceStoryRestored(callback: () => void): void {
		ipcRenderer.once('story-restored', callback);
	},
	openWithScratchFile(data: string, filename: string) {
		ipcRenderer.send('open-with-scratch-file', data, filename);
	},
	renameStory(oldStory: Story, newStory: Story) {
		ipcRenderer.send('rename-story', oldStory, newStory);
	},
	restoreBackupStory(
		backupPath: string,
		backupFilePath: string,
		originalStoryName: string
	) {
		return ipcRenderer.invoke(
			'restore-backup-story',
			backupPath,
			backupFilePath,
			originalStoryName
		);
	},
	saveJson(filename: string, data: any) {
		ipcRenderer.send('save-json', filename, data);
	},
	saveStoryHtml(story: Story, data: string) {
		ipcRenderer.send('save-story-html', story, data);
	},
	setAppPref(name: string, value: unknown) {
		return ipcRenderer.invoke('set-app-pref', name, value);
	}
});