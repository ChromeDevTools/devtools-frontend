// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

export const enum MutationType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  TEXT_UPDATE = 'TEXT_UPDATE',
}

export const TEXT_NODE = 'TEXT_NODE';

interface ExpectedMutation {
  max?: number;
  target: keyof HTMLElementTagNameMap|typeof TEXT_NODE;
  type?: MutationType;
}

const nodeShouldBeIgnored = (node: Node): boolean => {
  const isCommentNode = node.nodeType === Node.COMMENT_NODE;
  const isTextNode = node.nodeType === Node.TEXT_NODE;

  if (isCommentNode) {
    return true;
  }

  if (isTextNode) {
    // We ignore textNode changes where the trimmed text is empty - these are
    // most likely whitespace changes from LitHtml and not important.
    return (node.textContent || '').trim() === '';
  }

  return false;
};

const observedMutationsThatMatchExpected =
    (expectedMutation: ExpectedMutation, observedMutations: ObservedMutation[]): ObservedMutation[] => {
      const matching: ObservedMutation[] = [];

      for (const mutation of observedMutations) {
        if (expectedMutation.target === TEXT_NODE) {
          if (mutation.target === TEXT_NODE) {
            matching.push(mutation);
          }
        } else if (expectedMutation.target === mutation.target) {
          if (!expectedMutation.type) {
            matching.push(mutation);
          } else if (expectedMutation.type === mutation.type) {
            matching.push(mutation);
          }
        }
      }
      return matching;
    };

interface MutationCount {
  /* eslint-disable @typescript-eslint/naming-convention */
  ADD: number;
  REMOVE: number;
  TEXT_UPDATE: number;
  /* eslint-enable @typescript-eslint/naming-convention */
}

const getMutationsForTagName = (trackedMutations: Map<string, MutationCount>, tagName: string): MutationCount => {
  return trackedMutations.get(tagName) || {ADD: 0, REMOVE: 0, TEXT_UPDATE: 0};
};

const getAllMutationCounts = (observedMutations: ObservedMutation[]): Map<string, MutationCount> => {
  const trackedMutations = new Map<string, MutationCount>();

  for (const mutation of observedMutations) {
    if (mutation.target === TEXT_NODE) {
      const mutationsForTagName = getMutationsForTagName(trackedMutations, TEXT_NODE);
      mutationsForTagName.TEXT_UPDATE++;
      trackedMutations.set(TEXT_NODE, mutationsForTagName);
    }

    const tagName = mutation.target;
    if (mutation.type === MutationType.ADD) {
      const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
      mutationsForTagName.ADD++;
      trackedMutations.set(tagName, mutationsForTagName);
    } else if (mutation.type === MutationType.REMOVE) {
      const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
      mutationsForTagName.REMOVE++;
      trackedMutations.set(tagName, mutationsForTagName);
    }
  }

  return trackedMutations;
};

type ObservedMutation = {
  target: keyof HTMLElementTagNameMap,
  type: MutationType,
}|{target: typeof TEXT_NODE, type: MutationType.TEXT_UPDATE};

const storeRelevantMutationEntries = (entries: MutationRecord[], storageArray: ObservedMutation[]) => {
  for (const entry of entries) {
    if (entry.type === 'characterData') {
      storageArray.push({
        target: TEXT_NODE,
        type: MutationType.TEXT_UPDATE,
      });
    }

    for (const added of entry.addedNodes) {
      if (!nodeShouldBeIgnored(added)) {
        storageArray.push({
          target: added.nodeName.toLowerCase() as keyof HTMLElementTagNameMap,
          type: MutationType.ADD,
        });
      }
    }

    for (const removed of entry.removedNodes) {
      if (!nodeShouldBeIgnored(removed)) {
        storageArray.push({
          target: removed.nodeName.toLowerCase() as keyof HTMLElementTagNameMap,
          type: MutationType.REMOVE,
        });
      }
    }
  }
};

const generateOutputForMutationList = (observedMutations: ObservedMutation[]): string => {
  const debugOutput: string[] = [];
  const mutationCounts = getAllMutationCounts(observedMutations);
  const allMutations = Array.from(mutationCounts.entries());
  for (const [elem, mutations] of allMutations) {
    const output = `${elem}: `;
    const mutationOutput: string[] = [];
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

const errorMessageWhenExpectingNoMutations = (observedMutations: ObservedMutation[]) => {
  const debugOutput = generateOutputForMutationList(observedMutations);
  assert.fail(`Expected no mutations, but got ${observedMutations.length}: \n${debugOutput}`);
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

const DEFAULT_MAX_MUTATIONS_LIMIT = 10;
/**
 * Check that a given component causes the expected amount of mutations. Useful
 * when testing a component to ensure it's updating the DOM performantly and not
 * unnecessarily.
 */
export const withMutations = async<T extends Node>(
    expectedMutations: ExpectedMutation[], shadowRoot: T,
    functionToObserve: (shadowRoot: T) => void): Promise<void> => {
  const observedMutations: ObservedMutation[] = [];
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

  const mutationsMatchedToExpected = new Set<ObservedMutation>();
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
      assert.fail(`Expected no more than ${maxMutationsAllowed} mutations for ${
          expectedMutation.type || 'ADD/REMOVE'} ${expectedMutation.target}, but got ${amountOfMatchingMutations}`);
    } else if (amountOfMatchingMutations === 0 && maxMutationsAllowed > 0) {
      assert.fail(`Expected at least one mutation for ${expectedMutation.type || 'ADD/REMOVE'} ${
          expectedMutation.target}, but got ${amountOfMatchingMutations}`);
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
export const withNoMutations = async<T extends Node>(element: T, fn: (shadowRoot: T) => void): Promise<void> => {
  return await withMutations([], element, fn);
};

export const someMutations = async<T extends Node>(element: T): Promise<void> => {
  return new Promise<void>(resolve => {
    const observer = new MutationObserver(() => {
      resolve();
      observer.disconnect();
    });
    observer.observe(element, {attributes: true, childList: true, subtree: true});
  });
};
