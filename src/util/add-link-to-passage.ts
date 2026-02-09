import {parseLinks} from './parse-links';

/**
 * Adds a link from source passage text to a target passage.
 * The link is appended to the source text in [[TargetName]] format.
 * If the link already exists, it is silently skipped (no duplicate).
 */
export function addLinkToPassage(sourceText: string, targetName: string): string {
	// Parse existing links to check for duplicates
	const existingLinks = parseLinks(sourceText);

	// Normalize the target name for comparison (handle different formats)
	const normalizedTarget = targetName.trim();

	// Check if link already exists (case-insensitive comparison)
	const linkExists = existingLinks.some(
		link => link.toLowerCase() === normalizedTarget.toLowerCase()
	);

	// If link already exists, return source unchanged
	if (linkExists) {
		return sourceText;
	}

	// Append the new link to the source text
	const newLink = `[[${normalizedTarget}]]`;

	// Add proper spacing if the text doesn't end with whitespace
	if (sourceText.length > 0 && !sourceText.endsWith('\n') && !sourceText.endsWith(' ')) {
		return sourceText + ' ' + newLink;
	}

	return sourceText + newLink;
}
