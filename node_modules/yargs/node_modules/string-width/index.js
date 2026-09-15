import stripAnsi from 'strip-ansi';
import {eastAsianWidth} from 'get-east-asian-width';

/**
Logic:
- Segment graphemes to match how terminals render clusters.
- Width rules:
	1. Skip non-printing clusters (Default_Ignorable, Control, pure nonspacing/enclosing Mark, lone Surrogates). Tabs are ignored by design.
	2. RGI emoji clusters (\p{RGI_Emoji}) are double-width.
	3. Minimally-qualified/unqualified emoji clusters (ZWJ sequences with 2+ Extended_Pictographic, or keycap sequences) are double-width.
	4. Hangul jamo collapse each standard modern Hangul L+V or L+V+T syllable piece to width 2.
	   Unmatched repeated leading/vowel/trailing jamo stay additive because that matches how the terminals we target render them.
	5. Otherwise use East Asian Width of the cluster's first visible code point, and add widths for trailing spacing marks and Halfwidth/Fullwidth Forms within the same cluster (e.g., dakuten/handakuten/prolonged sound mark).
*/

const segmenter = new Intl.Segmenter();

// Whole-cluster zero-width
const zeroWidthClusterRegex = /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Format}|\p{Nonspacing_Mark}|\p{Enclosing_Mark}|\p{Surrogate})+$/v;

// Pick the base scalar if the cluster starts with Prepend/Format/Marks
const leadingNonPrintingRegex = /^[\p{Default_Ignorable_Code_Point}\p{Control}\p{Format}\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Surrogate}]+/v;
const spacingMarkRegex = /\p{Spacing_Mark}/v;

// RGI emoji sequences
const rgiEmojiRegex = /^\p{RGI_Emoji}$/v;

// Detect minimally-qualified/unqualified emoji sequences (missing VS16 but still render as double-width)
const unqualifiedKeycapRegex = /^[\d#*]\u20E3$/;
const extendedPictographicRegex = /\p{Extended_Pictographic}/gu;

function isDoubleWidthNonRgiEmojiSequence(segment) {
	// Real emoji clusters are < 30 chars; guard against pathological input
	if (segment.length > 50) {
		return false;
	}

	if (unqualifiedKeycapRegex.test(segment)) {
		return true;
	}

	// ZWJ sequences with 2+ Extended_Pictographic
	if (segment.includes('\u200D')) {
		const pictographics = segment.match(extendedPictographicRegex);
		return pictographics !== null && pictographics.length >= 2;
	}

	return false;
}

function baseVisible(segment) {
	return segment.replace(leadingNonPrintingRegex, '');
}

function isZeroWidthCluster(segment) {
	return zeroWidthClusterRegex.test(segment);
}

function isHangulLeadingJamo(codePoint) {
	return (codePoint >= 0x11_00 && codePoint <= 0x11_5F)
		|| (codePoint >= 0xA9_60 && codePoint <= 0xA9_7C);
}

function isHangulVowelJamo(codePoint) {
	return (codePoint >= 0x11_60 && codePoint <= 0x11_A7)
		|| (codePoint >= 0xD7_B0 && codePoint <= 0xD7_C6);
}

function isHangulTrailingJamo(codePoint) {
	return (codePoint >= 0x11_A8 && codePoint <= 0x11_FF)
		|| (codePoint >= 0xD7_CB && codePoint <= 0xD7_FB);
}

function isHangulJamo(codePoint) {
	return isHangulLeadingJamo(codePoint)
		|| isHangulVowelJamo(codePoint)
		|| isHangulTrailingJamo(codePoint);
}

function hangulClusterWidth(visibleSegment, eastAsianWidthOptions) {
	const codePoints = [];

	for (const character of visibleSegment) {
		if (zeroWidthClusterRegex.test(character)) {
			continue;
		}

		codePoints.push(character.codePointAt(0));
	}

	if (codePoints.length === 0) {
		return undefined;
	}

	let width = 0;

	for (let index = 0; index < codePoints.length; index++) {
		const codePoint = codePoints[index];
		if (!isHangulJamo(codePoint)) {
			if (width === 0) {
				return undefined;
			}

			// Mixed cluster (e.g., L + precomposed syllable): use EAW for non-jamo remainder
			for (let remaining = index; remaining < codePoints.length; remaining++) {
				width += eastAsianWidth(codePoints[remaining], eastAsianWidthOptions);
			}

			return width;
		}

		// Modern Hangul L+V(+T) shapes as one syllable block. Unmatched jamo stay additive:
		// U+1100 U+1100 U+1161 => U+1100 + (U+1100 U+1161) => 2 + 2.
		if (
			isHangulLeadingJamo(codePoint)
			&& isHangulVowelJamo(codePoints[index + 1])
		) {
			width += 2;
			index += isHangulTrailingJamo(codePoints[index + 2]) ? 2 : 1;
			continue;
		}

		width += eastAsianWidth(codePoint, eastAsianWidthOptions);
	}

	return width;
}

function trailingWidth(visibleSegment, eastAsianWidthOptions) {
	let extra = 0;
	let first = true;

	for (const character of visibleSegment) {
		if (first) {
			first = false;
			continue;
		}

		if (
			spacingMarkRegex.test(character)
			|| (character >= '\uFF00' && character <= '\uFFEF')
		) {
			extra += eastAsianWidth(character.codePointAt(0), eastAsianWidthOptions);
		}
	}

	return extra;
}

export default function stringWidth(input, options = {}) {
	if (typeof input !== 'string' || input.length === 0) {
		return 0;
	}

	const {
		ambiguousIsNarrow = true,
		countAnsiEscapeCodes = false,
	} = options;

	let string = input;

	// Avoid calling stripAnsi when there are no ANSI escape sequences (ESC = 0x1B, CSI = 0x9B)
	if (!countAnsiEscapeCodes && (string.includes('\u001B') || string.includes('\u009B'))) {
		string = stripAnsi(string);
	}

	if (string.length === 0) {
		return 0;
	}

	// Fast path: printable ASCII (0x20–0x7E) needs no segmenter, regex, or EAW lookup — width equals length.
	if (/^[\u0020-\u007E]*$/.test(string)) {
		return string.length;
	}

	let width = 0;
	const eastAsianWidthOptions = {ambiguousAsWide: !ambiguousIsNarrow};

	for (const {segment} of segmenter.segment(string)) {
		// Zero-width / non-printing clusters
		if (isZeroWidthCluster(segment)) {
			continue;
		}

		// Emoji width logic
		if (rgiEmojiRegex.test(segment) || isDoubleWidthNonRgiEmojiSequence(segment)) {
			width += 2;
			continue;
		}

		const visibleSegment = baseVisible(segment);
		const hangulWidth = hangulClusterWidth(visibleSegment, eastAsianWidthOptions);
		if (hangulWidth !== undefined) {
			width += hangulWidth;
			continue;
		}

		// Everything else: EAW of the cluster’s first visible scalar
		const codePoint = visibleSegment.codePointAt(0);
		width += eastAsianWidth(codePoint, eastAsianWidthOptions);

		// Add width for trailing spacing marks and Halfwidth/Fullwidth Forms (e.g., ﾞ, ﾟ, ｰ)
		width += trailingWidth(visibleSegment, eastAsianWidthOptions);
	}

	return width;
}
