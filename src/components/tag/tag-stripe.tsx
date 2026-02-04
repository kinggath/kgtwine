import * as React from 'react';
import {TagColors} from '../../store/stories';
import {isValidHexColor} from '../../util/color';
import './tag-stripe.css';

export interface TagStripeProps {
	tagColors: TagColors;
	tags: string[];
}

export const TagStripe: React.FC<TagStripeProps> = React.memo(props => {
	return (
		<div className="tag-stripe">
			{props.tags
				.filter(tag => tag in props.tagColors)
				.map(tag => {
					const color = props.tagColors[tag];
					const isHex = isValidHexColor(color as string);
					const style = isHex ? {backgroundColor: color} : undefined;

					return (
						<span
							className={isHex ? 'color-hex' : `color-${color}`}
							key={tag}
							title={tag}
							style={style}
						/>
					);
				})}
		</div>
	);
});

TagStripe.displayName = 'TagStripe';
