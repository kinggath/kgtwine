import * as React from 'react';
import {Passage} from '../../../store/stories';

export interface LinkDragArrowProps {
	sourcePassage: Passage | undefined;
	targetPassage: Passage | undefined;
	mouseX: number;
	mouseY: number;
	isActive: boolean;
}

/**
 * Renders an SVG arrow from the source passage card's handle to either:
 * - The mouse cursor (when no target is hovered)
 * - The center of the target passage card (when hovering over a valid target)
 *
 * Uses requestAnimationFrame to optimize re-renders during mouse movement.
 */
export const LinkDragArrow: React.FC<LinkDragArrowProps> = React.memo(props => {
	const {sourcePassage, targetPassage, mouseX, mouseY, isActive} = props;
	const [arrowPath, setArrowPath] = React.useState('');

	React.useEffect(() => {
		if (!isActive || !sourcePassage) {
			setArrowPath('');
			return;
		}

		const updateArrow = () => {
			// Calculate source position (bottom center of passage card)
			const sourceX = sourcePassage.left + sourcePassage.width / 2;
			const sourceY = sourcePassage.top + sourcePassage.height;

			// Calculate end position (target card center or mouse position)
			const endX = targetPassage
				? targetPassage.left + targetPassage.width / 2
				: mouseX;
			const endY = targetPassage
				? targetPassage.top + targetPassage.height / 2
				: mouseY;

			// Create a simple arrow path using a line with an arrowhead
			// We'll use a straight line for simplicity
			const path = `M ${sourceX} ${sourceY} L ${endX} ${endY}`;
			setArrowPath(path);
		};

		// Use requestAnimationFrame for smooth updates during drag
		const rafId = window.requestAnimationFrame(updateArrow);

		return () => window.cancelAnimationFrame(rafId);
	}, [sourcePassage, targetPassage, mouseX, mouseY, isActive]);

	if (!isActive || !sourcePassage) {
		return null;
	}

	return (
		<g className="link-drag-arrow">
			<defs>
				<marker
					id="link-drag-arrowhead"
					markerWidth="10"
					markerHeight="10"
					refX="9"
					refY="3"
					orient="auto"
				>
					<polygon points="0 0, 10 3, 0 6" fill="#4ade80" />
				</marker>
			</defs>
			<path
				d={arrowPath}
				stroke="#4ade80"
				strokeWidth="2"
				fill="none"
				markerEnd="url(#link-drag-arrowhead)"
				strokeDasharray={targetPassage ? '' : '5,5'}
				opacity={0.8}
			/>
		</g>
	);
});

LinkDragArrow.displayName = 'LinkDragArrow';
