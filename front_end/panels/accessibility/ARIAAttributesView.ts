// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import accessibilityPropertiesStyles from './accessibilityProperties.css.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';
import {ariaMetadata} from './ARIAMetadata.js';

const UIStrings = {
  /**
   * @description Text in ARIAAttributes View of the Accessibility panel
   */
  ariaAttributes: 'ARIA Attributes',
  /**
   * @description Text in ARIAAttributes View of the Accessibility panel
   */
  noAriaAttributes: 'No ARIA attributes',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/ARIAAttributesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = Lit;

interface ViewInput {
  propertyCompletions: Map<SDK.DOMModel.Attribute, string[]>;
  onStartEditing: (attribute: SDK.DOMModel.Attribute) => void;
  onCommitEditing: (attribute: SDK.DOMModel.Attribute, result: string) => void;
  onCancelEditing: (attribute: SDK.DOMModel.Attribute) => void;
  attributeBeingEdited: SDK.DOMModel.Attribute|null;
  attributes: SDK.DOMModel.Attribute[];
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const MAX_CONTENT_LENGTH = 10000;

  const onStartEditing = (attribute: SDK.DOMModel.Attribute, e: MouseEvent): void => {
    e.consume(true);
    input.onStartEditing(attribute);
  };

  const propertyCompletions = (attribute: SDK.DOMModel.Attribute): Lit.LitTemplate => {
    const values = input.propertyCompletions.get(attribute);
    if (!values?.length) {
      return Lit.nothing;
    }

    return html`<datalist id=completions>
      ${values.map(value => html`<option>${value}</option>`)}
    </datalist>`;
  };

  render(
      // clang-format off
      input.attributes.length === 0 ?
         html`
          <style>${accessibilityPropertiesStyles}</style>
          <devtools-widget
            .widgetConfig=${UI.Widget.widgetConfig(UI.EmptyWidget.EmptyWidget,
                                                   {text: i18nString(UIStrings.noAriaAttributes)})}
            class="gray-info-message info-message-overflow"></devtools-widget>` :
         html`<devtools-tree
           hide-overflow
           .template=${html`
             <ul role="tree">
              ${input.attributes?.map(attribute => html`
                <li role="treeitem">
                  <style>${accessibilityPropertiesStyles}</style>
                  <span class="ax-name monospace" @mousedown=${onStartEditing.bind(null, attribute)}>
                    ${attribute.name}
                  </span>
                  <span class="separator" @mousedown=${onStartEditing.bind(null, attribute)}>${':\xA0'}</span>
                  <devtools-prompt
                    completions=completions
                    class="monospace"
                    @mousedown=${onStartEditing.bind(null, attribute)}
                    .completionTimeout=${0}
                    ?editing=${input.attributeBeingEdited === attribute}
                    @commit=${(e: UI.TextPrompt.TextPromptElement.CommitEvent) =>
                      input.onCommitEditing(attribute, e.detail)}
                    @cancel=${() => input.onCancelEditing(attribute)}>
                      ${Platform.StringUtilities.trimMiddle(attribute.value, MAX_CONTENT_LENGTH)}
                      ${propertyCompletions(attribute)}
                  </devtools-prompt>
                </li>`)}
             </ul>
           `}></devtools-tree>`,
      // clang-format on
      target);
};

export class ARIAAttributesPane extends AccessibilitySubPane {
  readonly #view: View;
  #attributeBeingEdited: SDK.DOMModel.Attribute|null = null;

  constructor(view = DEFAULT_VIEW) {
    super({
      title: i18nString(UIStrings.ariaAttributes),
      viewId: 'aria-attributes',
      jslog: `${VisualLogging.section('aria-attributes')}`,
    });

    this.#view = view;
  }

  override setNode(node: SDK.DOMModel.DOMNode|null): void {
    super.setNode(node);
    this.requestUpdate();
  }

  override performUpdate(): void {
    const onStartEditing = (attribute: SDK.DOMModel.Attribute): void => {
      this.#attributeBeingEdited = attribute;
      this.requestUpdate();
    };
    const onCancelEditing = (attribute: SDK.DOMModel.Attribute): void => {
      if (attribute === this.#attributeBeingEdited) {
        this.#attributeBeingEdited = null;
      }
      this.requestUpdate();
    };

    const onCommitEditing = (attribute: SDK.DOMModel.Attribute, result: string): void => {
      // Make the changes to the attribute
      const node = this.node();
      if (node && attribute.value !== result) {
        node.setAttributeValue(attribute.name, result);
      }
      if (attribute === this.#attributeBeingEdited) {
        this.#attributeBeingEdited = null;
      }
      this.requestUpdate();
    };

    const attributes = this.node()?.attributes()?.filter(attribute => this.isARIAAttribute(attribute)) ?? [];
    const propertyCompletions =
        new Map(attributes.map(attribute => [attribute, ariaMetadata().valuesForProperty(attribute.name)]));

    const input: ViewInput = {
      attributeBeingEdited: this.#attributeBeingEdited,
      attributes,
      onStartEditing,
      onCommitEditing,
      onCancelEditing,
      propertyCompletions,
    };
    this.#view(input, {}, this.contentElement);
  }

  private isARIAAttribute(attribute: SDK.DOMModel.Attribute): boolean {
    return SDK.DOMModel.ARIA_ATTRIBUTES.has(attribute.name);
  }
}
