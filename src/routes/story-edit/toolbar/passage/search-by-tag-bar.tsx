import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconPlus, IconX} from '@tabler/icons';
import {Story, storyPassageTags} from '../../../../store/stories';
import {AutocompleteTextInput} from '../../../../components/control/autocomplete-text-input';
import type {AutocompleteMetadata} from '../../../../components/control/autocomplete-text-input';
import {IconButton} from '../../../../components/control/icon-button';
import {TagButton} from '../../../../components/tag/tag-button';
import './search-by-tag-bar.css';

export interface SearchByTagBarProps {
	story: Story;
	highlightedTags: string[];
	onHighlightedTagsChange: (tags: string[]) => void;
	onClose?: () => void;
}

export const SearchByTagBar: React.FC<SearchByTagBarProps> = props => {
	const {story, highlightedTags, onHighlightedTagsChange, onClose} = props;
	const {t} = useTranslation();
	const [tagInput, setTagInput] = React.useState('');
	const barRef = React.useRef<HTMLDivElement>(null);

	const allTags = storyPassageTags(story);
	const availableTags = allTags.filter(tag => !highlightedTags.includes(tag));
	const tagCompletions = availableTags.filter(tag =>
		tag.toLowerCase().startsWith(tagInput.toLowerCase())
	);

	function handleTagInputChange(
		event: React.ChangeEvent<HTMLInputElement>,
		metadata?: AutocompleteMetadata
	) {
		const value = event.target.value;

		if (metadata?.autocompleted) {
			// Tag was autocompleted, add it to highlighted tags
			if (value && !highlightedTags.includes(value)) {
				onHighlightedTagsChange([...highlightedTags, value]);
				setTagInput('');
			}
			return;
		}

		setTagInput(value);
	}

	function handleAddTag(tag: string) {
		if (tag && !highlightedTags.includes(tag)) {
			onHighlightedTagsChange([...highlightedTags, tag]);
			setTagInput('');
		}
	}

	function handleRemoveTag(tag: string) {
		onHighlightedTagsChange(highlightedTags.filter(t => t !== tag));
	}

	function handleClearAll() {
		onHighlightedTagsChange([]);
		setTagInput('');
	}

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (barRef.current && !barRef.current.contains(event.target as Node)) {
				onClose?.();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [onClose]);

	return (
		<div ref={barRef} className="search-by-tag-bar">
			<div className="search-by-tag-bar__content">
				<span className="search-by-tag-bar__title">
					{t('dialogs.searchByTag.title')}
				</span>

				<form className="search-by-tag-bar__form" onSubmit={(e) => { e.preventDefault(); handleAddTag(tagInput); }}>
					<AutocompleteTextInput
						completions={tagCompletions}
						id="search-by-tag-input"
						onChange={handleTagInputChange}
						value={tagInput}
					>
						{t('components.tagCardButton.tagNameLabel')}
					</AutocompleteTextInput>
					<IconButton
						disabled={!tagInput || highlightedTags.includes(tagInput)}
						icon={<IconPlus />}
						label={t('common.add')}
						variant="create"
					/>
				</form>

				{highlightedTags.length > 0 && (
					<div className="search-by-tag-bar__selected-tags">
						<span className="search-by-tag-bar__selected-tags-label">
							{t('dialogs.searchByTag.selectedTagsLabel')}
						</span>
						<div className="search-by-tag-bar__selected-tags-list">
							{highlightedTags.map(tag => (
								<TagButton
									key={tag}
									name={tag}
									color={story.tagColors[tag]}
									onChangeColor={() => {
										/* No-op - we're not changing colors in search mode */
									}}
									onRemove={() => handleRemoveTag(tag)}
									variant="removable"
								/>
							))}
						</div>
                        <div>
                            <IconButton
                                icon={<IconX />}
                                label={t('common.clear')}
                                onClick={handleClearAll}
                            />
                        </div>
					</div>
				)}
			</div>
		</div>
	);
};
