import * as React from 'react';
import {IconDeviceFloppy, IconHelp, IconMoodSmile} from '@tabler/icons';
import {IconFavicon} from '../../components/image/icon';
import {isElectronRenderer} from '../../util/is-electron';

export const content = () => [
	{
		html: 'routes.welcome.greeting',
		image: <IconFavicon />,
		nextLabel: 'routes.welcome.tellMeMore',
		title: 'routes.welcome.greetingTitle'
	},
	{
		html: 'routes.welcome.help',
		image: <IconHelp />,
		title: 'routes.welcome.helpTitle'
	},
	isElectronRenderer()
		? {
				html: 'routes.welcome.autosave',
				image: <IconDeviceFloppy />,
				title: 'routes.welcome.autosaveTitle'
		  }
		: {
				html: 'routes.welcome.browserStorage',
				image: <IconDeviceFloppy />,
				title: 'routes.welcome.browserStorageTitle'
		  },
	{
		html: 'routes.welcome.done',
		image: <IconMoodSmile />,
		nextLabel: 'routes.welcome.gotoStoryList',
		title: 'routes.welcome.doneTitle'
	}
];
