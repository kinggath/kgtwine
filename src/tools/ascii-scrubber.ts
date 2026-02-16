import {transliterate} from 'transliteration';
import {Story} from '../store/stories/stories.types';

/**
 * Location information for where a non-ASCII character was found.
 */
export interface Location {
	entityType: 'story' | 'passage';
	entityId: string;
	entityName: string;
	field: 'name' | 'text' | 'script' | 'stylesheet' | 'tags';
	fieldIndex?: number; // Index in tags array if field is 'tags'
}

/**
 * A single non-ASCII character finding.
 */
export interface Finding {
	loc: Location;
	cpIndex: number; // Codepoint index in the text
	char: string; // The non-ASCII character
	codePoint: number; // Unicode codepoint value
	hex: string; // U+XXXX format
	context: string; // Snippet around the character
	suggestedReplacement: string; // Replacement based on chosen mode
}

/**
 * Preview of how a field will change (before/after).
 */
export interface PreviewChange {
	loc: Location;
	before: string;
	after: string;
	findings: Finding[];
}

/**
 * A change that was applied (for undo).
 */
export interface Patch {
	loc: Location;
	before: string;
	after: string;
}

/**
 * Summary of scan results
 */
export interface ScanSummary {
	totalFindings: number;
	affectedPassages: Set<string>; // Set of passage IDs
	affectedFields: number; // Count of distinct field locations affected
}

/**
 * A field with its findings
 */
export interface FieldWithFindings {
	fieldName: string; // 'name', 'text', 'script', 'stylesheet', or 'tags'
	fieldIndex?: number; // Index if field is 'tags'
	findings: Finding[];
}

/**
 * A passage with its field groupings
 */
export interface PassageWithFindings {
	passageId: string;
	passageName: string;
	fields: FieldWithFindings[];
}

/**
 * Aggregated findings organized by location hierarchy
 */
export interface AggregatedFindings {
	storyFindings: Finding[]; // Story-level findings (name, script, stylesheet)
	passages: PassageWithFindings[]; // Grouped by passage, then by field
}

/**
 * Replacement mode for non-ASCII characters
 */
export type ReplacementMode = 'transliterate' | 'remove';

/**
 * Scan text for non-ASCII characters (codepoint > 127).
 * Uses Array.from() for proper codepoint iteration (handles emoji, etc.)
 */
export function scanNonAscii(
	text: string,
	loc: Location,
	mode: ReplacementMode,
	contextRadius = 20
): Finding[] {
	const findings: Finding[] = [];

	// Use Array.from to properly iterate over Unicode codepoints
	const codepoints = Array.from(text);

	let cpIndex = 0;
	for (const char of codepoints) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined || codePoint <= 0x7f) {
			cpIndex++;
			continue;
		}

		// Found a non-ASCII character
		const hex = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;

		// Build context snippet
		const contextStart = Math.max(0, cpIndex - contextRadius);
		const contextEnd = Math.min(codepoints.length, cpIndex + contextRadius + 1);
		const contextSnippet = codepoints.slice(contextStart, contextEnd).join('');

		const suggestedReplacement = getSuggestedReplacement(char, mode);

		findings.push({
			loc,
			cpIndex,
			char,
			codePoint,
			hex,
			context: contextSnippet,
			suggestedReplacement
		});

		cpIndex++;
	}

	return findings;
}

/**
 * Get suggested replacement for a character based on mode
 */
function getSuggestedReplacement(char: string, mode: ReplacementMode): string {
	if (mode === 'remove') {
		return '';
	}

	// transliterate mode: try to convert to ASCII
	let result = transliterate(char);

	// Strip any remaining non-ASCII characters
	result = result.replace(/[^\x20-\x7E]/g, '');


	// Special case: if char is whitespace-like (NBSP, etc.), convert to regular space
	if (/\s/.test(char) && result === '') {
		result = ' ';
	}

	return result;
}

/**
 * Replace non-ASCII characters in a string (returns new version + whether it changed)
 */
export function replaceNonAsciiInString(
	text: string,
	mode: ReplacementMode
): {after: string; changed: boolean} {
	const codepoints = Array.from(text);
	let changed = false;
	const result: string[] = [];

	for (const char of codepoints) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined || codePoint <= 0x7f) {
			result.push(char);
		} else {
			changed = true;
			const replacement = getSuggestedReplacement(char, mode);
			result.push(replacement);
		}
	}

	return {after: result.join(''), changed};
}

/**
 * Build preview of changes for a single text field  using given mode
 */
export function buildPreviewForField(
	text: string,
	loc: Location,
	mode: ReplacementMode
): PreviewChange | null {
	const findings = scanNonAscii(text, loc, mode);
	if (findings.length === 0) {
		return null;
	}

	const {after} = replaceNonAsciiInString(text, mode);

	return {
		loc,
		before: text,
		after,
		findings
	};
}

/**
 * Scan a story for non-ASCII characters in all text fields
 */
