import {RelativePassageEditorsAction} from './relative-passage-editors.types';

export function addRelativeEditor(
	passageId: string,
	storyId: string,
	passageCardPosition: {top: number; left: number; width: number; height: number}
): RelativePassageEditorsAction {
	return {type: 'add', passageId, storyId, passageCardPosition};
}

export function removeRelativeEditor(
	passageId: string
): RelativePassageEditorsAction {
	return {type: 'remove', passageId};
}

export function setActiveRelativeEditor(
	passageId: string | null
): RelativePassageEditorsAction {
	return {type: 'setActive', passageId};
}

export function closeAllRelativeEditors(): RelativePassageEditorsAction {
	return {type: 'closeAll'};
}
