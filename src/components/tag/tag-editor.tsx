import * as React from 'react';
import {useTranslation} from 'react-i18next';
import classNames from 'classnames';
import {IconWriting} from '@tabler/icons';
import {Color, isValidHexColor} from '../../util/color';
import {PromptButton, PromptValidationResponse} from '../control/prompt-button';
import {ColorPicker} from '../control/color-picker';
import './tag-editor.css';

export interface TagEditorProps {
	allTags: string[];
	color?: Color;
	name: string;
	onChangeColor: (color: Color) => void;
	onChangeName: (name: string) => void;
}

export const TagEditor: React.FC<TagEditorProps> = props => {
	const {allTags, color, name, onChangeColor, onChangeName} = props;
	const [newName, setNewName] = React.useState(name);
	const {t} = useTranslation();

	function validate(value: string): PromptValidationResponse {
		if (value !== name && allTags.includes(value)) {
			return {message: t('components.tagEditor.alreadyExists'), valid: false};
		}

		return {valid: true};
	}

	function hexToRgb(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) {
			return '0, 0, 0';
		}
		return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
	}

	const isHex = isValidHexColor(props.color as string);
	const style = isHex ? {'--hex-rgb': hexToRgb(props.color as string)} as React.CSSProperties : undefined;

	return (
		<div className="tag-editor">
			<span 
				className={classNames('tag-name', {
					'tag-name--hex': isValidHexColor(props.color as string),
					[`color-${props.color}`]: !isValidHexColor(props.color as string)
				})}
				style={style}
			>
				{props.name}
			</span>
			<PromptButton
				icon={<IconWriting />}
				label={t('common.rename')}
				onChange={e => setNewName(e.target.value.replace(/\s/g, '-'))}
				onSubmit={() => onChangeName(newName)}
				prompt={t('common.renamePrompt', {name})}
				value={newName}
				validate={validate}
			/>
			<ColorPicker
				color={color}
				onChangeColor={onChangeColor}
			/>
		</div>
	);
};
