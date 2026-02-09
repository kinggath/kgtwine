import {Color} from '../../util/color';
import {StoryFormat} from '../story-formats';

export type PrefsAction =
	| {type: 'init'; state: Partial<PrefsState>}
	| {
			type: 'update';
			name: keyof PrefsState;
			value:
				| boolean
				| number
				| string
				| string[]
				| {name: string; version: string}
				| {name: string; version: string}[]
				| Record<string, Color>;
	  }
	| {type: 'repair'; allFormats: StoryFormat[]};

export interface PrefsState {
	/**
	 *
	 */
	appTheme: 'dark' | 'light' | 'system';
	/**
	 * Font family for the story JS and stylesheet editor.
	 */
	codeEditorFontFamily: string;
	/**
	 * Font scale (1 being 100%) for the story JS and stylesheet editor.
	 */
	codeEditorFontScale: number;
	/**
	 * Width of side dialogs in pixels.
	 */
	dialogWidth: number;
	/**
	 * Story formats whose editor extensions should not be enabled.
	 */
	disabledStoryFormatEditorExtensions: {
		name: string;
		version: string;
	}[];
	/**
	 * Close all open passage editors when clicking off cards on the passage map.
	 */
	clickOffCardsToClose: boolean;
	/**
	 * Has the donation prompt been shown?
	 */
	donateShown: boolean;
	/**
	 * Disable right-click panning in the passage map.
	 */
	disableRightClickPan: boolean;
	/**
	 * Whether the cursor should blink in editor fields (passages, story JS, story
	 * stylesheet).
	 */
	editorCursorBlinks: boolean;
	/**
	 * Timestamp when the app was first run.
	 */
	firstRunTime: number;
	/**
	 * Last version number seen during an update check.
	 */
	lastUpdateSeen: string;
	/**
	 * Timestamp when the last update check occurred.
	 */
	lastUpdateCheckTime: number;
	/**
	 * User-set locale code.
	 */
	locale: string;
	/**
	 * Font family for the passage editor.
	 */
	passageEditorFontFamily: string;
	/**
	 * Font scale (1 being 100%) for the passage editor.
	 */
	passageEditorFontScale: number;
	/**
	 * Name and version of the selected proofing format.
	 */
	proofingFormat: {
		name: string;
		version: string;
	};
	/**
	 * Name and version of the default story format.
	 */
	storyFormat: {
		name: string;
		version: string;
	};
	/**
	 * Which story formats to show in the list route. This does not affect story
	 * formats shown when setting it on a story.
	 */
	storyFormatListFilter: 'current' | 'all' | 'user';
	/**
	 * How the story list should be sorted.
	 */
	storyListSort: 'date' | 'name';
	/**
	 * What tags the story list should show. This is additive, e.g. acts as
	 * logical OR, and an empty array equates to showing all stories.
	 */
	storyListTagFilter: string[];
	/**
	 * Colors for story tags.
	 */
	storyTagColors: Record<string, Color>;
	/**
	 * Use CodeMirror for text editing?
	 */
	useCodeMirror: boolean;
	/**
	 * Position passage edit dialogs next to the passage card instead of at the
	 * screen edge.
	 */
	passageRelativePosition: boolean;
	/**
	 * Opacity level (0-1) for inactive passage edit cards when passageRelativePosition is enabled.
	 * Also controls brightness inversely (0 = bright, 1 = normal).
	 */
	inactivePassageOpacity: number;
	/**
	 * Automatically open newly created passages in the editor with title autofocus.
	 */
	autoEditNewPassages: boolean;
	/**
	 * Where to focus when automatically opening newly created passages: 'title' for the passage title or 'content' for the passage content editor.
	 */
	newPassageInitialFocus: 'title' | 'content';
	/**
	 * Allow deleting passage links by clicking on them in the passage map.
	 */
	deleteLinksOnClick: boolean;
	/**
	 * Has the user been shown the welcome route?
	 */
	welcomeSeen: boolean;
}

export type PrefsDispatch = React.Dispatch<PrefsAction>;

export interface PrefsContextProps {
	dispatch: PrefsDispatch;
	prefs: PrefsState;
}
