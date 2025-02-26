// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import domLinkifierStyles from './domLinkifier.css.js';

const UIStrings = {
  /**
   * @description Text displayed when trying to create a link to a node in the UI, but the node
   * location could not be found so we display this placeholder instead. Node refers to a DOM node.
   * This should be translated if appropriate.
   */
  node: '<node>',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/DOMLinkifier.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface Options extends Common.Linkifier.Options {
  hiddenClassList?: string[];
}

export const decorateNodeLabel = function(
    node: SDK.DOMModel.DOMNode, parentElement: HTMLElement, options: Options): void {
  const originalNode = node;
  const isPseudo = node.nodeType() === Node.ELEMENT_NODE && node.pseudoType();
  if (isPseudo && node.parentNode) {
    node = node.parentNode;
  }

  // Special case rendering the node links for view transition pseudo elements.
  // We don't include the ancestor name in the node link because
  // they always have the same ancestor. See crbug.com/340633630.
  if (node.isViewTransitionPseudoNode()) {
    const pseudoElement = parentElement.createChild('span', 'extra node-label-pseudo');
    const viewTransitionPseudoText = `::${originalNode.pseudoType()}(${originalNode.pseudoIdentifier()})`;
    UI.UIUtils.createTextChild(pseudoElement, viewTransitionPseudoText);
    UI.Tooltip.Tooltip.install(parentElement, options.tooltip || viewTransitionPseudoText);
    return;
  }

  const nameElement = parentElement.createChild('span', 'node-label-name');
  if (options.textContent) {
    nameElement.textContent = options.textContent;
    UI.Tooltip.Tooltip.install(parentElement, options.tooltip || options.textContent);
    return;
  }

  let title = node.nodeNameInCorrectCase();
  nameElement.textContent = title;

  const idAttribute = node.getAttribute('id');
  if (idAttribute) {
    const idElement = parentElement.createChild('span', 'node-label-id');
    const part = '#' + idAttribute;
    title += part;
    UI.UIUtils.createTextChild(idElement, part);

    // Mark the name as extra, since the ID is more important.
    nameElement.classList.add('extra');
  }

  const classAttribute = node.getAttribute('class');
  if (classAttribute) {
    const classes = classAttribute.split(/\s+/);
    if (classes.length) {
      const foundClasses = new Set<string>();
      const classesElement = parentElement.createChild('span', 'extra node-label-class');
      for (let i = 0; i < classes.length; ++i) {
        const className = classes[i];
        if (className && !options.hiddenClassList?.includes(className) && !foundClasses.has(className)) {
          const part = '.' + className;
          title += part;
          UI.UIUtils.createTextChild(classesElement, part);
          foundClasses.add(className);
        }
      }
    }
  }

  if (isPseudo) {
    const pseudoIdentifier = originalNode.pseudoIdentifier();
    const pseudoElement = parentElement.createChild('span', 'extra node-label-pseudo');
    let pseudoText = '::' + originalNode.pseudoType();
    if (pseudoIdentifier) {
      pseudoText += `(${pseudoIdentifier})`;
    }

    UI.UIUtils.createTextChild(pseudoElement, pseudoText);
    title += pseudoText;
  }
  UI.Tooltip.Tooltip.install(parentElement, options.tooltip || title);
};

export const linkifyNodeReference = function(node: SDK.DOMModel.DOMNode|null, options: Options|undefined = {
  tooltip: undefined,
  preventKeyboardFocus: undefined,
  textContent: undefined,
  isDynamicLink: false,
}): Node {
  if (!node) {
    return document.createTextNode(i18nString(UIStrings.node));
  }

  const root = document.createElement('span');
  root.classList.add('monospace');
  const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(root, {cssFile: domLinkifierStyles});
  const link = shadowRoot.createChild('button', 'node-link text-button link-style');
  link.classList.toggle('dynamic-link', options.isDynamicLink);
  link.setAttribute('jslog', `${VisualLogging.link('node').track({click: true, keydown: 'Enter'})}`);

  decorateNodeLabel(node, link, options);

  link.addEventListener('click', () => {
    void Common.Revealer.reveal(node, false);
    return false;
  }, false);
  link.addEventListener('mouseover', node.highlight.bind(node, undefined), false);
  link.addEventListener('mouseleave', () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(), false);

  if (options.preventKeyboardFocus) {
    link.tabIndex = -1;
  }

  return root;
};

export const linkifyDeferredNodeReference = function(
    deferredNode: SDK.DOMModel.DeferredDOMNode, options: Options|undefined = {
      tooltip: undefined,
      preventKeyboardFocus: undefined,
    }): Node {
  const root = document.createElement('div');
  const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(root, {cssFile: domLinkifierStyles});
  const link = shadowRoot.createChild('button', 'node-link text-button link-style');
  link.setAttribute('jslog', `${VisualLogging.link('node').track({click: true})}`);
  link.createChild('slot');
  link.addEventListener('click', deferredNode.resolve.bind(deferredNode, onDeferredNodeResolved), false);
  link.addEventListener('mousedown', e => e.consume(), false);

  if (options.preventKeyboardFocus) {
    link.tabIndex = -1;
  }

  function onDeferredNodeResolved(node: SDK.DOMModel.DOMNode|null): void {
    void Common.Revealer.reveal(node);
  }

  return root;
};

let linkifierInstance: Linkifier;

export class Linkifier implements Common.Linkifier.Linkifier {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Linkifier {
    const {forceNew} = opts;
    if (!linkifierInstance || forceNew) {
      linkifierInstance = new Linkifier();
    }

    return linkifierInstance;
  }
  linkify(object: Object, options?: Options): Node {
    if (object instanceof SDK.DOMModel.DOMNode) {
      return linkifyNodeReference(object, options);
    }
    if (object instanceof SDK.DOMModel.DeferredDOMNode) {
      return linkifyDeferredNodeReference(object, options);
    }
    throw new Error('Can\'t linkify non-node');
  }
}
