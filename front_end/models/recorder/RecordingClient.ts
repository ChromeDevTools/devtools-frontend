// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Step {
  type: string;
  selector: string;
  value?: string;
}
declare global {
  interface HTMLElement {
    role: string;
    ariaLabel: string|null;
  }

  interface Window {
    _recorderEventListener?: (event: Event) => void;
    addStep(step: string): void;
  }
}

export interface Exports {
  createStepFromEvent?: (event: Event, target: EventTarget|null, isTrusted: boolean) => Step | undefined;
  getSelector?: (node: Node) => string;
  teardown?: () => void;
}

/**
 * This function is special because it gets injected into the target page.
 * All runtime code should be defined withing the function so that it can
 * be serialised.
 */
export function setupRecordingClient(
    bindings: {
      getAccessibleName: (node: Node) => string,
      getAccessibleRole: (node: Node) => string,
    },
    debug = false, exports: Exports = {}): void {
  const log = (...args: unknown[]): void => {
    if (debug) {
      console.log(...args);  // eslint-disable-line no-console
    }
  };

  const createStepFromEvent = (event: Event, target: EventTarget|null, isTrusted = false): Step|undefined => {
    // Clicking on a submit button will emit a submit event
    // which will be handled in a different handler.
    // TODO: figure out the event type for Submit.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event.type === 'submit' && Boolean((event as any).submitter)) {
      return;
    }
    if (!target || !isTrusted) {
      return;
    }
    const nodeTarget = target as Node;
    return {type: event.type, selector: getSelector(nodeTarget), value: (target as HTMLInputElement).value};
  };
  exports.createStepFromEvent = createStepFromEvent;

  const recorderEventListener = (event: Event): void => {
    const target = event.target as HTMLButtonElement;
    log(target.nodeName, target.type);
    const step = createStepFromEvent(event, event.target, event.isTrusted);
    if (!step) {
      return;
    }
    window.addStep(JSON.stringify(step));
  };

  if (!window._recorderEventListener) {
    log('Setting _recorderEventListener');
    window.addEventListener('click', recorderEventListener, true);
    window.addEventListener('submit', recorderEventListener, true);
    window.addEventListener('change', recorderEventListener, true);
    window._recorderEventListener = recorderEventListener;
  } else {
    log('_recorderEventListener was already installed');
  }

  const teardown = (): void => {
    window.removeEventListener('click', recorderEventListener, true);
    window.removeEventListener('submit', recorderEventListener, true);
    window.removeEventListener('change', recorderEventListener, true);
    delete window._recorderEventListener;
  };
  exports.teardown = teardown;

  const RELEVANT_ROLES_FOR_ARIA_SELECTORS = new Set(['button', 'link', 'textbox', 'checkbox', 'combobox', 'option']);

  const getSelector = (node: Node): string => {
    let axNode: Node|null = node;
    while (axNode) {
      const role = bindings.getAccessibleRole(axNode);
      const name = bindings.getAccessibleName(axNode);
      log('Getting a11y role and name for a node', role, name, axNode);
      if (name && RELEVANT_ROLES_FOR_ARIA_SELECTORS.has(role)) {
        return `aria/${name}`;
      }
      axNode = axNode.parentNode;
    }
    return cssPath(node);
  };
  exports.getSelector = getSelector;

  const nodeNameInCorrectCase = (node: Node): string => {
    // If there is no local name, it's case sensitive
    if (!('localName' in node)) {
      return node.nodeName;
    }

    const element = node as Element;

    // If the names are different lengths, there is a prefix and it's case sensitive
    if (element.localName.length !== element.nodeName.length) {
      return element.nodeName;
    }

    // Return the localname, which will be case insensitive if its an html node
    return element.localName;
  };

  const cssPathStep = function(node: Node, optimized: boolean, isTargetNode: boolean): PathStep|null {
    if (!(node instanceof Element)) {
      return null;
    }

    const id = node.id;
    if (optimized) {
      if (id) {
        return new PathStep(idSelector(id), true);
      }
      const nodeNameLower = node.nodeName.toLowerCase();
      if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html') {
        return new PathStep(nodeNameInCorrectCase(node), true);
      }
    }
    const nodeName = nodeNameInCorrectCase(node);

    if (id) {
      return new PathStep(nodeName + idSelector(id), true);
    }
    const parent = node.parentNode;
    if (!parent) {
      return new PathStep(nodeName, true);
    }

    function prefixedElementClassNames(node: Element): string[] {
      const classAttribute = node.getAttribute('class');
      if (!classAttribute) {
        return [];
      }

      return classAttribute.split(/\s+/g).filter(Boolean).map(function(name) {
        // The prefix is required to store "__proto__" in a object-based map.
        return '$' + name;
      });
    }

    function idSelector(id: string): string {
      return '#' + CSS.escape(id);
    }

    const prefixedOwnClassNamesArray = prefixedElementClassNames(node);
    let needsClassNames = false;
    let needsNthChild = false;
    let ownIndex = -1;
    let elementIndex = -1;
    const siblings = parent.children;
    for (let i = 0; siblings && (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
      const sibling = siblings[i];
      elementIndex += 1;
      if (sibling === node) {
        ownIndex = elementIndex;
        continue;
      }
      if (needsNthChild) {
        continue;
      }
      if (nodeNameInCorrectCase(sibling) !== nodeName) {
        continue;
      }

      needsClassNames = true;
      const ownClassNames = new Set<string>(prefixedOwnClassNamesArray);
      if (!ownClassNames.size) {
        needsNthChild = true;
        continue;
      }
      const siblingClassNamesArray = prefixedElementClassNames(sibling);
      for (let j = 0; j < siblingClassNamesArray.length; ++j) {
        const siblingClass = siblingClassNamesArray[j];
        if (!ownClassNames.has(siblingClass)) {
          continue;
        }
        ownClassNames.delete(siblingClass);
        if (!ownClassNames.size) {
          needsNthChild = true;
          break;
        }
      }
    }

    let result = nodeName;
    if (isTargetNode && nodeName.toLowerCase() === 'input' && node.getAttribute('type') && !node.getAttribute('id') &&
        !node.getAttribute('class')) {
      result += '[type=' + CSS.escape((node.getAttribute('type')) || '') + ']';
    }
    if (needsNthChild) {
      result += ':nth-child(' + (ownIndex + 1) + ')';
    } else if (needsClassNames) {
      for (const prefixedName of prefixedOwnClassNamesArray) {
        result += '.' + CSS.escape(prefixedName.slice(1));
      }
    }

    return new PathStep(result, false);
  };

  const cssPath = function(node: Node|null, optimized?: boolean): string {
    const steps = [];
    let contextNode: Node|null = node;
    while (contextNode) {
      const step = cssPathStep(contextNode, Boolean(optimized), contextNode === node);
      if (!step) {
        break;
      }  // Error - bail out early.
      steps.push(step);
      if (step.optimized) {
        break;
      }
      contextNode = contextNode.parentNode;
    }

    steps.reverse();
    return steps.join(' > ');
  };

  class PathStep {
    value: string;
    optimized: boolean;
    constructor(value: string, optimized: boolean) {
      this.value = value;
      this.optimized = optimized || false;
    }

    toString(): string {
      return this.value;
    }
  }
}
