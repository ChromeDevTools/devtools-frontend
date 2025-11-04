// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export const TEXT_NODE = 'TEXT_NODE';
const nodeShouldBeIgnored = (node) => {
    const isCommentNode = node.nodeType === Node.COMMENT_NODE;
    const isTextNode = node.nodeType === Node.TEXT_NODE;
    if (isCommentNode) {
        return true;
    }
    if (isTextNode) {
        // We ignore textNode changes where the trimmed text is empty - these are
        // most likely whitespace changes from Lit and not important.
        return (node.textContent || '').trim() === '';
    }
    return false;
};
const observedMutationsThatMatchExpected = (expectedMutation, observedMutations) => {
    const matching = [];
    for (const mutation of observedMutations) {
        if (expectedMutation.target === TEXT_NODE) {
            if (mutation.target === TEXT_NODE) {
                matching.push(mutation);
            }
        }
        else if (expectedMutation.target === mutation.target) {
            if (!expectedMutation.type) {
                matching.push(mutation);
            }
            else if (expectedMutation.type === mutation.type) {
                matching.push(mutation);
            }
        }
    }
    return matching;
};
const getMutationsForTagName = (trackedMutations, tagName) => {
    return trackedMutations.get(tagName) || { ADD: 0, REMOVE: 0, TEXT_UPDATE: 0 };
};
const getAllMutationCounts = (observedMutations) => {
    const trackedMutations = new Map();
    for (const mutation of observedMutations) {
        if (mutation.target === TEXT_NODE) {
            const mutationsForTagName = getMutationsForTagName(trackedMutations, TEXT_NODE);
            mutationsForTagName.TEXT_UPDATE++;
            trackedMutations.set(TEXT_NODE, mutationsForTagName);
        }
        const tagName = mutation.target;
        if (mutation.type === "ADD" /* MutationType.ADD */) {
            const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
            mutationsForTagName.ADD++;
            trackedMutations.set(tagName, mutationsForTagName);
        }
        else if (mutation.type === "REMOVE" /* MutationType.REMOVE */) {
            const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
            mutationsForTagName.REMOVE++;
            trackedMutations.set(tagName, mutationsForTagName);
        }
    }
    return trackedMutations;
};
const storeRelevantMutationEntries = (entries, storageArray) => {
    for (const entry of entries) {
        if (entry.type === 'characterData') {
            storageArray.push({
                target: TEXT_NODE,
                type: "TEXT_UPDATE" /* MutationType.TEXT_UPDATE */,
            });
        }
        for (const added of entry.addedNodes) {
            if (!nodeShouldBeIgnored(added)) {
                storageArray.push({
                    target: added.nodeName.toLowerCase(),
                    type: "ADD" /* MutationType.ADD */,
                });
            }
        }
        for (const removed of entry.removedNodes) {
            if (!nodeShouldBeIgnored(removed)) {
                storageArray.push({
                    target: removed.nodeName.toLowerCase(),
                    type: "REMOVE" /* MutationType.REMOVE */,
                });
            }
        }
    }
};
const generateOutputForMutationList = (observedMutations) => {
    const debugOutput = [];
    const mutationCounts = getAllMutationCounts(observedMutations);
    const allMutations = Array.from(mutationCounts.entries());
    for (const [elem, mutations] of allMutations) {
        const output = `${elem}: `;
        const mutationOutput = [];
        const addMutations = mutations.ADD;
        if (addMutations) {
            mutationOutput.push(`${addMutations} ${pluralize(addMutations, 'addition', 'additions')}`);
        }
        const removeMutations = mutations.REMOVE;
        if (removeMutations) {
            mutationOutput.push(`${removeMutations} ${pluralize(removeMutations, 'removal', 'removals')}`);
        }
        const updateMutations = mutations.TEXT_UPDATE;
        if (updateMutations) {
            mutationOutput.push(`${updateMutations} ${pluralize(updateMutations, 'update', 'updates')}`);
        }
        debugOutput.push(output + mutationOutput.join(', '));
    }
    return debugOutput.join('\n');
};
const errorMessageWhenExpectingNoMutations = (observedMutations) => {
    const debugOutput = generateOutputForMutationList(observedMutations);
    assert.fail(`Expected no mutations, but got ${observedMutations.length}: \n${debugOutput}`);
};
function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
}
const DEFAULT_MAX_MUTATIONS_LIMIT = 10;
/**
 * Check that a given component causes the expected amount of mutations. Useful
 * when testing a component to ensure it's updating the DOM performantly and not
 * unnecessarily.
 */
