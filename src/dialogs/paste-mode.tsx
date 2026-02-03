import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {DialogCard} from '../components/container/dialog-card';
import {CardContent} from '../components/container/card';
import {DialogComponentProps} from './dialogs.types';
import {PasteMode} from '../store/stories/action-creators/copy-paste-passages';

export interface PasteModeDialogProps extends DialogComponentProps {
	availableModes: PasteMode[];
	pasteCount: number;
	onPaste: (mode: PasteMode) => void;
}

export const PasteModeDialog: React.FC<PasteModeDialogProps> = ({
	availableModes,
	pasteCount,
	onPaste,
	onClose,
	...dialogProps
}) => {
	const {t} = useTranslation();
	const [selectedMode, setSelectedMode] = React.useState<PasteMode>(
		availableModes[0] ?? 'withoutLinks'
	);

	const handlePaste = () => {
		onPaste(selectedMode);
		onClose();
	};

	const handleCancel = () => {
		onClose();
	};

	return (
		<DialogCard
			className="paste-mode-dialog"
			fixedSize
			headerLabel={t('dialogs.pasteMode.title')}
			onClose={handleCancel}
			{...dialogProps}
		>
			<CardContent>
				<p>{t('dialogs.pasteMode.description', {count: pasteCount})}</p>
				<div className="paste-mode-options">
					{availableModes.includes('withoutLinks') && (
						<label>
							<input
								type="radio"
								name="pasteMode"
								value="withoutLinks"
								checked={selectedMode === 'withoutLinks'}
								onChange={() => setSelectedMode('withoutLinks')}
							/>
							<span>{t('dialogs.pasteMode.withoutLinks')}</span>
						</label>
					)}
					{availableModes.includes('withLinks') && (
						<label>
							<input
								type="radio"
								name="pasteMode"
								value="withLinks"
								checked={selectedMode === 'withLinks'}
								onChange={() => setSelectedMode('withLinks')}
							/>
							<span>{t('dialogs.pasteMode.withLinks')}</span>
						</label>
					)}
					{availableModes.includes('withInternalLinks') && (
						<label>
							<input
								type="radio"
								name="pasteMode"
								value="withInternalLinks"
								checked={selectedMode === 'withInternalLinks'}
								onChange={() => setSelectedMode('withInternalLinks')}
							/>
							<span>{t('dialogs.pasteMode.withInternalLinks')}</span>
						</label>
					)}
				</div>
				<div className="paste-mode-buttons">
					<button onClick={handlePaste}>{t('common.ok')}</button>
					<button onClick={handleCancel}>{t('common.cancel')}</button>
				</div>
			</CardContent>
		</DialogCard>
	);
};
