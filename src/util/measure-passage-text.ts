/**
 * Utility to measure the dimensions needed to display passage text in Full View mode.
 * Uses canvas text measurement for accurate sizing.
 */

const MAX_SIZE = 200; // Maximum width/height in pixels (matches "Large" preset size)
const FONT_SIZE = 85; // Percentage (from passage-card.css)
const PADDING = 5; // Grid size / 2 in pixels
const BASE_FONT_SIZE = 16; // Browser default

/**
 * Measures the dimensions needed to display passage text without truncation.
 * Uses canvas-based text measurement for accuracy.
 *
 * @param text - The passage text to measure
 * @returns Object with width and height in pixels, capped at reasonable maximums
 */
export function measurePassageText(text: string): {width: number; height: number} {
	if (!text || text.length === 0) {
		// Return default passage size for empty text
		return {width: 100, height: 100};
	}

	// Use canvas to measure text
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		// Fallback if canvas context unavailable
		return estimatePassageTextDimensions(text);
	}

	// Match the font from passage-card.css
	const actualFontSize = (FONT_SIZE / 100) * BASE_FONT_SIZE;
	ctx.font = `${actualFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

	// Split text into lines and measure
	const lines = text.split('\n');
	let maxLineWidth = 0;

	for (const line of lines) {
		const metrics = ctx.measureText(line);
		maxLineWidth = Math.max(maxLineWidth, metrics.width);
	}

	// Calculate dimensions with padding and margins
	// For balanced expansion, use a wider base width to encourage horizontal expansion
	const idealWidth = Math.max(500, Math.ceil(maxLineWidth) + PADDING * 2);
	const lineHeight = actualFontSize * 1.5; // Typical line height ratio
	const idealHeight = Math.ceil(lines.length * lineHeight) + PADDING * 2;

	// Cap at reasonable maximums but use equal constraints for square-like expansion
	const width = Math.min(idealWidth, MAX_SIZE);
	const height = Math.min(idealHeight, MAX_SIZE);

	// Ensure minimum size
	return {
		width: Math.max(150, width),
		height: Math.max(150, height)
	};
}

/**
 * Fallback estimation when canvas measurement is unavailable.
 * Estimates dimensions based on text length and character width.
 */
function estimatePassageTextDimensions(text: string): {width: number; height: number} {
	// Rough estimates: average character width ~8px, line height ~24px
	const avgCharWidth = 8;
	const lineHeight = 24;
	const assumedWidth = 600; // Assume text will wrap to this wider width for balanced expansion

	const estimatedWidth = Math.min(text.length * avgCharWidth * 0.6, 900);
	let estimatedHeight = (text.length / (assumedWidth / avgCharWidth)) * lineHeight;

	// Add padding
	estimatedHeight += PADDING * 2;

	// Cap at maximums (using MAX_SIZE for both dimensions)
	return {
		width: Math.min(Math.max(150, estimatedWidth), MAX_SIZE),
		height: Math.min(Math.max(150, estimatedHeight), MAX_SIZE)
	};
}
