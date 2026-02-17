import {
	Location,
	PreviewChange,
	aggregateFindingsByLocation,
	buildPreviewForField,
	replaceNonAsciiInString,
	scanNonAscii,
	scanStory
} from '../ascii-scrubber';
import {Passage, Story} from '../../store/stories/stories.types';

// Test helpers
function createLocation(overrides: Partial<Location> = {}): Location {
	return {
		entityType: 'passage',
		entityId: 'test-passage-1',
		entityName: 'Test Passage',
		field: 'text',
		...overrides
	};
}

function createPassage(overrides: Partial<Passage> = {}): Passage {
	return {
		id: 'test-passage-1',
		story: 'test-story',
		name: 'Test Passage',
		text: 'Test content',
		selected: false,
		highlighted: false,
		left: 0,
		top: 0,
		width: 100,
		height: 100,
		tags: [],
		...overrides
	};
}

function createStory(overrides: Partial<Story> = {}): Story {
	return {
		id: 'test-story',
		name: 'Test Story',
		ifid: 'test-ifid',
		passages: [],
		startPassage: 'test-passage-1',
		storyFormat: 'Harlowe',
		storyFormatVersion: '3.3.9',
		selected: false,
		snapToGrid: false,
		tagColors: {},
		zoom: 1,
		fullViewMode: false,
		lastUpdate: new Date(),
		script: '',
		stylesheet: '',
		tags: [],
		...overrides
	};
}

