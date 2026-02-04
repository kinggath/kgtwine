import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {RouteToolbar} from '../../../components/route-toolbar';
import {AppActions, BuildActions} from '../../../route-actions';
import {Story} from '../../../store/stories';
import {Point} from '../../../util/geometry';
import {PassageActions} from './passage/passage-actions';
import {StoryActions} from './story/story-actions';
import {UndoRedoButtons} from './undo-redo-buttons';
import {ZoomButtons} from './zoom-buttons';

export interface StoryEditToolbarProps {
	getCenter: () => Point;
	onOpenFuzzyFinder: () => void;
	story: Story;
	searchByTagOpen?: boolean;
	onSearchByTagToggle?: () => void;
	highlightedTagNames?: string[];
	onHighlightedTagNamesChange?: (tags: string[]) => void;
}

export const StoryEditToolbar: React.FC<StoryEditToolbarProps> = props => {
	const {
		getCenter,
		onOpenFuzzyFinder,
		story,
		searchByTagOpen,
		onSearchByTagToggle,
		highlightedTagNames,
		onHighlightedTagNamesChange
	} = props;
	const {t} = useTranslation();

	return (
		<RouteToolbar
			pinnedControls={
				<>
					<ZoomButtons story={story} />
					<UndoRedoButtons />
				</>
			}
			tabs={{
				[t('common.passage')]: (
					<PassageActions
						getCenter={getCenter}
						onOpenFuzzyFinder={onOpenFuzzyFinder}
						story={story}
						searchByTagOpen={searchByTagOpen}
						onSearchByTagToggle={onSearchByTagToggle}
						highlightedTagNames={highlightedTagNames}
						onHighlightedTagNamesChange={onHighlightedTagNamesChange}
					/>
				),
				[t('common.story')]: <StoryActions story={story} />,
				[t('common.build')]: <BuildActions story={story} />,
				[t('common.appName')]: <AppActions />
			}}
		/>
	);
};
