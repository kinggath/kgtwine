export interface RelativeEditor {
	passageId: string;
	storyId: string;
	passageCardPosition: {
		top: number;
		left: number;
		width: number;
		height: number;
	};
	isNewlyCreated?: boolean;
}

export interface RelativePassageEditorsState {
	editors: RelativeEditor[];
	activePassageId: string | null;
}

export type RelativePassageEditorsAction =
	| {type: 'add'; passageId: string; storyId: string; passageCardPosition: {top: number; left: number; width: number; height: number}; isNewlyCreated?: boolean}
	| {type: 'remove'; passageId: string}
	| {type: 'setActive'; passageId: string | null}
	| {type: 'closeAll'};

export type RelativePassageEditorsDispatch = React.Dispatch<
	RelativePassageEditorsAction
>;

export interface RelativePassageEditorsContextProps {
	dispatch: RelativePassageEditorsDispatch;
	state: RelativePassageEditorsState;
}
