// See https://stackoverflow.com/a/64174790

export const colors = [
	'none',
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple'
];

export type PredefinedColor = typeof colors[number];
export type Color = PredefinedColor | string; // string for hex colors like "#FF0000"

/**
 * Validates if a value is a valid hex color code (e.g., "#FF0000" or "#fff").
 */
export function isValidHexColor(value: string): boolean {
	return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(value);
}

/**
 * Generates a hue (as in the HSL colorspace) for a string.
 */
export function hueString(value: string): number {
	let result = 0;

	for (let i = 0; i < value.length; i++) {
		result += value.charCodeAt(i);
	}

	return result % 360;
}

/**
 * Generates a color name for a string, roughly mapping hueString() to colors.
 */
export function colorString(value: string): Color {
	const hue = hueString(value);

	// Red clusters at the top and bottom of the hue range.

	if (hue < 20) {
		return 'red';
	}

	if (hue < 50) {
		return 'orange';
	}

	if (hue < 75) {
		return 'yellow';
	}

	if (hue < 180) {
		return 'green';
	}

	if (hue < 270) {
		return 'blue';
	}

	if (hue < 330) {
		return 'purple';
	}

	return 'red';
}