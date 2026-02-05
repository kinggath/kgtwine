import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {colors, Color} from '../../util/color';
import './color-picker.css';

export interface ColorPickerProps {
	color?: Color;
	onChangeColor: (color: Color) => void;
}

const PRESET_COLORS: Array<{value: typeof colors[number]; hexFallback?: string}> = [
	{value: 'red', hexFallback: '#EF5350'},
	{value: 'orange', hexFallback: '#FB8C00'},
	{value: 'yellow', hexFallback: '#FDD835'},
	{value: 'green', hexFallback: '#43A047'},
	{value: 'blue', hexFallback: '#1E88E5'},
	{value: 'purple', hexFallback: '#8E24AA'}
];

export const ColorPicker: React.FC<ColorPickerProps> = props => {
	const {color, onChangeColor} = props;
	const {t} = useTranslation();

	const isHexColor = color && color !== 'none' && !colors.includes(color as typeof colors[number]);
	const displayHex = isHexColor ? color : '';

	function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
		const hex = e.target.value;
		onChangeColor(hex);
	}

	return (
		<div className="color-picker">
			<div className="color-picker__presets">
				{PRESET_COLORS.map(preset => (
					<button
						key={preset.value}
						className={`color-picker__preset ${
							color === preset.value ? 'color-picker__preset--active' : ''
						}`}
						style={{backgroundColor: preset.hexFallback}}
						title={t(`colors.${preset.value}`)}
						onClick={() => onChangeColor(preset.value)}
						type="button"
					/>
				))}
				<button
					className={`color-picker__preset color-picker__preset--none ${
						color === 'none' || !color ? 'color-picker__preset--active' : ''
					}`}
					title={t('colors.none')}
					onClick={() => onChangeColor('none')}
					type="button"
				>
					✕
				</button>
			</div>

			<div className="color-picker__custom">
				<label className="color-picker__label">
					{t('common.customColor')}
				</label>
				<div className="color-picker__input-group">
					<input
						className="color-picker__color-input"
						type="color"
						value={displayHex || '#000000'}
						onChange={handleColorPickerChange}
					/>
					{displayHex && (
						<span className="color-picker__hex-display">{displayHex}</span>
					)}
				</div>
			</div>
		</div>
	);
};
