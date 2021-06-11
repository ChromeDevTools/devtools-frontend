// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Selector = string|string[];

export type Step = {
  type: 'click',
  selector: Selector,
}|{
  type: 'submit',
  selector: Selector,
}|{
  type: 'change',
  selector: Selector,
  value: string,
}|{
  type: 'keydown',
  altKey: boolean,
  ctrlKey: boolean,
  key: string,
  metaKey: boolean,
  shiftKey: boolean,
}|{
  type: 'keyup',
  altKey: boolean,
  ctrlKey: boolean,
  key: string,
  metaKey: boolean,
  shiftKey: boolean,
};

export function clientStepHasFrameContext(step: Step): boolean {
  return ['click', 'change', 'submit', 'keydown', 'keyup'].includes(step.type);
}

declare global {
  interface HTMLElement {
    role: string;
    ariaLabel: string|null;
  }

  interface SubmitEvent extends Event {
    submitter: HTMLElement;
  }

  interface HTMLElementEventMap {
    submit: SubmitEvent;
  }

  interface Window {
    _recorderEventListener?: (event: Event) => void;
    addStep(step: string): void;
  }
}

export interface Exports {
  createStepFromEvent?: (event: Event, target: EventTarget|null, isTrusted: boolean) => Step | undefined;
  getSelector?: (node: Node) => Selector;
  getARIASelector?: (node: Node) => Selector | undefined;
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
    debug = false, allowUntrustedEvents = false, exports: Exports = {}): void {
  const log = (...args: unknown[]): void => {
    if (debug) {
      console.log(...args);  // eslint-disable-line no-console
    }
  };

  // Queries the DOM tree for elements with matching accessibility name and role.
  // It attempts to mimic https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/#method-queryAXTree.
  const queryA11yTree = (parent: Element|Document, name?: string, role?: string): Element[] => {
    const result: Element[] = [];
    if (!name && !role) {
      throw new Error('Both role and name are empty');
    }
    const shouldMatchName = Boolean(name);
    const shouldMatchRole = Boolean(role);
    const collect = (root: Element|ShadowRoot): void => {
      const iter = document.createTreeWalker(
          root,
          NodeFilter.SHOW_ELEMENT,
      );
      do {
        const currentNode = iter.currentNode as HTMLElement;
        if (currentNode.shadowRoot) {
          collect(currentNode.shadowRoot);
        }
        if (currentNode instanceof ShadowRoot) {
          continue;
        }
        if (shouldMatchName && bindings.getAccessibleName(currentNode) !== name) {
          continue;
        }
        if (shouldMatchRole && bindings.getAccessibleRole(currentNode) !== role) {
          continue;
        }
        result.push(currentNode);
      } while (iter.nextNode());
    };
    collect(parent instanceof Document ? document.documentElement : parent);
    return result;
  };

  const createStepFromEvent = (event: Event, target: EventTarget|null, isTrusted = false): Step|undefined => {
    if (!target || (!isTrusted && !allowUntrustedEvents)) {
      return;
    }
    const nodeTarget = target as Node;
    if (event.type === 'click') {
      return {
        type: event.type,
        selector: getSelector(nodeTarget),
      };
    }
    if (event.type === 'change') {
      // Currently we support a Change event only for the select element.
      // Perhaps eventually we need to create a select-change event to
      // capture select-specific logic.
      if (nodeTarget.nodeName.toLowerCase() !== 'select') {
        return;
      }
      return {type: event.type, selector: getSelector(nodeTarget), value: (target as HTMLInputElement).value};
    }
    if (event.type === 'keydown' || event.type === 'keyup') {
      const keyboardEvent = event as KeyboardEvent;
      return {
        type: event.type,
        altKey: keyboardEvent.altKey,
        ctrlKey: keyboardEvent.ctrlKey,
        key: keyboardEvent.key,
        metaKey: keyboardEvent.metaKey,
        shiftKey: keyboardEvent.shiftKey,
      };
    }
    return;
  };
  exports.createStepFromEvent = createStepFromEvent;

  let lastStep: Step|undefined;
  const recorderEventListener = (event: Event): void => {
    const target = event.composedPath()[0] as HTMLButtonElement;
    log(target.nodeName, target.type);
    const step = createStepFromEvent(event, target, event.isTrusted);
    if (!step) {
      return;
    }
    // If you click on a select option both the change event and click event fire.
    // Therefore, we ignore the click.
    if (lastStep && step.type === 'click' && lastStep.type === 'change' && step.selector === lastStep.selector) {
      return;
    }
    window.addStep(JSON.stringify(step));
    lastStep = step;
  };

  if (!window._recorderEventListener) {
    log('Setting _recorderEventListener');
    window.addEventListener('click', recorderEventListener, true);
    window.addEventListener('submit', recorderEventListener, true);
    window.addEventListener('change', recorderEventListener, true);
    window.addEventListener('keydown', recorderEventListener, true);
    window.addEventListener('keyup', recorderEventListener, true);
    window._recorderEventListener = recorderEventListener;
  } else {
    log('_recorderEventListener was already installed');
  }

  const teardown = (): void => {
    window.removeEventListener('click', recorderEventListener, true);
    window.removeEventListener('submit', recorderEventListener, true);
    window.removeEventListener('change', recorderEventListener, true);
    window.removeEventListener('keydown', recorderEventListener, true);
    window.removeEventListener('keyup', recorderEventListener, true);
    delete window._recorderEventListener;
  };
  exports.teardown = teardown;

  const getSelector = (node: Node): Selector => {
    const selector = getARIASelector(node) || getCSSSelector(node);
    if (selector.length === 1) {
      return selector[0];
    }
    return selector;
  };
  exports.getSelector = getSelector;

  const getCSSSelector = (node: Node): Selector => {
    const selectors: string[] = [];
    do {
      const result = cssPath(node, true);
      selectors.unshift(result.selector);
      if (result.root instanceof ShadowRoot) {
        node = result.root.host;
        continue;
      }
      return selectors;
    } while (true);
  };

  const queryA11yTreeOneByName = (parent: Element|Document, name?: string): Element|null => {
    if (!name) {
      return null;
    }
    const result = queryA11yTree(parent, name);
    if (result.length !== 1) {
      return null;
    }
    return result[0];
  };

  const queryA11yTreeOneByRole = (parent: Element|Document, role?: string): Element|null => {
    if (!role) {
      return null;
    }
    const result = queryA11yTree(parent, undefined, role);
    if (result.length !== 1) {
      return null;
    }
    return result[0];
  };

  const queryA11yTreeOneByNameAndRole = (parent: Element|Document, name?: string, role?: string): Element|null => {
    if (!role || !name) {
      return null;
    }
    const result = queryA11yTree(parent, name, role);
    if (result.length !== 1) {
      return null;
    }
    return result[0];
  };

  // Takes a path consisting of element names and roles and makes sure that
  // every element resolves to a single result. If it does, the selector is added
  // to the chain of selectors.
  const computeUniqueARIASelectorForElements =
      (elements: {name: string, role: string}[], queryByRoleOnly: boolean): string[]|null => {
        const selectors = [];
        let parent: Element|Document = document;
        for (const element of elements) {
          let result = queryA11yTreeOneByName(parent, element.name);
          if (result) {
            selectors.push(`aria/${element.name}`);
            parent = result;
            continue;
          }
          if (queryByRoleOnly) {
            result = queryA11yTreeOneByRole(parent, element.role);
            if (result) {
              selectors.push(`aria/[role="${element.role}"]`);
              parent = result;
              continue;
            }
          }
          result = queryA11yTreeOneByNameAndRole(parent, element.name, element.role);
          if (result) {
            selectors.push(`aria/${element.name}[role="${element.role}"]`);
            parent = result;
            continue;
          }
          return null;
        }
        return selectors;
      };

  const getARIASelector = (node: Node): Selector|undefined => {
    let current: Node|null = node;
    const elements: {name: string, role: string}[] = [];
    while (current) {
      if (current instanceof ShadowRoot) {
        current = current.host;
        continue;
      }
      const role = bindings.getAccessibleRole(current);
      const name = bindings.getAccessibleName(current);
      log('Getting a11y role and name for a node', role, name, current);
      if (!role && !name) {
        current = current.parentNode;
        continue;
      }
      elements.unshift({name, role});
      const selectors = computeUniqueARIASelectorForElements(elements, current !== node);
      if (selectors) {
        return selectors;
      }
      if (current !== node) {
        elements.shift();
      }
      current = current.parentNode;
    }

    return;
  };
  exports.getARIASelector = getARIASelector;

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

  const cssPath = function(node: Node|null, optimized?: boolean): {root: Node|null, selector: string} {
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

    contextNode = node;
    while (contextNode) {
      if (contextNode instanceof ShadowRoot) {
        return {
          selector: steps.join(' > '),
          root: contextNode,
        };
      }
      contextNode = contextNode.parentNode;
    }


    return {
      selector: steps.join(' > '),
      root: null,
    };
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
