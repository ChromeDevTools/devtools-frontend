// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

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
  disabled?: boolean;
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

export class DOMNodeLink extends UI.Widget.Widget {
  #node: SDK.DOMModel.DOMNode|undefined = undefined;
  #options: Options|undefined = undefined;

  constructor(element?: HTMLElement, node?: SDK.DOMModel.DOMNode, options?: Options) {
    super(true, undefined, element);
    this.element.classList.remove('vbox');
    this.#node = node;
    this.#options = options;
    this.performUpdate();
  }

  override performUpdate(): void {
    const node = this.#node;
    const options = this.#options ?? {
      tooltip: undefined,
      preventKeyboardFocus: undefined,
      textContent: undefined,
      isDynamicLink: false,
      disabled: false,
    };
    this.contentElement.removeChildren();
    if (!node) {
      this.contentElement.appendChild(document.createTextNode(i18nString(UIStrings.node)));
      return;
    }

    const root = this.contentElement.createChild('span', 'monospace');
    this.registerRequiredCSS(domLinkifierStyles);
    const link = root.createChild('button', 'node-link text-button link-style');
    link.classList.toggle('dynamic-link', options.isDynamicLink);
    link.classList.toggle('disabled', options.disabled);
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
  }
}

export class DeferredDOMNodeLink extends UI.Widget.Widget {
  #deferredNode: SDK.DOMModel.DeferredDOMNode|undefined = undefined;
  #options: Options|undefined = undefined;

  constructor(element?: HTMLElement, deferredNode?: SDK.DOMModel.DeferredDOMNode, options?: Options) {
    super(true, undefined, element);
    this.element.classList.remove('vbox');
    this.#deferredNode = deferredNode;
    this.#options = options;
    this.performUpdate();
  }

  override performUpdate(): void {
    this.contentElement.removeChildren();
    const deferredNode = this.#deferredNode;
    if (!deferredNode) {
      return;
    }
    const options = this.#options ?? {
      tooltip: undefined,
      preventKeyboardFocus: undefined,
    };
    this.registerRequiredCSS(domLinkifierStyles);
    const link = this.contentElement.createChild('button', 'node-link text-button link-style');
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
  }
}

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
      const link = document.createElement('devtools-widget') as UI.Widget.WidgetElement<DOMNodeLink>;
      link.widgetConfig = UI.Widget.widgetConfig(e => new DOMNodeLink(e, object, options));
      return link;
    }
    if (object instanceof SDK.DOMModel.DeferredDOMNode) {
      const link = document.createElement('devtools-widget') as UI.Widget.WidgetElement<DeferredDOMNodeLink>;
      link.widgetConfig = UI.Widget.widgetConfig(e => new DeferredDOMNodeLink(e, object, options));
      return link;
    }
    throw new Error('Can\'t linkify non-node');
  }
}
