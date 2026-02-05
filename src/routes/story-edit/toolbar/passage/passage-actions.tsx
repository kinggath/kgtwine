import * as React from 'react';
import {ButtonBar} from '../../../../components/container/button-bar';
import {RenamePassageButton} from '../../../../components/passage/rename-passage-button';
import {
	Passage,
	Story,
	updatePassage,
	useStoriesContext
} from '../../../../store/stories';
import {Point} from '../../../../util/geometry';
import {CreatePassageButton} from './create-passage-button';
import {DeletePassagesButton} from './delete-passages-button';
import {EditPassagesButton} from './edit-passages-buttons';
import {GoToPassageButton} from './go-to-passage-button';
import {SelectAllPassagesButton} from './select-all-passages-button';
import {DeselectAllPassagesButton} from './deselect-all-passages-button';
import {StartAtPassageButton} from './start-at-passage-button';
import {TestPassageButton} from './test-passage-button';
import {CloseAllPassagesButton} from './close-all-passages-button';
import {BulkTagPassagesButton} from './bulk-tag-passages-button';
import {BulkTagPassagesBar} from './bulk-tag-passages-bar';
import {SearchByTagButton} from './search-by-tag-button';
import {SearchByTagBar} from './search-by-tag-bar';

export interface PassageActionsProps {
	getCenter: () => Point;
	onOpenFuzzyFinder: () => void;
	story: Story;
	searchByTagOpen?: boolean;
	onSearchByTagToggle?: () => void;
	highlightedTagNames?: string[];
	onHighlightedTagNamesChange?: (tags: string[]) => void;
}

export const PassageActions: React.FC<PassageActionsProps> = props => {
	const {
		getCenter,
		onOpenFuzzyFinder,
		story,
		searchByTagOpen,
		onSearchByTagToggle,
		highlightedTagNames,
		onHighlightedTagNamesChange
	} = props;
	const {dispatch} = useStoriesContext();
	const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
	const selectedPassages = React.useMemo(
		() => story.passages.filter(passage => passage.selected),
		[story.passages]
	);
	const soloSelectedPassage = React.useMemo(
		() => (selectedPassages.length === 1 ? selectedPassages[0] : undefined),
		[selectedPassages]
	);

	function handleRename(name: string, passage?: Passage) {
		if (!passage) {
			throw new Error('Passage is unset');
		}

		// Don't create newly linked passages here because the update action will
		// try to recreate the passage as it's been renamed--it sees new links in
		// existing passages, updates them, but does not see that the passage name
		// has been updated since that hasn't happened yet.

		dispatch(updatePassage(story, passage, {name}, {dontUpdateOthers: true}));
	}

	return (
		<>
			<ButtonBar>
				<CreatePassageButton getCenter={getCenter} story={story} />
				<EditPassagesButton passages={selectedPassages} story={story} />
				<RenamePassageButton
					onRename={name => handleRename(name, soloSelectedPassage)}
					passage={soloSelectedPassage}
					story={story}
				/>
				<DeletePassagesButton passages={selectedPassages} story={story} />
				<BulkTagPassagesButton
					isOpen={bulkTagOpen}
					passages={selectedPassages}
					story={story}
					onToggleOpen={setBulkTagOpen}
				/>
				{onSearchByTagToggle && (
					<SearchByTagButton
						onClick={onSearchByTagToggle}
						disabled={!story.passages.some(p => p.tags.length > 0)}
					/>
				)}
				<TestPassageButton passage={soloSelectedPassage} story={story} />
				<StartAtPassageButton passage={soloSelectedPassage} story={story} />
				<GoToPassageButton onOpenFuzzyFinder={onOpenFuzzyFinder} />
				<SelectAllPassagesButton story={story} />
				<DeselectAllPassagesButton
					story={story}
					selectedPassages={selectedPassages}
				/>
				<CloseAllPassagesButton />
			</ButtonBar>
			{bulkTagOpen && (
				<BulkTagPassagesBar
					passages={selectedPassages}
					story={story}
					onClose={() => setBulkTagOpen(false)}
				/>
			)}
			{searchByTagOpen && highlightedTagNames !== undefined && onHighlightedTagNamesChange && (
				<SearchByTagBar
					story={story}
					highlightedTags={highlightedTagNames}
					onHighlightedTagsChange={onHighlightedTagNamesChange}
					onClose={onSearchByTagToggle}
				/>
			)}
		</>
	);
};