export function scanStory(
	story: Story,
	mode: ReplacementMode,
	fieldsToScan: Array<'name' | 'text' | 'script' | 'stylesheet' | 'tags'> = [
		'name',
		'text',
		'script',
		'stylesheet',
		'tags'
	]
): {
	previewChanges: PreviewChange[];
	summary: ScanSummary;
	aggregated: AggregatedFindings;
} {
	const previewChanges: PreviewChange[] = [];
	const summary: ScanSummary = {
		totalFindings: 0,
		affectedPassages: new Set(),
		affectedFields: 0
	};

	// Scan story-level fields
	if (fieldsToScan.includes('name')) {
		const preview = buildPreviewForField(
			story.name,
			{
				entityType: 'story',
				entityId: story.id,
				entityName: story.name,
				field: 'name'
			},
			mode
		);
		if (preview) {
			previewChanges.push(preview);
			summary.totalFindings += preview.findings.length;
			summary.affectedFields++;
		}
	}

	if (fieldsToScan.includes('script')) {
		const preview = buildPreviewForField(
			story.script,
			{
				entityType: 'story',
				entityId: story.id,
				entityName: story.name,
				field: 'script'
			},
			mode
		);
		if (preview) {
			previewChanges.push(preview);
			summary.totalFindings += preview.findings.length;
			summary.affectedFields++;
		}
	}

	if (fieldsToScan.includes('stylesheet')) {
		const preview = buildPreviewForField(
			story.stylesheet,
			{
				entityType: 'story',
				entityId: story.id,
				entityName: story.name,
				field: 'stylesheet'
			},
			mode
		);
		if (preview) {
			previewChanges.push(preview);
			summary.totalFindings += preview.findings.length;
			summary.affectedFields++;
		}
	}

	// Scan passages
	for (const passage of story.passages) {
		if (fieldsToScan.includes('name')) {
			const preview = buildPreviewForField(
				passage.name,
				{
					entityType: 'passage',
					entityId: passage.id,
					entityName: passage.name,
					field: 'name'
				},
				mode
			);
			if (preview) {
				previewChanges.push(preview);
				summary.totalFindings += preview.findings.length;
				summary.affectedFields++;
				summary.affectedPassages.add(passage.id);
			}
		}

		if (fieldsToScan.includes('text')) {
			const preview = buildPreviewForField(
				passage.text,
				{
					entityType: 'passage',
					entityId: passage.id,
					entityName: passage.name,
					field: 'text'
				},
				mode
			);
			if (preview) {
				previewChanges.push(preview);
				summary.totalFindings += preview.findings.length;
				summary.affectedFields++;
				summary.affectedPassages.add(passage.id);
			}
		}

		if (fieldsToScan.includes('tags') && passage.tags && passage.tags.length > 0) {
			for (let i = 0; i < passage.tags.length; i++) {
				const tag = passage.tags[i];
				const preview = buildPreviewForField(
					tag,
					{
						entityType: 'passage',
						entityId: passage.id,
						entityName: passage.name,
						field: 'tags',
						fieldIndex: i
					},
					mode
				);
				if (preview) {
					previewChanges.push(preview);
					summary.totalFindings += preview.findings.length;
					summary.affectedFields++;
					summary.affectedPassages.add(passage.id);
				}
			}
		}
	}

	// Reorganize findings by passage and field for UI display
	const aggregated = aggregateFindingsByLocation(previewChanges);

	return {
		previewChanges,
		summary,
		aggregated
	};
}

/**
 * Group findings by location (passage/field) for UI display
 */
export function aggregateFindingsByLocation(
	previewChanges: PreviewChange[]
): AggregatedFindings {
	const storyFindings: Finding[] = [];
	const passageMap = new Map<string, Map<string, FieldWithFindings>>();

	for (const change of previewChanges) {
		if (change.loc.entityType === 'story') {
			storyFindings.push(...change.findings);
		} else {
			// Group by passage, then by field
			const passageId = change.loc.entityId;
			if (!passageMap.has(passageId)) {
				passageMap.set(passageId, new Map());
			}

			const fieldMap = passageMap.get(passageId)!;
			const fieldKey = change.loc.fieldIndex !== undefined
				? `${change.loc.field}:${change.loc.fieldIndex}`
				: change.loc.field;

			if (!fieldMap.has(fieldKey)) {
				fieldMap.set(fieldKey, {
					fieldName: change.loc.field,
					fieldIndex: change.loc.fieldIndex,
					findings: []
				});
			}

			fieldMap.get(fieldKey)!.findings.push(...change.findings);
		}
	}

	// Convert passage map to array format
	const passages: PassageWithFindings[] = [];
	for (const [passageId, fieldMap] of passageMap) {
		const fields = Array.from(fieldMap.values());
		// Get passage name from first finding for this passage
		const passageFinding = Array.from(fieldMap.values())
			.flatMap(f => f.findings)[0];
		const passageName = passageFinding?.loc.entityName || passageId;

		passages.push({
			passageId,
			passageName,
			fields
		});
	}

	return {
		storyFindings,
		passages
	};
}
