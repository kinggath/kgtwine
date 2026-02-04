import * as React from 'react';
import classNames from 'classnames';
import {useTranslation} from 'react-i18next';
import {IconChevronDown} from '@tabler/icons';
import {Color, isValidHexColor} from '../../util/color';
import {ColorPicker} from '../control/color-picker';
import './tag-button.css';

export interface TagButtonProps {
	color?: Color;
	disabled?: boolean;
	name: string;
	onChangeColor: (color: Color) => void;
	onRemove: () => void;
}

export const TagButton: React.FC<TagButtonProps> = props => {
	const {t} = useTranslation();
	const [open, setOpen] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement>(null);

	function hexToRgb(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) {
			return '0, 0, 0';
		}
		return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
	}

	React.useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [open]);

	const isHex = isValidHexColor(props.color as string);
	const style = isHex ? {'--hex-rgb': hexToRgb(props.color as string)} as React.CSSProperties : undefined;

	return (
		<div 
			ref={menuRef}
			className={classNames('tag-button', {
				'tag-button--hex': isValidHexColor(props.color as string),
				[`color-${props.color}`]: !isValidHexColor(props.color as string),
				'tag-button--open': open
			})}
			style={style}
		>
			<button
				className="tag-button__trigger"
				disabled={props.disabled}
				onClick={() => setOpen(!open)}
				type="button"
			>
				{props.name}
				<IconChevronDown size={16} />
			</button>

			{open && (
				<div className="tag-button__dropdown">
					<ColorPicker
						color={props.color}
						onChangeColor={props.onChangeColor}
					/>
					<div className="tag-button__dropdown-separator" />
					<button
						className="tag-button__dropdown-item tag-button__dropdown-item--remove"
						onClick={props.onRemove}
						type="button"
					>
						{t('common.remove')}
					</button>
				</div>
			)}
		</div>
	);
};
