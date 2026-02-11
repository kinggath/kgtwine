import {removeLinkFromText} from '../backlinks';

describe('removeLinkFromText', () => {
	it('removes simple links [[Card]]', () => {
		const text = 'Go to [[CardB]] and then [[CardC]]';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  and then [[CardC]]');
	});

	it('removes pipe-style links [[display|Card]]', () => {
		const text = 'Go to [[Next|CardB]] here';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  here');
	});

	it('removes arrow-right links [[Card->display]]', () => {
		const text = 'Go to [[CardB->Next]] here';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  here');
	});

	it('removes arrow-left links [[display<-Card]]', () => {
		const text = 'Go to [[Next<-CardB]] here';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  here');
	});

	it('removes links with setters [[Card][setter]]', () => {
		const text = 'Go to [[CardB][x = 1]] here';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  here');
	});

	it('does not remove links to other passages', () => {
		const text = 'Go to [[CardB]] and [[CardC]]';
		const result = removeLinkFromText(text, 'CardD');
		expect(result).toBe('Go to [[CardB]] and [[CardC]]');
	});

	it('handles multiple occurrences of the same link', () => {
		const text = 'Go to [[CardB]] or [[CardB]] again';
		const result = removeLinkFromText(text, 'CardB');
		expect(result).toBe('Go to  or  again');
	});
});
