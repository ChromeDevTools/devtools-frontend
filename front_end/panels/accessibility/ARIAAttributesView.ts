// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AccessibilitySubPane} from './AccessibilitySubPane.js';
import {ariaMetadata} from './ARIAMetadata.js';

const UIStrings = {
  /**
  *@description Text in ARIAAttributes View of the Accessibility panel
  */
  ariaAttributes: 'ARIA Attributes',
  /**
  *@description Text in ARIAAttributes View of the Accessibility panel
  */
  noAriaAttributes: 'No ARIA attributes',
};
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/ARIAAttributesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ARIAAttributesPane extends AccessibilitySubPane {
  _noPropertiesInfo: Element;
  _treeOutline: UI.TreeOutline.TreeOutline;
  constructor() {
    super(i18nString(UIStrings.ariaAttributes));

    this._noPropertiesInfo = this.createInfo(i18nString(UIStrings.noAriaAttributes));
    this._treeOutline = this.createTreeOutline();
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    super.setNode(node);
    this._treeOutline.removeChildren();
    if (!node) {
      return;
    }
    const target = node.domModel().target();
    const attributes = node.attributes();
    for (let i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];
      if (!this._isARIAAttribute(attribute)) {
        continue;
      }

      this._treeOutline.appendChild(new ARIAAttributesTreeElement(this, attribute, target));
    }

    const foundAttributes = (this._treeOutline.rootElement().childCount() !== 0);
    this._noPropertiesInfo.classList.toggle('hidden', foundAttributes);
    this._treeOutline.element.classList.toggle('hidden', !foundAttributes);
  }

  _isARIAAttribute(attribute: SDK.DOMModel.Attribute): boolean {
    return ATTRIBUTES.has(attribute.name);
  }
}

export class ARIAAttributesTreeElement extends UI.TreeOutline.TreeElement {
  _parentPane: ARIAAttributesPane;
  _attribute: SDK.DOMModel.Attribute;
  _nameElement?: HTMLSpanElement;
  _valueElement?: Element;
  _prompt?: ARIAAttributePrompt;

  constructor(parentPane: ARIAAttributesPane, attribute: SDK.DOMModel.Attribute, _target: SDK.SDKModel.Target) {
    super('');

    this._parentPane = parentPane;
    this._attribute = attribute;

    this.selectable = false;
  }

  static createARIAValueElement(value: string): Element {
    const valueElement = document.createElement('span');
    valueElement.classList.add('monospace');
    // TODO(aboxhall): quotation marks?
    valueElement.setTextContentTruncatedIfNeeded(value || '');
    return valueElement;
  }

  onattach(): void {
    this._populateListItem();
    this.listItemElement.addEventListener('click', this._mouseClick.bind(this));
  }

  _populateListItem(): void {
    this.listItemElement.removeChildren();
    this.appendNameElement(this._attribute.name);
    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';
    this.appendAttributeValueElement(this._attribute.value);
  }

  appendNameElement(name: string): void {
    this._nameElement = document.createElement('span');
    this._nameElement.textContent = name;
    this._nameElement.classList.add('ax-name');
    this._nameElement.classList.add('monospace');
    this.listItemElement.appendChild(this._nameElement);
  }

  appendAttributeValueElement(value: string): void {
    this._valueElement = ARIAAttributesTreeElement.createARIAValueElement(value);
    this.listItemElement.appendChild(this._valueElement);
  }

  _mouseClick(event: Event): void {
    if (event.target === this.listItemElement) {
      return;
    }

    event.consume(true);

    this._startEditing();
  }

  _startEditing(): void {
    const valueElement = this._valueElement;

    if (!valueElement || UI.UIUtils.isBeingEdited(valueElement)) {
      return;
    }

    const previousContent = valueElement.textContent || '';

    function blurListener(this: ARIAAttributesTreeElement, previousContent: string, event: Event): void {
      const target = event.target as HTMLElement;
      const text = target.textContent || '';
      this._editingCommitted(text, previousContent);
    }

    const attributeName = (this._nameElement as HTMLSpanElement).textContent || '';
    this._prompt = new ARIAAttributePrompt(ariaMetadata().valuesForProperty(attributeName), this);
    this._prompt.setAutocompletionTimeout(0);
    const proxyElement =
        this._prompt.attachAndStartEditing(valueElement, blurListener.bind(this, previousContent)) as HTMLElement;

    proxyElement.addEventListener('keydown', event => this._editingValueKeyDown(previousContent, event), false);

    const selection = valueElement.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(valueElement);
    }
  }

  _removePrompt(): void {
    if (!this._prompt) {
      return;
    }
    this._prompt.detach();
    delete this._prompt;
  }

  _editingCommitted(userInput: string, previousContent: string): void {
    this._removePrompt();

    // Make the changes to the attribute
    if (userInput !== previousContent) {
      const node = this._parentPane.node() as SDK.DOMModel.DOMNode;
      node.setAttributeValue(this._attribute.name, userInput);
    }
  }

  _editingCancelled(): void {
    this._removePrompt();
    this._populateListItem();
  }

  _editingValueKeyDown(previousContent: string, event: KeyboardEvent): void {
    if (event.handled) {
      return;
    }

    if (event.key === 'Enter') {
      const target = event.target as HTMLElement;
      this._editingCommitted(target.textContent || '', previousContent);
      event.consume();
      return;
    }

    if (isEscKey(event)) {
      this._editingCancelled();
      event.consume();
      return;
    }
  }
}

export class ARIAAttributePrompt extends UI.TextPrompt.TextPrompt {
  _ariaCompletions: string[];
  _treeElement: ARIAAttributesTreeElement;
  constructor(ariaCompletions: string[], treeElement: ARIAAttributesTreeElement) {
    super();
    this.initialize(this._buildPropertyCompletions.bind(this));

    this._ariaCompletions = ariaCompletions;
    this._treeElement = treeElement;
  }

  async _buildPropertyCompletions(expression: string, prefix: string, force?: boolean):
      Promise<UI.SuggestBox.Suggestions> {
    prefix = prefix.toLowerCase();
    if (!prefix && !force && expression) {
      return [];
    }
    return this._ariaCompletions.filter(value => value.startsWith(prefix)).map(c => {
      return {
        text: c,
        title: undefined,
        subtitle: undefined,
        iconType: undefined,
        priority: undefined,
        isSecondary: undefined,
        subtitleRenderer: undefined,
        selectionRange: undefined,
        hideGhostText: undefined,
        iconElement: undefined,
      };
    });
  }
}

// Keep this list in sync with https://w3c.github.io/aria/#state_prop_def
const ATTRIBUTES = new Set<string>([
  'role',
  'aria-activedescendant',
  'aria-atomic',
  'aria-autocomplete',
  'aria-brailleroledescription',
  'aria-busy',
  'aria-checked',
  'aria-colcount',
  'aria-colindex',
  'aria-colindextext',
  'aria-colspan',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-expanded',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-level',
  'aria-live',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-orientation',
  'aria-owns',
  'aria-placeholder',
  'aria-posinset',
  'aria-pressed',
  'aria-readonly',
  'aria-relevant',
  'aria-required',
  'aria-roledescription',
  'aria-rowcount',
  'aria-rowindex',
  'aria-rowindextext',
  'aria-rowspan',
  'aria-selected',
  'aria-setsize',
  'aria-sort',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
  'aria-valuetext',
]);
