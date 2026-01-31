import {
	RelativePassageEditorsAction,
	RelativePassageEditorsState
} from './relative-passage-editors.types';

export const reducer: React.Reducer<
	RelativePassageEditorsState,
	RelativePassageEditorsAction
> = (state, action) => {
	switch (action.type) {
		case 'add': {
			// Don't add duplicate editors
			if (state.editors.some(e => e.passageId === action.passageId)) {
				return state;
			}

			console.error('REDUCER ADDING EDITOR:', action.passageId);
			return {
				...state,
				editors: [...state.editors, {passageId: action.passageId, storyId: action.storyId, passageCardPosition: action.passageCardPosition}]
			};
		}

		case 'remove': {
			const remaining = state.editors.filter(e => e.passageId !== action.passageId);

			return {
				...state,
				editors: remaining
			};
		}

		case 'setActive': {
			return {
				...state,
				activePassageId: action.passageId
			};
		}

		case 'closeAll': {
			return {
				...state,
				editors: [],
				activePassageId: null
			};
		}

		default:
			return state;
	}
};
