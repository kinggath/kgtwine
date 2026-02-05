import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {DialogCard} from '../components/container/dialog-card';
import {CardContent} from '../components/container/card';
import {DialogComponentProps} from './dialogs.types';
import './create-batch.css';

export interface CreateBatchDialogProps extends DialogComponentProps {
	onCreateBatch: (params: CreateBatchParams) => void;
	sourcePassageId?: string; // If right-clicked on a passage
}

export interface CreateBatchParams {
	count: number;
	baseName: string;
	orientation: 'horizontal' | 'vertical';
	autoLink: boolean;
	linkToSourceCard?: boolean; // Link new cards TO the source passage
	linkInternalChain?: boolean; // Link new cards to each other (vertical only)
	sourcePassageId?: string; // ID of passage that was right-clicked (for linking)
}

export const CreateBatchDialog: React.FC<CreateBatchDialogProps> = ({
	onCreateBatch,
	sourcePassageId,
	onClose,
	...dialogProps
}) => {
	const {t} = useTranslation();
	const [count, setCount] = React.useState(3);
	const [baseName, setBaseName] = React.useState('Passage');
	const [orientation, setOrientation] = React.useState<'horizontal' | 'vertical'>('horizontal');
	const [linkToSourceCard, setLinkToSourceCard] = React.useState(false);
	const [linkInternalChain, setLinkInternalChain] = React.useState(false);

	const handleCreate = () => {
		onCreateBatch({
			count: Math.max(1, Math.min(count, 100)), // Limit between 1 and 100
			baseName: baseName.trim() || 'Passage',
			orientation,
			autoLink: linkToSourceCard,
			linkToSourceCard,
			linkInternalChain,
			sourcePassageId
		});
		onClose();
	};

	const handleCancel = () => {
		onClose();
	};

	const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		if (!isNaN(value)) {
			setCount(value);
		}
	};

	const handleBaseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBaseName(e.target.value);
	};

	const handleOrientationChange = (newOrientation: 'horizontal' | 'vertical') => {
		setOrientation(newOrientation);
		// Reset linking options when orientation changes
		setLinkToSourceCard(false);
		setLinkInternalChain(false);
	};

	return (
		<DialogCard
			className="create-batch-dialog"
			fixedSize
			headerLabel={t('dialogs.createBatch.title')}
			onClose={handleCancel}
			{...dialogProps}
		>
			<CardContent>
				<div className="create-batch-form">
					{/* Number of cards */}
					<div className="form-group">
						<label htmlFor="card-count">
							{t('dialogs.createBatch.cardCount')}
						</label>
						<input
							id="card-count"
							type="number"
							min="1"
							max="100"
							value={count}
							onChange={handleCountChange}
						/>
					</div>

					{/* Base name */}
					<div className="form-group">
						<label htmlFor="base-name">
							{t('dialogs.createBatch.baseName')}
						</label>
						<input
							id="base-name"
							type="text"
							value={baseName}
							onChange={handleBaseNameChange}
							placeholder="Passage"
						/>
						<small>{t('dialogs.createBatch.baseNameHint')}</small>
					</div>

					{/* Orientation */}
					<div className="form-group">
						<fieldset>
							<legend>{t('dialogs.createBatch.orientation')}</legend>
							<div className="radio-options">
								<label>
									<input
										type="radio"
										name="orientation"
										value="horizontal"
										checked={orientation === 'horizontal'}
									onChange={() => handleOrientationChange('horizontal')}
								/>
								<span>{t('dialogs.createBatch.orientationHorizontal')}</span>
							</label>
							<label>
								<input
									type="radio"
									name="orientation"
									value="vertical"
									checked={orientation === 'vertical'}
									onChange={() => handleOrientationChange('vertical')}
									/>
									<span>{t('dialogs.createBatch.orientationVertical')}</span>
								</label>
							</div>
						</fieldset>
					</div>

					{/* Link to source card checkbox - when right-clicked on a passage */}
					{sourcePassageId && (
						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={linkToSourceCard}
									onChange={(e) => setLinkToSourceCard(e.target.checked)}
								/>
								<span>{t('dialogs.createBatch.linkToSourceCard')}</span>
							</label>
							{linkToSourceCard && (
								<small className="source-passage-hint">
									{orientation === 'horizontal'
										? t('dialogs.createBatch.linkToSourceCardHintHorizontal')
										: t('dialogs.createBatch.linkToSourceCardHintVertical')}
								</small>
							)}
						</div>
					)}

					{/* Link internal chain checkbox - only for vertical */}
					{orientation === 'vertical' && (
						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={linkInternalChain}
									onChange={(e) => setLinkInternalChain(e.target.checked)}
								/>
								<span>{t('dialogs.createBatch.linkCardsTogether')}</span>
							</label>
							{linkInternalChain && (
								<small className="source-passage-hint">
									{t('dialogs.createBatch.linkCardsTogetherHint')}
								</small>
							)}
						</div>
					)}
				</div>

				{/* Buttons */}
				<div className="create-batch-buttons">
					<button onClick={handleCreate}>{t('common.create')}</button>
					<button onClick={handleCancel}>{t('common.cancel')}</button>
				</div>
			</CardContent>
		</DialogCard>
	);
};