describe('ascii-scrubber', () => {
	describe('scanNonAscii', () => {
		it('should find diacritical characters', () => {
			const findings = scanNonAscii('Héllö', createLocation({field: 'text'}), 'remove');

			expect(findings.length).toBe(2);
			expect(findings[0].char).toBe('é');
			expect(findings[0].codePoint).toBe(0xe9);
			expect(findings[0].hex).toBe('U+00E9');
			expect(findings[1].char).toBe('ö');
		});

		it('should find Cyrillic characters', () => {
			const findings = scanNonAscii('привет', createLocation(), 'remove');

			expect(findings.length).toBe(6); // All 6 characters are Cyrillic
			expect(findings[0].char).toBe('п');
			expect(findings[0].codePoint).toBe(0x43f);
		});

		it('should find emoji', () => {
			const findings = scanNonAscii('Hi 😅', createLocation(), 'remove');

			expect(findings.length).toBe(1);
			expect(findings[0].char).toBe('😅');
			expect(findings[0].codePoint).toBe(0x1f605);
		});

		it('should find no-break space (NBSP)', () => {
			const findings = scanNonAscii('No-break\u00A0space', createLocation(), 'remove');

			expect(findings.length).toBe(1);
			expect(findings[0].char).toBe('\u00A0');
			expect(findings[0].codePoint).toBe(0xa0);
			expect(findings[0].hex).toBe('U+00A0');
		});

		it('should ignore ASCII characters', () => {
			const findings = scanNonAscii('Hello World 123!', createLocation(), 'remove');

			expect(findings.length).toBe(0);
		});

		it('should provide context around found character', () => {
			const findings = scanNonAscii('abc défgh ijk', createLocation(), 'remove');

			expect(findings.length).toBe(1);
			expect(findings[0].context).toContain('é');
		});

		it('should handle multiple non-ASCII characters in a row', () => {
			const findings = scanNonAscii('café résumé', createLocation(), 'remove');

			expect(findings.length).toBe(3); // é, é, é (from café, résumé x2)
		});

		it('should correctly index codepoints (not UTF-16 units)', () => {
			// Emoji can have multiple UTF-16 code units but is a single codepoint
			const findings = scanNonAscii('A😅B', createLocation(), 'remove');

			expect(findings.length).toBe(1);
			expect(findings[0].cpIndex).toBe(1); // Second codepoint when using Array.from
		});
	});

	describe('replaceNonAsciiInString', () => {
		describe('remove mode', () => {
			it('should remove non-ASCII characters', () => {
				const {after, changed} = replaceNonAsciiInString('Héllö', 'remove');

				expect(after).toBe('Hll');
				expect(changed).toBe(true);
			});

			it('should handle NBSP removal', () => {
				const {after, changed} = replaceNonAsciiInString('word\u00A0word', 'remove');

				expect(after).toBe('wordword');
				expect(changed).toBe(true);
			});

			it('should return unchanged string if no non-ASCII', () => {
				const {after, changed} = replaceNonAsciiInString('hello', 'remove');

				expect(after).toBe('hello');
				expect(changed).toBe(false);
			});
		});

		describe('transliterate mode', () => {
			it('should transliterate diacritics to ASCII', () => {
				const {after, changed} = replaceNonAsciiInString('Héllö', 'transliterate');

				expect(after).toBe('Hello');
				expect(changed).toBe(true);
			});

			it('should transliterate Cyrillic to Latin', () => {
				const {after, changed} = replaceNonAsciiInString('привет', 'transliterate');

				// Should produce Latin transliteration
				expect(after).toBeDefined();
				expect(changed).toBe(true);
				// Verify it's ASCII only
			expect(/^[\x20-\x7E]*$/.test(after)).toBe(true);

			});

			it('should replace NBSP with space', () => {
				const {after} = replaceNonAsciiInString('word\u00A0word', 'transliterate');

				expect(after).toContain(' ');
			});

			it('should handle emoji (remove if transliteration produces nothing)', () => {
				const {after} = replaceNonAsciiInString('Hi😅there', 'transliterate');

				// After transliteration and stripping non-ASCII, emoji should be gone or converted
			expect(/^[\x20-\x7E]*$/.test(after)).toBe(true);

			});
		});
	});

	describe('buildPreviewForField', () => {
		it('should return null when no non-ASCII characters', () => {
			const preview = buildPreviewForField('hello', createLocation(), 'remove');

			expect(preview).toBeNull();
		});

		it('should build preview with findings and before/after', () => {
			const preview = buildPreviewForField('Héllö', createLocation(), 'remove');

			expect(preview).not.toBeNull();
			expect(preview!.before).toBe('Héllö');
			expect(preview!.after).toBe('Hll');
			expect(preview!.findings.length).toBe(2);
		});

		it('should match findings count in preview findings array', () => {
			const preview = buildPreviewForField('café résumé', createLocation(), 'remove');

			expect(preview!.findings.length).toBe(3);
		});
	});

	describe('scanStory', () => {
		it('should scan passage text and names', () => {
			const story = createStory({
				passages: [
					createPassage({
						name: 'Café',
						text: 'Héllo'
					})
				]
			});

			const {previewChanges, summary} = scanStory(story, 'remove');

			expect(previewChanges.length).toBeGreaterThan(0);
			expect(summary.totalFindings).toBeGreaterThan(0);
		});

		it('should scan story-level fields', () => {
			const story = createStory({
				name: 'Café Story',
				script: 'console.log("Héllo");',
				stylesheet: 'body { font: "Français" }',
				passages: []
			});

			const {summary} = scanStory(story, 'remove');

			expect(summary.totalFindings).toBeGreaterThan(0);
		});

		it('should respect fieldsToScan option', () => {
			const story = createStory({
				name: 'Café',
				passages: [
					createPassage({
						text: 'Héllo'
					})
				]
			});

			const storyOnly = scanStory(story, 'remove', ['name', 'script', 'stylesheet']);
			const passagesOnly = scanStory(story, 'remove', ['text', 'name', 'tags']);

			expect(storyOnly.previewChanges.some(p => p.loc.entityType === 'story')).toBe(true);
			expect(passagesOnly.previewChanges.some(p => p.loc.entityType === 'passage')).toBe(true);
		});

		it('should count affected passages and fields', () => {
			const story = createStory({
				passages: [
					createPassage({
						name: 'Héllo',
						text: 'Café'
					})
				]
			});

			const {summary} = scanStory(story, 'remove');

			expect(summary.affectedPassages.size).toBe(1);
			expect(summary.affectedFields).toBeGreaterThan(0);
		});

		it('should scan passage tags', () => {
			const story = createStory({
				passages: [
					createPassage({
						tags: ['café', 'résumé']
					})
				]
			});

			const {summary} = scanStory(story, 'remove');

			expect(summary.totalFindings).toBeGreaterThan(0);
		});
	});

	describe('aggregateFindingsByLocation', () => {
		it('should group findings by passage and field', () => {
			const previews: PreviewChange[] = [
				{
					loc: createLocation({field: 'text'}),
					before: 'Héllo',
					after: 'Hllo',
					findings: [
						{
							loc: createLocation({field: 'text'}),
							cpIndex: 1,
							char: 'é',
							codePoint: 0xe9,
							hex: 'U+00E9',
							context: 'éll',
							suggestedReplacement: ''
						}
					]
				},
				{
					loc: createLocation({field: 'name'}),
					before: 'Café',
					after: 'Caf',
					findings: [
						{
							loc: createLocation({field: 'name'}),
							cpIndex: 3,
							char: 'é',
							codePoint: 0xe9,
							hex: 'U+00E9',
							context: 'fé',
							suggestedReplacement: ''
						}
					]
				}
			];

			const aggregated = aggregateFindingsByLocation(previews);

			expect(aggregated.passages.length).toBe(1);
			expect(aggregated.passages[0].fields.length).toBe(2);
		});
	});

	describe('integration: Héllö — привет example', () => {
		it('should handle complex mixed-script text in remove mode', () => {
			const text = 'Héllö — привет';
			const {after} = replaceNonAsciiInString(text, 'remove');

			// Should leave only ASCII
			expect(/^[\x20-\x7E]*$/.test(after)).toBe(true);

			expect(after).toBeDefined();
		});

		it('should handle complex mixed-script text in transliterate mode', () => {
			const text = 'Héllö — привет';
			const {after} = replaceNonAsciiInString(text, 'transliterate');

			// Should be ASCII-only after transliteration
			expect(/^[\x20-\x7E]*$/.test(after)).toBe(true);

		});

		it('should count all non-ASCII characters correctly', () => {
			const text = 'Héllö — привет';
			const findings = scanNonAscii(text, createLocation(), 'remove');

			// é ö em-dash п р и в е т = more than 6 findings
			expect(findings.length).toBeGreaterThan(6);
		});
	});
});
