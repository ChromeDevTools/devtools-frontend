// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';

const SUMMARY_ELEMENT_SELECTOR = 'summary';

const domNodeIsTree = (domNode: HTMLElement): boolean => {
  return domNode.getAttribute('role') === 'tree';
};

const domNodeIsBreakpointItemNode = (domNode: HTMLElement): boolean => {
  return domNode.getAttribute('role') === 'treeitem';
};

const domNodeIsPauseOnExceptionsNode = (domNode: HTMLElement): boolean => {
  return domNode.getAttribute('data-first-pause') !== null || domNode.getAttribute('data-last-pause') !== null;
};

const domNodeIsSummaryNode = (domNode: HTMLElement): boolean => {
  return !domNodeIsBreakpointItemNode(domNode);
};

const groupIsExpanded = (detailsElement: HTMLDetailsElement): boolean => {
  return detailsElement.getAttribute('open') !== null;
};

const getFirstBreakpointItemInGroup = (detailsElement: HTMLDetailsElement): HTMLElement|null => {
  return detailsElement.querySelector<HTMLElement>('[data-first-breakpoint]');
};

const getLastBreakpointItemInGroup = (detailsElement: HTMLDetailsElement): HTMLElement|null => {
  return detailsElement.querySelector<HTMLDivElement>('[data-last-breakpoint]');
};

const getNextGroupsSummaryNode = (detailsElement: HTMLDetailsElement): HTMLElement|null => {
  const nextDetailsElement = getNextDetailsElement(detailsElement);
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement?.querySelector<HTMLElement>('summary');
  }
  return null;
};

const getCurrentSummaryNode = (detailsElement: HTMLDetailsElement): HTMLElement|null => {
  return detailsElement.querySelector<HTMLElement>(SUMMARY_ELEMENT_SELECTOR);
};

const getNextDetailsElement = (detailsElement: HTMLDetailsElement): HTMLDetailsElement|null => {
  const nextDetailsElement = detailsElement.nextElementSibling;
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement;
  }
  return null;
};

const getPreviousDetailsElement = (detailsElement: HTMLDetailsElement): HTMLDetailsElement|null => {
  const previousDetailsElement = detailsElement.previousElementSibling;
  if (previousDetailsElement && previousDetailsElement instanceof HTMLDetailsElement) {
    return previousDetailsElement;
  }
  return null;
};

function findNextNodeForPauseOnExceptions(target: HTMLElement, key: Platform.KeyboardUtilities.ArrowKey): HTMLElement|
    null {
  // Handle keyboard navigation on one of the pause on exceptions checkboxes.
  console.assert(domNodeIsPauseOnExceptionsNode(target));
  let nextNode: HTMLElement|null = null;
  switch (key) {
    case Platform.KeyboardUtilities.ArrowKey.UP: {
      const previousElementSibling = target.previousElementSibling;
      if (previousElementSibling instanceof HTMLElement) {
        nextNode = previousElementSibling;
        console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.DOWN: {
      const nextElementSibling = target.nextElementSibling;
      if (nextElementSibling instanceof HTMLElement) {
        if (domNodeIsTree(nextElementSibling)) {
          const detailsElement = nextElementSibling.querySelector<HTMLDetailsElement>('[data-first-group]');
          if (detailsElement) {
            nextNode = getCurrentSummaryNode(detailsElement);
          }
        } else {
          nextNode = nextElementSibling;
          console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
        }
      }
      break;
    }
    default:
      break;
  }

  return nextNode;
}

export async function findNextNodeForKeyboardNavigation(
    target: HTMLElement, key: Platform.KeyboardUtilities.ArrowKey,
    setGroupExpandedStateCallback: (detailsElement: HTMLDetailsElement, expanded: boolean) =>
        Promise<unknown>): Promise<HTMLElement|null> {
  if (domNodeIsPauseOnExceptionsNode(target)) {
    return findNextNodeForPauseOnExceptions(target, key);
  }

  // Handle keyboard navigation in the breakpoint tree.
  const detailsElement = target.parentElement;
  if (!detailsElement || !(detailsElement instanceof HTMLDetailsElement)) {
    throw new Error('The selected nodes should be direct children of an HTMLDetails element.');
  }

  let nextNode: HTMLElement|null = null;
  switch (key) {
    case Platform.KeyboardUtilities.ArrowKey.LEFT: {
      if (domNodeIsSummaryNode(target)) {
        // On a summary node, collapse if group is expanded.
        if (groupIsExpanded(detailsElement)) {
          await setGroupExpandedStateCallback(detailsElement, false);
        }
      } else {
        // On a breakpoint item node, navigate up to the summary node.
        return getCurrentSummaryNode(detailsElement);
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.RIGHT: {
      if (domNodeIsSummaryNode(target)) {
        // On a summary node, expand if group is collapsed, and otherwise navigate
        // to the first breakpoint item in this group.
        if (groupIsExpanded(detailsElement)) {
          return getFirstBreakpointItemInGroup(detailsElement);
        }
        await setGroupExpandedStateCallback(detailsElement, true);
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.DOWN: {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          // If the current node is a summary node of an expanded group, navigating down
          // should lead to the first breakpoint item within the group.
          nextNode = getFirstBreakpointItemInGroup(detailsElement);
        } else {
          // If the current node is a summary node of a collapsed group, go to the next
          // group's summary node if existent.
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      } else {
        // If the current node is a breakpoint item, try to get the next
        // breakpoint item if available, otherwise the next group's summary
        // node.
        const nextSibling = target.nextElementSibling;
        if (nextSibling && nextSibling instanceof HTMLDivElement) {
          nextNode = nextSibling;
        } else {
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.UP: {
      // If the current node is a summary node, navigating upwards will either
      // navigate to the last breakpoint item of the previous group (if expanded),
      // and otherwise navigate to the previous group's summary node.
      if (domNodeIsSummaryNode(target)) {
        const previousDetailsElement = getPreviousDetailsElement(detailsElement);
        if (previousDetailsElement) {
          if (groupIsExpanded(previousDetailsElement)) {
            nextNode = getLastBreakpointItemInGroup(previousDetailsElement);
          } else {
            nextNode = getCurrentSummaryNode(previousDetailsElement);
          }
        } else {
          const pauseOnExceptions = detailsElement.parentElement?.previousElementSibling;
          if (pauseOnExceptions instanceof HTMLElement) {
            nextNode = pauseOnExceptions;
          }
        }
      } else {
        // If the current node is a breakpoint item, going up should get
        // the previous sibling, which can be both a summary node or a
        // a breakpoint item.
        const previousSibling = target.previousElementSibling;
        if (previousSibling instanceof HTMLElement) {
          nextNode = previousSibling;
        }
      }
      break;
    }
  }
  return nextNode;
}
