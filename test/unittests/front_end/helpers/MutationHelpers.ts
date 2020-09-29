// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

export enum MutationType {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

interface ExpectedMutation {
  type?: MutationType, tagName: string, max?: number,
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

const getUnmatchedNodeMutations =
    (observedMutations: MutationRecord[], nodesThatHaveBeenMatchedToExpectation: Set<Node>) => {
      return observedMutations.flatMap(mutation => {
        const unmatchedMutations: Array<{type: MutationType; tagName: string;}> = [];
        for (const added of mutation.addedNodes) {
          if (!nodesThatHaveBeenMatchedToExpectation.has(added) && !nodeShouldBeIgnored(added)) {
            unmatchedMutations.push({type: MutationType.ADD, tagName: added.nodeName.toLowerCase()});
          }
        }
        for (const removed of mutation.removedNodes) {
          if (!nodesThatHaveBeenMatchedToExpectation.has(removed) && !nodeShouldBeIgnored(removed)) {
            unmatchedMutations.push({type: MutationType.REMOVE, tagName: removed.nodeName.toLowerCase()});
          }
        }

        return unmatchedMutations;
      });
    };


const gatherMatchingNodesForExpectedMutation =
    (expectedMutation: ExpectedMutation, observedMutations: MutationRecord[]): Node[] => {
      const matchingNodes: Node[] = [];

      for (const mutation of observedMutations) {
        let nodesToCheck: Node[] = [];
        if (expectedMutation.type) {
          nodesToCheck =
              Array.from(expectedMutation.type === MutationType.ADD ? mutation.addedNodes : mutation.removedNodes);
        } else {
          nodesToCheck = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
        }
        for (const node of nodesToCheck) {
          if (node.nodeName.toLowerCase() === expectedMutation.tagName) {
            matchingNodes.push(node);
          }
        }
      }

      return matchingNodes;
    };

interface MutationCount {
  ADD: number, REMOVE: number,
}

const getMutationsForTagName = (trackedMutations: Map<string, MutationCount>, tagName: string): MutationCount => {
  return trackedMutations.get(tagName) || {ADD: 0, REMOVE: 0};
};

const getAllMutationCounts = (observedMutations: MutationRecord[]): Map<string, MutationCount> => {
  const trackedMutations = new Map<string, MutationCount>();

  for (const mutation of observedMutations) {
    mutation.addedNodes.forEach(node => {
      const tagName = node.nodeName.toLowerCase();
      const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
      mutationsForTagName.ADD++;
      trackedMutations.set(tagName, mutationsForTagName);
    });
    mutation.removedNodes.forEach(node => {
      const tagName = node.nodeName.toLowerCase();
      const mutationsForTagName = getMutationsForTagName(trackedMutations, tagName);
      mutationsForTagName.REMOVE++;
      trackedMutations.set(tagName, mutationsForTagName);
    });
  }

  return trackedMutations;
};

const storeRelevantMutationEntries = (entries: MutationRecord[], storageArray: MutationRecord[]) => {
  for (const entry of entries) {
    if (entry.addedNodes.length || entry.removedNodes.length) {
      storageArray.push(entry);
    }
  }
};


const errorMessageWhenExpectingNoMutations = (observedMutations: MutationRecord[]) => {
  const debugOutput: string[] = [];
  const mutationCounts = getAllMutationCounts(observedMutations);
  const allMutations = Array.from(mutationCounts.entries());
  for (const [elem, mutations] of allMutations) {
    let output = `${elem}: `;
    const addMutations = mutations.ADD;
    if (addMutations) {
      output += `${addMutations} additions`;
    }
    const removeMutations = mutations.REMOVE;
    if (removeMutations) {
      output += ` ${removeMutations} removals`;
    }
    debugOutput.push(output);
  }
  assert.fail(`Expected no mutations, but got ${observedMutations.length}: \n${debugOutput.join('\n')}`);
};

const DEFAULT_MAX_MUTATIONS_LIMIT = 10;
/**
 * Check that a given component causes the expected amount of mutations. Useful
 * when testing a component to ensure it's updating the DOM performantly and not
 * unnecessarily.
 */
export const withMutations = async(
    expectedMutations: ExpectedMutation[], shadowRoot: ShadowRoot,
    functionToObserve: (shadowRoot: ShadowRoot) => void): Promise<void> => {
  const observedMutations: MutationRecord[] = [];
  const mutationObserver = new MutationObserver(entries => {
    storeRelevantMutationEntries(entries, observedMutations);
  });

  mutationObserver.observe(shadowRoot, {
    subtree: true,
    attributes: true,
    childList: true,
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

  const nodesThatHaveBeenMatchedToExpectation = new Set<Node>();
  for (const expectedMutation of expectedMutations) {
    const matchingNodes = gatherMatchingNodesForExpectedMutation(expectedMutation, observedMutations);

    for (const matched of matchingNodes) {
      nodesThatHaveBeenMatchedToExpectation.add(matched);
    }

    const amountOfMatchingMutations = matchingNodes.length;
    // Make sure we check for undefined, not truthyness, as the user could
    // supply a max of 0.
    const maxMutationsAllowed = expectedMutation.max === undefined ? DEFAULT_MAX_MUTATIONS_LIMIT : expectedMutation.max;

    if (amountOfMatchingMutations > maxMutationsAllowed) {
      assert.fail(`Expected no more than ${maxMutationsAllowed} mutations for ${
          expectedMutation.type || 'ADD/REMOVE'} ${expectedMutation.tagName}, but got ${amountOfMatchingMutations}`);
    }
  }

  const unmatchedNodeMutations = getUnmatchedNodeMutations(observedMutations, nodesThatHaveBeenMatchedToExpectation);
  if (unmatchedNodeMutations.length > 0) {
    const output = unmatchedNodeMutations
                       .map(mutation => {
                         return `${mutation.type === MutationType.ADD ? 'Added' : 'Removed'}: ${mutation.tagName}`;
                       })
                       .join('\n');
    assert.fail(`Additional unexpected mutations were detected:\n${output}`);
  }
};

/**
 * Ensure that a code block runs whilst making no mutations to the DOM. Given an
 * element and a callback, it will execute th e callback function and ensure
 * afterwards that a MutatonObserver saw no changes.
 */
export const withNoMutations = async(element: ShadowRoot, fn: (shadowRoot: ShadowRoot) => void): Promise<void> => {
  return await withMutations([], element, fn);
};
