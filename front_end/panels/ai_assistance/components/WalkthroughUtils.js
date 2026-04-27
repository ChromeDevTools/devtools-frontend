// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Truncates a string to a target length, attempting to cut at the nearest word boundary (space).
 * If the string is truncated, it returns the truncated string and the number of characters removed.
 *
 * @param text The string to truncate.
 * @param targetLength The desired length of the string.
 * @returns An object containing the potentially truncated text and the number of characters removed.
 */
function smartTruncate(text, targetLength) {
    if (text.length <= targetLength) {
        return { truncatedText: text, moreCharacters: 0 };
    }
    const lastSpaceBefore = text.lastIndexOf(' ', targetLength);
    const firstSpaceAfter = text.indexOf(' ', targetLength);
    let cutIndex = targetLength;
    if (lastSpaceBefore === -1 && firstSpaceAfter === -1) {
        cutIndex = targetLength;
    }
    else if (lastSpaceBefore === -1) {
        cutIndex = firstSpaceAfter;
    }
    else if (firstSpaceAfter === -1) {
        cutIndex = lastSpaceBefore;
    }
    else {
        // Both lastSpaceBefore and firstSpaceAfter exist.
        // Choose the one that is closer to the targetLength.
        const distanceToSpaceBefore = targetLength - lastSpaceBefore;
        const distanceToSpaceAfter = firstSpaceAfter - targetLength;
        cutIndex = distanceToSpaceBefore <= distanceToSpaceAfter ? lastSpaceBefore : firstSpaceAfter;
    }
    let truncatedText = text;
    let moreCharacters = 0;
    if (cutIndex < text.length) {
        truncatedText = text.slice(0, cutIndex);
        moreCharacters = text.length - cutIndex;
    }
    return { truncatedText, moreCharacters };
}
/**
 * Returns a label for the walkthrough toggle button.
 * The label includes the current action (Show/Hide) and a smart-truncated version of the prompt.
 */
export function getButtonLabel(input) {
    let labelBase = '';
    if (input.isLoading && !input.isExpanded && input.stepTitle) {
        labelBase = input.stepTitle;
    }
    else {
        const action = input.isExpanded ? 'Hide' : 'Show';
        const type = input.hasWidgets ? 'AI walkthrough' : 'thinking';
        labelBase = `${action} ${type}`;
    }
    if (input.isLoading) {
        return `Loading: ${labelBase}`;
    }
    const TARGET_LENGTH = 50;
    const { truncatedText, moreCharacters } = smartTruncate(input.prompt, TARGET_LENGTH);
    const promptSuffix = moreCharacters > 0 ? ` (and ${moreCharacters} more characters)` : '';
    return `${labelBase} for prompt ${truncatedText}${promptSuffix}`;
}
//# sourceMappingURL=WalkthroughUtils.js.map