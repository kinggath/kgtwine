import * as React from 'react';
import {IconAlertCircle, IconCheck, IconChevronDown, IconChevronRight, IconRotateClockwise, IconX} from '@tabler/icons';
import {useTranslation} from 'react-i18next';
import {DialogCard} from '../components/container/dialog-card';
import {IconButton} from '../components/control/icon-button';
import {
	AggregatedFindings,
	PreviewChange,
	ScanSummary
} from '../tools/ascii-scrubber';
import {
	applyAsciiScrubberChanges,
	scanStoryForNonAscii
} from '../store/stories/action-creators/ascii-scrubber';
import {storyWithId} from '../store/stories/getters';
import {useUndoableStoriesContext} from '../store/undoable-stories';
import {DialogComponentProps} from './dialogs.types';
import './ascii-scrubber.css';

export type AsciiScrubberStage = 'scan' | 'preview' | 'applied' | 'no-findings' | 'error';

export interface AsciiScrubberDialogProps extends DialogComponentProps {
	storyId: string;
	stage: AsciiScrubberStage;
	previewChanges: PreviewChange[];
	summary: ScanSummary | null;
	aggregated: AggregatedFindings | null;
	errorMessage: string | null;
}

export const AsciiScrubberDialog: React.FC<AsciiScrubberDialogProps> = props => {
	const {
		storyId,
		stage,
		previewChanges,
		summary,
		aggregated,
		errorMessage,
		onClose,
		onChangeProps,
		...other
	} = props;

	const {dispatch, stories} = useUndoableStoriesContext();
	const {t} = useTranslation();
	const story = storyWithId(stories, storyId);
	const [findingsExpanded, setFindingsExpanded] = React.useState(false);

	if (!story) {
		return null;
	}

	// Auto-scan when dialog opens in scan stage
	React.useEffect(() => {
		if (stage === 'scan') {
			handleScan();
		}
	}, [stage]);

	function patchProps(newProps: Partial<AsciiScrubberDialogProps>) {
		onChangeProps({
			storyId,
			stage: newProps.stage ?? stage,
			previewChanges: newProps.previewChanges ?? previewChanges,
			summary: newProps.summary ?? summary,
			aggregated: newProps.aggregated ?? aggregated,
			errorMessage: newProps.errorMessage ?? errorMessage
		});
	}

	function handleScan() {
		try {
			const result = (scanStoryForNonAscii(storyId) as any)(dispatch, () => stories);

			patchProps({
				stage: result.previewChanges.length > 0 ? 'preview' : 'no-findings',
				summary: result.summary,
				previewChanges: result.previewChanges,
				aggregated: result.aggregated,
				errorMessage: null
			});
		} catch (error) {
			patchProps({
				stage: 'error',
				errorMessage: error instanceof Error ? error.message : String(error)
			});
		}
	}

	function handleApply() {
		try {
			// Dispatch through undoable context to enable undo/redo
			dispatch(
				applyAsciiScrubberChanges(storyId, previewChanges),
				'undoChange.asciiScrubber'
			);

			patchProps({
				stage: 'applied',
				errorMessage: null
			});
		} catch (error) {
			patchProps({
				stage: 'error',
				errorMessage: error instanceof Error ? error.message : String(error)
			});
		}
	}

	return (
		<>
			<DialogCard
				{...other}
				className="ascii-scrubber-dialog"
				headerLabel={t('dialogs.asciiScrubber.title')}
				onClose={onClose}
			>
				{stage === 'scan' && (
					<div className="ascii-scrubber-scan-stage">
						<p>{t('dialogs.asciiScrubber.scanning')}</p>
					</div>
				)}

				{stage === 'preview' && summary && aggregated && (
					<div className="ascii-scrubber-preview-stage">
						<div className="summary">
							<h3>{t('dialogs.asciiScrubber.summary')}</h3>
							<ul>
								<li>
									{t('dialogs.asciiScrubber.totalFindings', {
										count: summary.totalFindings
									})}
								</li>
								<li>
									{t('dialogs.asciiScrubber.affectedPassages', {
										count: summary.affectedPassages.size
									})}
								</li>
								<li>
									{t('dialogs.asciiScrubber.affectedFields', {
										count: summary.affectedFields
									})}
								</li>
							</ul>
						</div>

						<div className="findings-list">
						<h3 className="collapsible-header" onClick={() => setFindingsExpanded(!findingsExpanded)}>
							{findingsExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
							{t('dialogs.asciiScrubber.findings')}
						</h3>
						{findingsExpanded && aggregated.passages.map(passage => (
								<div key={passage.passageId} className="passage-group">
									<h4>{passage.passageName}</h4>
									{passage.fields.map((field, fieldIndex) => (
										<div key={`${passage.passageId}-${fieldIndex}`} className="field-group">
											<h5>
												{field.fieldIndex !== undefined
													? `${field.fieldName}[${field.fieldIndex}]`
													: field.fieldName}
											</h5>
											<ul className="char-list">
												{field.findings.map((finding, charIndex) => (
													<li key={`${passage.passageId}-${fieldIndex}-${charIndex}`}>
														<div className="finding-detail">
															<code className="char">{finding.char}</code>
															<span className="hex">{finding.hex}</span>
															<span className="codepoint">
																U+{finding.codePoint.toString(16).toUpperCase()}
															</span>
														</div>
														<div className="context">
															<em>{finding.context}</em>
														</div>
														<div className="replacement">
															→ <code>{finding.suggestedReplacement || '(empty)'}</code>
														</div>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							))}
						</div>

						<div className="preview-section">
							<h3>{t('dialogs.asciiScrubber.beforeAndAfter')}</h3>
							{previewChanges.slice(0, 3).map((change, idx) => (
								<div key={idx} className="preview-item">
									<div className="preview-location">
										{change.loc.field}
										{change.loc.fieldIndex !== undefined
											? `[${change.loc.fieldIndex}]`
											: ''}
									</div>
									<div className="preview-before">
										<strong>{t('dialogs.asciiScrubber.before')}:</strong>
										<pre>{change.before}</pre>
									</div>
									<div className="preview-after">
										<strong>{t('dialogs.asciiScrubber.after')}:</strong>
										<pre>{change.after}</pre>
									</div>
								</div>
							))}
							{previewChanges.length > 3 && (
								<p>
									{t('dialogs.asciiScrubber.andMore', {
										count: previewChanges.length - 3
									})}
								</p>
							)}
						</div>

						<div className="action-buttons">
							<IconButton
								icon={<IconCheck />}
								label={t('dialogs.asciiScrubber.apply')}
								onClick={handleApply}
								variant="danger"
							/>
							<IconButton
								icon={<IconX />}
								label={t('dialogs.asciiScrubber.cancel')}
								onClick={() => patchProps({stage: 'scan'})}
								variant="secondary"
							/>
						</div>
					</div>
				)}

				{stage === 'applied' && (
					<div className="ascii-scrubber-applied-stage">
						<div className="success-message">
							<IconCheck style={{color: 'green'}} />
							<p>{t('dialogs.asciiScrubber.applied')}</p>
						</div>
						<div className="applied-actions">
							<IconButton
							icon={<IconRotateClockwise />}
								label={t('dialogs.asciiScrubber.rescan')}
								onClick={() => patchProps({stage: 'scan'})}
								variant="primary"
							/>
						</div>
					</div>
				)}

				{stage === 'no-findings' && (
					<div className="ascii-scrubber-no-findings-stage">
						<p>{t('dialogs.asciiScrubber.noFindings')}</p>
						<IconButton
							icon={<IconCheck />}
							label={t('common.ok')}
							onClick={onClose}
							variant="primary"
						/>
					</div>
				)}

				{stage === 'error' && (
					<div className="ascii-scrubber-error-stage">
						<IconAlertCircle style={{color: 'red'}} />
						<p className="error-message">{errorMessage}</p>
						<IconButton
							icon={<IconX />}
							label={t('dialogs.asciiScrubber.dismiss')}
							onClick={() => patchProps({stage: 'scan', errorMessage: null})}
							variant="primary"
						/>
					</div>
				)}
			</DialogCard>

		</>
	);
};
