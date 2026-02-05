import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {
	addTagsToPassages,
	Passage,
	storyPassageTags,
	Story
} from '../../../../store/stories';
import {useUndoableStoriesContext} from '../../../../store/undoable-stories';
import {AutocompleteTextInput} from '../../../../components/control/autocomplete-text-input';
import type {AutocompleteMetadata} from '../../../../components/control/autocomplete-text-input';
import {IconButton} from '../../../../components/control/icon-button';
import {IconPlus, IconCheck, IconX} from '@tabler/icons';
import {isValidTagName} from '../../../../util/tag';
import {TagButton} from '../../../../components/tag/tag-button';
import {ButtonBar} from '../../../../components/container/button-bar';
import {Color} from '../../../../util/color';
import './bulk-tag-passages-bar.css';

export interface BulkTagPassagesBarProps {
	passages: Passage[];
	story: Story;
	onClose: () => void;
}

export const BulkTagPassagesBar: React.FC<BulkTagPassagesBarProps> = props => {
	const {passages, story, onClose} = props;
	const {dispatch} = useUndoableStoriesContext();
	const {t} = useTranslation();
	const barRef = React.useRef<HTMLDivElement>(null);

	const allStoryTags = storyPassageTags(story);
	const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
	const [newTagName, setNewTagName] = React.useState('');
	const [selectedTagColors, setSelectedTagColors] = React.useState<Record<string, Color>>({});

	// Close bar when clicking outside
	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (barRef.current && !barRef.current.contains(event.target as Node)) {
				onClose();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onClose]);

	const tagCompletions = React.useMemo(
		() => allStoryTags.filter((tag: string) => !selectedTags.includes(tag)),
		[allStoryTags, selectedTags]
	);

	let validationMessage: string | undefined = undefined;
	let canAdd = isValidTagName(newTagName);

	if (!canAdd && newTagName !== '') {
		validationMessage = t('components.tagCardButton.invalidName');
	}

	if (canAdd) {
		canAdd = !selectedTags.includes(newTagName);

		if (!canAdd) {
			validationMessage = t('components.tagCardButton.alreadyAdded');
		}
	}

	function handleNewTagNameChange(
		event: React.ChangeEvent<HTMLInputElement>,
		metadata?: AutocompleteMetadata
	) {
		const value = event.target.value.replaceAll(' ', '-');

		if (metadata?.autocompleted) {
			addTag(value);
			return;
		}

		setNewTagName(value);
	}

	function addTag(tagName: string) {
		if (canAdd && tagName.trim() !== '') {
			setSelectedTags([...selectedTags, tagName]);
			setNewTagName('');
			// Initialize color from story or use default
			if (!selectedTagColors[tagName]) {
				setSelectedTagColors({
					...selectedTagColors,
					[tagName]: story.tagColors[tagName]
				});
			}
		}
	}

	function removeTag(tagName: string) {
		setSelectedTags(selectedTags.filter(tag => tag !== tagName));
		const newColors = {...selectedTagColors};
		delete newColors[tagName];
		setSelectedTagColors(newColors);
	}

	function handleChangeTagColor(tagName: string, color: Color) {
		setSelectedTagColors({
			...selectedTagColors,
			[tagName]: color
		});
	}

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (canAdd && newTagName.trim() !== '') {
			addTag(newTagName);
		}
	}

	function handleApply() {
		if (selectedTags.length === 0) {
			return;
		}

		dispatch(
			addTagsToPassages(story, passages, selectedTags, selectedTagColors),
			t('undoChange.addTagsToPassages')
		);

		onClose();
	}

	const passageCount = passages.length;

	return (
		<div ref={barRef} className="bulk-tag-passages-bar">
			<div className="bulk-tag-passages-bar__content">
				<span className="bulk-tag-passages-bar__title">
					{t('dialogs.bulkTagPassages.title', {count: passageCount})}
				</span>

				<form className="bulk-tag-passages-bar__form" onSubmit={handleSubmit}>
					<AutocompleteTextInput
						completions={tagCompletions}
						id="bulk-tag-input"
						onChange={handleNewTagNameChange}
						value={newTagName}
					>
						{t('components.tagCardButton.tagNameLabel')}
					</AutocompleteTextInput>
					<IconButton
						buttonType="submit"
						disabled={!canAdd}
						icon={<IconPlus />}
						label={t('common.add')}
						variant="create"
					/>
					{validationMessage && (
						<span className="bulk-tag-passages-bar__error">
							{validationMessage}
						</span>
					)}
				</form>

				{selectedTags.length > 0 && (
					<div className="bulk-tag-passages-bar__selected-tags">
						<span className="bulk-tag-passages-bar__selected-tags-label">
							{t('dialogs.bulkTagPassages.selectedTagsLabel')}
						</span>
						<div className="bulk-tag-passages-bar__tags">
							{selectedTags.map(tag => (
								<TagButton
									key={tag}
									name={tag}
									color={selectedTagColors[tag] ?? story.tagColors[tag]}
									onChangeColor={color => handleChangeTagColor(tag, color)}
									onRemove={() => removeTag(tag)}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			<ButtonBar>
				<IconButton
					icon={<IconCheck />}
					label={t('common.apply')}
					onClick={handleApply}
					variant="primary"
				/>
				<IconButton
					icon={<IconX />}
					label={t('common.cancel')}
					onClick={onClose}
				/>
			</ButtonBar>
		</div>
	);
};