export const withMutations = async (expectedMutations, shadowRoot, functionToObserve) => {
    const observedMutations = [];
    const mutationObserver = new MutationObserver(entries => {
        storeRelevantMutationEntries(entries, observedMutations);
    });
    mutationObserver.observe(shadowRoot, {
        subtree: true,
        attributes: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
    });
    await functionToObserve(shadowRoot);
    /* We takeRecords() here to flush any observed mutations that have been seen
    but not yet fed back into the callback we passed when we instantiated the
    observer. This ensures we've got every mutation before we disconnect the
    observer. */
    const records = mutationObserver.takeRecords();
    storeRelevantMutationEntries(records, observedMutations);
    mutationObserver.disconnect();
    if (expectedMutations.length === 0) {
        if (observedMutations.length !== 0) {
            errorMessageWhenExpectingNoMutations(observedMutations);
            return;
        }
    }
    const mutationsMatchedToExpected = new Set();
    for (const expectedMutation of expectedMutations) {
        // Gather all observed mutations that match the given expectation. e.g. if
        // the expected mutation is { target: 'div' } this will gather all observed
        // mutations with a target of `div`.
        const matchingMutations = observedMutationsThatMatchExpected(expectedMutation, observedMutations);
        for (const matched of matchingMutations) {
            mutationsMatchedToExpected.add(matched);
        }
        const amountOfMatchingMutations = matchingMutations.length;
        // Make sure we check for undefined, not truthyness, as the user could
        // supply a max of 0.
        const maxMutationsAllowed = expectedMutation.max === undefined ? DEFAULT_MAX_MUTATIONS_LIMIT : expectedMutation.max;
        if (amountOfMatchingMutations > maxMutationsAllowed) {
            assert.fail(`Expected no more than ${maxMutationsAllowed} mutations for ${expectedMutation.type || 'ADD/REMOVE'} ${expectedMutation.target}, but got ${amountOfMatchingMutations}`);
        }
        else if (amountOfMatchingMutations === 0 && maxMutationsAllowed > 0) {
            assert.fail(`Expected at least one mutation for ${expectedMutation.type || 'ADD/REMOVE'} ${expectedMutation.target}, but got ${amountOfMatchingMutations}`);
        }
    }
    // These are mutations that happened but the user did not explicitly list as
    // expected, so we want to fail the test on them.
    const unmatchedMutations = observedMutations.filter(mutation => !mutationsMatchedToExpected.has(mutation));
    if (unmatchedMutations.length > 0) {
        const unexpectedOutput = generateOutputForMutationList(unmatchedMutations);
        assert.fail(`Additional unexpected mutations were detected:\n${unexpectedOutput}`);
    }
};
/**
 * Ensure that a code block runs whilst making no mutations to the DOM. Given an
 * element and a callback, it will execute th e callback function and ensure
 * afterwards that a MutatonObserver saw no changes.
 */
export const withNoMutations = async (element, fn) => {
    return await withMutations([], element, fn);
};
export const someMutations = async (element) => {
    return await new Promise(resolve => {
        const observer = new MutationObserver(() => {
            resolve();
            observer.disconnect();
        });
        observer.observe(element, { attributes: true, childList: true, subtree: true });
    });
};
//# sourceMappingURL=MutationHelpers.js.map