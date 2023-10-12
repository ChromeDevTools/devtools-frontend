// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

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
  private readonly noPropertiesInfo: Element;
  private readonly treeOutline: UI.TreeOutline.TreeOutline;
  constructor() {
    super(i18nString(UIStrings.ariaAttributes));

    this.noPropertiesInfo = this.createInfo(i18nString(UIStrings.noAriaAttributes));
    this.treeOutline = this.createTreeOutline();
    this.element.setAttribute('jslog', `${VisualLogging.ariaAttributes()}`);
  }

  override setNode(node: SDK.DOMModel.DOMNode|null): void {
    super.setNode(node);
    this.treeOutline.removeChildren();
    if (!node) {
      return;
    }
    const target = node.domModel().target();
    const attributes = node.attributes();
    for (let i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];
      if (!this.isARIAAttribute(attribute)) {
        continue;
      }

      this.treeOutline.appendChild(new ARIAAttributesTreeElement(this, attribute, target));
    }

    const foundAttributes = (this.treeOutline.rootElement().childCount() !== 0);
    this.noPropertiesInfo.classList.toggle('hidden', foundAttributes);
    this.treeOutline.element.classList.toggle('hidden', !foundAttributes);
  }

  private isARIAAttribute(attribute: SDK.DOMModel.Attribute): boolean {
    return ATTRIBUTES.has(attribute.name);
  }
}

export class ARIAAttributesTreeElement extends UI.TreeOutline.TreeElement {
  private readonly parentPane: ARIAAttributesPane;
  private readonly attribute: SDK.DOMModel.Attribute;
  private nameElement?: HTMLSpanElement;
  private valueElement?: Element;
  private prompt?: ARIAAttributePrompt;

  constructor(parentPane: ARIAAttributesPane, attribute: SDK.DOMModel.Attribute, _target: SDK.Target.Target) {
    super('');

    this.parentPane = parentPane;
    this.attribute = attribute;

    this.selectable = false;
  }

  static createARIAValueElement(value: string): Element {
    const valueElement = document.createElement('span');
    valueElement.classList.add('monospace');
    // TODO(aboxhall): quotation marks?
    valueElement.setTextContentTruncatedIfNeeded(value || '');
    return valueElement;
  }

  override onattach(): void {
    this.populateListItem();
    this.listItemElement.addEventListener('click', this.mouseClick.bind(this));
  }

  private populateListItem(): void {
    this.listItemElement.removeChildren();
    this.appendNameElement(this.attribute.name);
    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';
    this.appendAttributeValueElement(this.attribute.value);
  }

  appendNameElement(name: string): void {
    this.nameElement = document.createElement('span');
    this.nameElement.textContent = name;
    this.nameElement.classList.add('ax-name');
    this.nameElement.classList.add('monospace');
    this.listItemElement.appendChild(this.nameElement);
  }

  appendAttributeValueElement(value: string): void {
    this.valueElement = ARIAAttributesTreeElement.createARIAValueElement(value);
    this.listItemElement.appendChild(this.valueElement);
  }

  private mouseClick(event: Event): void {
    if (event.target === this.listItemElement) {
      return;
    }

    event.consume(true);

    this.startEditing();
  }

  private startEditing(): void {
    const valueElement = this.valueElement;

    if (!valueElement || UI.UIUtils.isBeingEdited(valueElement)) {
      return;
    }

    const previousContent = valueElement.textContent || '';

    function blurListener(this: ARIAAttributesTreeElement, previousContent: string, event: Event): void {
      const target = event.target as HTMLElement;
      const text = target.textContent || '';
      this.editingCommitted(text, previousContent);
    }

    const attributeName = (this.nameElement as HTMLSpanElement).textContent || '';
    this.prompt = new ARIAAttributePrompt(ariaMetadata().valuesForProperty(attributeName), this);
    this.prompt.setAutocompletionTimeout(0);
    const proxyElement =
        this.prompt.attachAndStartEditing(valueElement, blurListener.bind(this, previousContent)) as HTMLElement;

    proxyElement.addEventListener('keydown', event => this.editingValueKeyDown(previousContent, event), false);

    const selection = valueElement.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(valueElement);
    }
  }

  private removePrompt(): void {
    if (!this.prompt) {
      return;
    }
    this.prompt.detach();
    delete this.prompt;
  }

  private editingCommitted(userInput: string, previousContent: string): void {
    this.removePrompt();

    // Make the changes to the attribute
    if (userInput !== previousContent) {
      const node = this.parentPane.node() as SDK.DOMModel.DOMNode;
      node.setAttributeValue(this.attribute.name, userInput);
    }
  }

  private editingCancelled(): void {
    this.removePrompt();
    this.populateListItem();
  }

  private editingValueKeyDown(previousContent: string, event: KeyboardEvent): void {
    if (event.handled) {
      return;
    }

    if (event.key === 'Enter') {
      const target = event.target as HTMLElement;
      this.editingCommitted(target.textContent || '', previousContent);
      event.consume();
      return;
    }

    if (Platform.KeyboardUtilities.isEscKey(event)) {
      this.editingCancelled();
      event.consume();
      return;
    }
  }
}

export class ARIAAttributePrompt extends UI.TextPrompt.TextPrompt {
  private readonly ariaCompletions: string[];
  private readonly treeElement: ARIAAttributesTreeElement;
  constructor(ariaCompletions: string[], treeElement: ARIAAttributesTreeElement) {
    super();
    this.initialize(this.buildPropertyCompletions.bind(this));

    this.ariaCompletions = ariaCompletions;
    this.treeElement = treeElement;
  }

  private async buildPropertyCompletions(expression: string, prefix: string, force?: boolean):
      Promise<UI.SuggestBox.Suggestions> {
    prefix = prefix.toLowerCase();
    if (!prefix && !force && expression) {
      return [];
    }
    return this.ariaCompletions.filter(value => value.startsWith(prefix)).map(c => {
      return {
        text: c,
        title: undefined,
        subtitle: undefined,
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
  'aria-braillelabel',
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
  'aria-description',
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
