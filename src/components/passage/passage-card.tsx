import classNames from 'classnames';
import {deviceType} from 'detect-it';
import * as React from 'react';
import {DraggableCore, DraggableCoreProps} from 'react-draggable';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import {Passage, TagColors} from '../../store/stories';
import {TagStripe} from '../tag/tag-stripe';
import {passageIsEmpty} from '../../util/passage-is-empty';
import {isValidHexColor} from '../../util/color';
import './passage-card.css';

export interface PassageCardProps {
	onEdit: (passage: Passage) => void;
	onDeselect: (passage: Passage) => void;
	onDragStart?: DraggableCoreProps['onStart'];
	onDrag?: DraggableCoreProps['onDrag'];
	onDragStop?: DraggableCoreProps['onStop'];
	onSelect: (passage: Passage, exclusive: boolean) => void;
	onContextMenu?: (passage: Passage, event: React.MouseEvent<HTMLDivElement>) => void;
	onLinkHandleMouseDown?: (passage: Passage, event: React.MouseEvent<HTMLDivElement>) => void;
	onLinkHandleMouseOver?: (passage: Passage) => void;
	onLinkHandleMouseLeave?: () => void;
	passage: Passage;
	tagColors: TagColors;
	highlightedTagNames?: string[];
}

// Needs to fill a large-sized passage card.
const excerptLength = 400;

export const PassageCard: React.FC<PassageCardProps> = React.memo(props => {
	const {
		onDeselect,
		onDrag,
		onDragStart,
		onDragStop,
		onEdit,
		onSelect,
		onContextMenu,
		onLinkHandleMouseDown,
		onLinkHandleMouseOver,
		onLinkHandleMouseLeave,
		passage,
		tagColors,
		highlightedTagNames
	} = props;
	const {t} = useTranslation();

	// Check if any of this passage's tags match the highlighted tags
	const isHighlighted = React.useMemo(() => {
		if (!highlightedTagNames || highlightedTagNames.length === 0) {
			return false;
		}
		return passage.tags.some(tag => highlightedTagNames.includes(tag));
	}, [passage.tags, highlightedTagNames]);

	// Get the color of the first matching tag
	const highlightColor = React.useMemo(() => {
		if (!isHighlighted || !highlightedTagNames) {
			return undefined;
		}
		const matchingTag = passage.tags.find(tag => highlightedTagNames.includes(tag));
		return matchingTag ? tagColors[matchingTag] : undefined;
	}, [isHighlighted, highlightedTagNames, passage.tags, tagColors]);

	function hexToRgb(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) {
			return '59, 130, 246'; // fallback to blue
		}
		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);
		return `${r}, ${g}, ${b}`;
	}

	const className = React.useMemo(
		() =>
			classNames('passage-card', {
				empty: passageIsEmpty(passage),
				selected: passage.selected,
				'tag-search-highlighted': isHighlighted
			}),
		[passage, isHighlighted]
	);
	const container = React.useRef<HTMLDivElement>(null);
	const excerpt = React.useMemo(() => {
		if (passage.text.length > 0) {
			return passage.text.substring(0, excerptLength);
		}

		return (
			<span className="placeholder">
				{t(
					deviceType === 'touchOnly'
						? 'components.passageCard.placeholderTouch'
						: 'components.passageCard.placeholderClick'
				)}
			</span>
		);
	}, [passage.text, t]);
	const style = React.useMemo(
		() => {
			const baseStyle: React.CSSProperties = {
				height: passage.height,
				left: passage.left,
				top: passage.top,
				width: passage.width
			};

			if (highlightColor && isHighlighted) {
				if (isValidHexColor(highlightColor as string)) {
					(baseStyle as any)['--highlight-color'] = hexToRgb(highlightColor as string);
				} else {
					// Map predefined color names to their RGB values
					const colorMap: {[key: string]: string} = {
						red: '239, 68, 68',
						orange: '249, 115, 22',
						yellow: '234, 179, 8',
						green: '34, 197, 94',
						blue: '59, 130, 246',
						purple: '147, 51, 234'
					};
					(baseStyle as any)['--highlight-color'] = colorMap[highlightColor as string] || '59, 130, 246';
				}
			}

			return baseStyle;
		},
		[passage.height, passage.left, passage.top, passage.width, highlightColor, isHighlighted]
	);
	const handleMouseDown = React.useCallback(
		(event: MouseEvent) => {
			// Shift- or control-clicking toggles our selected status, but doesn't
			// affect any other passage's selected status. If the shift or control key
			// was not held down and we were not already selected, we know the user
			// wants to select only this passage.

			if (event.shiftKey || event.ctrlKey) {
				if (passage.selected) {
					onDeselect(passage);
				} else {
					onSelect(passage, false);
				}
			} else if (!passage.selected) {
				onSelect(passage, true);
			}
		},
		[onDeselect, onSelect, passage]
	);
	const handleEdit = React.useCallback(
		() => onEdit(passage),
		[onEdit, passage]
	);
	const handleSelect = React.useCallback(
		(value: boolean, exclusive: boolean) => {
			onSelect(passage, exclusive);
		},
		[onSelect, passage]
	);
	const handleContextMenu = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.preventDefault();
			onContextMenu?.(passage, event);
		},
		[onContextMenu, passage]
	);

	const handleLinkHandleMouseDown = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.stopPropagation();
			onLinkHandleMouseDown?.(passage, event);
		},
		[onLinkHandleMouseDown, passage]
	);

	const handleLinkHandleMouseOver = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.stopPropagation();
			onLinkHandleMouseOver?.(passage);
		},
		[onLinkHandleMouseOver, passage]
	);

	const handleLinkHandleMouseLeave = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.stopPropagation();
			onLinkHandleMouseLeave?.();
		},
		[onLinkHandleMouseLeave, passage]
	);

	return (
		<DraggableCore
			nodeRef={container}
			onMouseDown={handleMouseDown}
			onStart={onDragStart}
			onDrag={onDrag}
			onStop={onDragStop}
			cancel=".passage-edit-inline"
		>
		<div
			className={className}
			ref={container}
			style={style}
			data-passage-tags={passage.tags.join(' ')}
			onContextMenu={handleContextMenu}
			onMouseOver={handleLinkHandleMouseOver}
			onMouseLeave={handleLinkHandleMouseLeave}
		>
				<div className="passage-card-inner">
					<SelectableCard
						highlighted={passage.highlighted}
						label={passage.name}
						onDoubleClick={handleEdit}
						onSelect={handleSelect}
						selected={passage.selected}
					>
						<TagStripe tagColors={tagColors} tags={passage.tags} />
						<h2>{passage.name}</h2>
						<CardContent>{excerpt}</CardContent>
					</SelectableCard>
					<div
						className="passage-card-link-handle"
						onMouseDown={handleLinkHandleMouseDown}
					/>
				</div>
			</div>
		</DraggableCore>
	);
});

PassageCard.displayName = 'PassageCard';
