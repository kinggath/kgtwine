import {addLinkToPassage} from './add-link-to-passage';

describe('addLinkToPassage', () => {
	it('should add a link to empty text', () => {
		expect(addLinkToPassage('', 'TargetPassage')).toBe('[[TargetPassage]]');
	});

	it('should add a link with proper spacing', () => {
		expect(addLinkToPassage('Some text', 'TargetPassage')).toBe('Some text [[TargetPassage]]');
	});

	it('should not duplicate existing links', () => {
		expect(addLinkToPassage('Some text [[TargetPassage]]', 'TargetPassage')).toBe(
			'Some text [[TargetPassage]]'
		);
	});

	it('should be case-insensitive for duplicates', () => {
		expect(addLinkToPassage('Some text [[targetpassage]]', 'TargetPassage')).toBe(
			'Some text [[targetpassage]]'
		);
	});

	it('should add link after newline without extra space', () => {
		expect(addLinkToPassage('Some text\n', 'TargetPassage')).toBe('Some text\n[[TargetPassage]]');
	});

	it('should add link after space without extra space', () => {
		expect(addLinkToPassage('Some text ', 'TargetPassage')).toBe('Some text [[TargetPassage]]');
	});

	it('should handle wiki-style link formats', () => {
		expect(addLinkToPassage('Some text [[Display->TargetPassage]]', 'TargetPassage')).toBe(
			'Some text [[Display->TargetPassage]]'
		);
	});
});
