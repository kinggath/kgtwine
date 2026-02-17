import * as React from 'react';
import {CardContent} from '../components/container/card';
import {DialogCard} from '../components/container/dialog-card';
import {IconLoading} from '../components/image/icon';
import {DialogComponentProps} from './dialogs.types';
import './relocating-passages.css';

export const RelocatingPassagesDialog: React.FC<DialogComponentProps> = props => {
	return (
		<DialogCard
			{...props}
			className="relocating-passages-dialog"
			fixedSize
			headerLabel="Relocating passages"
			// Prevent user interaction by not providing onClose
		>
			<CardContent>
				<div className="relocating-passages-content">
					<IconLoading />
					<span>Relocating passages to prevent overlaps…</span>
				</div>
			</CardContent>
		</DialogCard>
	);
};
