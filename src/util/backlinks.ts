/**
 * Utilities for managing passage backlinks (reverse references).
 * A backlink maps from a target passage ID to the set of passage IDs that link to it.
 */

import {Passage} from '../store/stories/stories.types';
import {parseLinks} from './parse-links';
import escapeRegExp from 'lodash/escapeRegExp';

export type BacklinkIndex = Map<string, Set<string>>;

/**
 * Build a backlink index from a list of passages.
 * Maps from target passage ID to the set of passage IDs linking to it.
 */
export function buildBacklinkIndex(passages: Passage[]): BacklinkIndex {
	const index: BacklinkIndex = new Map();

	passages.forEach(passage => {
		const linkedPassageNames = parseLinks(passage.text, true);

		linkedPassageNames.forEach(linkedName => {
			const targetPassage = passages.find(p => p.name === linkedName);

			if (targetPassage) {
				if (!index.has(targetPassage.id)) {
					index.set(targetPassage.id, new Set());
				}

				index.get(targetPassage.id)!.add(passage.id);
			}
		});
	});

	return index;
}

/**
 * Get all passages that link to a specific passage.
 */
export function getBacklinks(
	index: BacklinkIndex,
	passageId: string
): string[] {
	const backlinks = index.get(passageId);

	return backlinks ? Array.from(backlinks) : [];
}

/**
 * Remove all instances of a passage link from text.
 * Handles all link formats: [[Card]], [[display|Card]], [[Card->display]], [[Card<-display]].
 */
export function removeLinkFromText(
	text: string,
	passageName: string
): string {
	const nameEscaped = escapeRegExp(passageName);

	// Simple link: [[passageName]] or [[passageName][setter]]]
	const simpleLinkRegexp = new RegExp(
		'\\[\\[' + nameEscaped + '(\\]\\[.*?)?\\]\\]',
		'g'
	);

	// Compound link with pipe (TiddlyWiki style): [[display|passageName]] or [[display|passageName][setter]]]
	const compoundPipeRegexp = new RegExp(
		'\\[\\[(.*?)\\|' + nameEscaped + '(\\]\\[.*?)?\\]\\]',
		'g'
	);

	// Arrow link right: [[display->passageName]] or [[display->passageName][setter]]]
	const arrowRightRegexp = new RegExp(
		'\\[\\[(.*?)->\\s*' + nameEscaped + '(\\]\\[.*?)?\\]\\]',
		'g'
	);

	// Arrow link left: [[passageName<-display]] or [[passageName<-display][setter]]]
	const arrowLeftRegexp = new RegExp(
		'\\[\\[' + nameEscaped + '<-(.*?)(\\]\\[.*?)?\\]\\]',
		'g'
	);

	let result = text;

	// First try simple links
	result = result.replace(simpleLinkRegexp, '');

	// Then try compound links (these contain the passage name but also display text)
	result = result.replace(
		compoundPipeRegexp,
		(_match, displayText) => `[[${displayText}]]`
	);
	result = result.replace(
		arrowRightRegexp,
		(_match, displayText) => `[[${displayText}]]`
	);
	result = result.replace(
		arrowLeftRegexp,
		(_match, displayText) => `[[${displayText}]]`
	);

	return result;
}

/**
 * Rebuild backlink references after a passage text change.
 * Returns the updated index.
 */
export function updateBacklinkIndex(
	index: BacklinkIndex,
	passages: Passage[],
	changedPassageId: string,
	oldText: string,
	newText: string
): BacklinkIndex {
	const newIndex = new Map(index);
	const changedPassage = passages.find(p => p.id === changedPassageId);

	if (!changedPassage) {
		return newIndex;
	}

	// Remove old links from index
	const oldLinks = parseLinks(oldText, true);

	oldLinks.forEach(linkedName => {
		const targetPassage = passages.find(p => p.name === linkedName);

		if (targetPassage) {
			const backlinks = newIndex.get(targetPassage.id);

			if (backlinks) {
				backlinks.delete(changedPassageId);

				if (backlinks.size === 0) {
					newIndex.delete(targetPassage.id);
				}
			}
		}
	});

	// Add new links to index
	const newLinks = parseLinks(newText, true);

	newLinks.forEach(linkedName => {
		const targetPassage = passages.find(p => p.name === linkedName);

		if (targetPassage) {
			if (!newIndex.has(targetPassage.id)) {
				newIndex.set(targetPassage.id, new Set());
			}

			newIndex.get(targetPassage.id)!.add(changedPassageId);
		}
	});

	return newIndex;
}
