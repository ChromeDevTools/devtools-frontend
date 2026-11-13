// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';

import * as Elements from '../../models/elements/elements.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as ElementsComponents from './components/components.js';
import type {StylePropertiesSection} from './StylePropertiesSection.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import type {StylesContainer} from './StylesContainer.js';

const {ref, repeat} = Directives;

let instance: StyleEditorWidget|null = null;

export interface ViewInput {
  editorClass?: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor;
  authoredProperties: Map<string, string>;
  computedProperties: Map<string, string>;
  onPropertySelected: (event: ElementsComponents.StylePropertyEditor.PropertySelectedEvent) => void;
  onPropertyDeselected: (event: ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent) => void;
}

export interface ViewOutput {
  waitForEditorUpdate?: () => Promise<void>;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(
      html`<div tabindex="0" autofocus>${input.editorClass ? repeat(
          [input.editorClass],
          editorClass => editorClass,
          editorClass => html`<devtools-widget
            ${UI.Widget.widget(editorClass, {
              authoredProperties: input.authoredProperties,
              computedProperties: input.computedProperties,
            })}
            ${UI.Widget.widgetRef(editorClass, editor => {
              output.waitForEditorUpdate = () => editor.updateComplete;
            })}
            @propertyselected=${input.onPropertySelected}
            @propertydeselected=${input.onPropertyDeselected}
          ></devtools-widget>`,
      ) : nothing}</div>`,
      target, {container: {classes: ['with-padding']}});
  // clang-format on
};

/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export class StyleEditorWidget extends UI.Widget.VBox {
  #editorClass?: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor;
  #stylesContainer?: StylesContainer;
  #section?: StylePropertiesSection;
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};

  #triggerKey: string|undefined;
  #initialProperties: Map<string, string>|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  getSection(): StylePropertiesSection|undefined {
    return this.#section;
  }

  async onPropertySelected(event: ElementsComponents.StylePropertyEditor.PropertySelectedEvent): Promise<void> {
    if (!this.#section) {
      return;
    }
    const {name, value} = event.data;
    const target = ensureTreeElementForProperty(this.#section, name);
    target.property.value = value;
    target.updateTitle();
    await target.applyStyleText(target.renderedPropertyText(), false);
    if (this.#section) {
      this.#stylesContainer?.refreshUpdate(this.#section, target, true);
    }
    this.requestUpdate();
  }

  async onPropertyDeselected(event: ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent): Promise<void> {
    if (!this.#section) {
      return;
    }
    const {name} = event.data;
    const target = ensureTreeElementForProperty(this.#section, name);
    await target.applyStyleText('', false);
    if (this.#section) {
      this.#stylesContainer?.refreshUpdate(this.#section, target, true);
    }
    this.requestUpdate();
  }

  bindContext(stylesContainer: StylesContainer, section: StylePropertiesSection): void {
    this.#stylesContainer = stylesContainer;
    this.#section = section;
    if (!this.#initialProperties) {
      this.#initialProperties =
          this.#editorClass ? getAuthoredStyles(section, this.#editorClass.editableProperties) : new Map();
    }
  }

  setTriggerKey(value: string): void {
    this.#triggerKey = value;
  }

  getTriggerKey(): string|undefined {
    return this.#triggerKey;
  }

  unbindContext(): void {
    this.#stylesContainer = undefined;
    this.#section = undefined;
  }

  #clearEditor(): void {
    this.#editorClass = undefined;
    this.#initialProperties = null;
    this.#viewOutput.waitForEditorUpdate = undefined;
    this.#view({
      authoredProperties: new Map(),
      computedProperties: new Map(),
      onPropertySelected: this.onPropertySelected.bind(this),
      onPropertyDeselected: this.onPropertyDeselected.bind(this),
    },
               this.#viewOutput, this.contentElement);
  }

  #trackChanges(): void {
    const initialProperties = this.#initialProperties;
    this.#initialProperties = null;
    if (!this.#editorClass || !this.#section || !this.#stylesContainer || !initialProperties) {
      return;
    }
    const finalProperties = getAuthoredStyles(this.#section, this.#editorClass.editableProperties);
    const node = this.#stylesContainer.node() ?? this.#section.matchedStyles.node();
    const ruleHeader = this.#section.headerText();
    for (const {propertyName} of this.#editorClass.editableProperties) {
      const oldValue = initialProperties.get(propertyName) ?? '';
      const newValue = finalProperties.get(propertyName) ?? '';
      Elements.StyleChanges.trackStylePropertyEdit(this.#stylesContainer.changeTracker, node, {
        ruleHeader,
        oldName: oldValue ? propertyName : '',
        oldValue,
        newName: newValue ? propertyName : '',
        newValue,
      });
    }
  }

  async render(): Promise<void> {
    if (!this.#editorClass) {
      return;
    }
    const computedProperties = this.#stylesContainer ? await fetchComputedStyles(this.#stylesContainer) : new Map();
    if (!this.#editorClass) {
      return;
    }
    const authoredProperties =
        this.#section ? getAuthoredStyles(this.#section, this.#editorClass.editableProperties) : new Map();
    this.#view({
      editorClass: this.#editorClass,
      authoredProperties,
      computedProperties,
      onPropertySelected: this.onPropertySelected.bind(this),
      onPropertyDeselected: this.onPropertyDeselected.bind(this),
    },
               this.#viewOutput, this.contentElement);
    await this.#viewOutput.waitForEditorUpdate?.();
    if (this.#stylesContainer?.swatchPopoverHelper().isShowing(this)) {
      this.#stylesContainer.swatchPopoverHelper().reposition();
    }
  }

  override async performUpdate(): Promise<void> {
    await this.render();
  }

  static instance(): StyleEditorWidget {
    if (!instance) {
      instance = new StyleEditorWidget();
    }
    return instance;
  }

  setEditor(editorClass: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor): void {
    this.#editorClass = editorClass;
  }

  static createTriggerButton(stylesContainer: StylesContainer, section: StylePropertiesSection,
                             editorClass: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor,
                             buttonTitle: string, triggerKey: string, jslogContext: string,
                             onClick?: () => void): LitTemplate {
    const popoverHelper = stylesContainer.swatchPopoverHelper();
    let triggerButton: Element|undefined;
    // clang-format off
    return html`<devtools-icon
      ${ref(e => {
        triggerButton = e;
        if (e && popoverHelper.isShowing(StyleEditorWidget.instance()) &&
            StyleEditorWidget.instance().getTriggerKey() === triggerKey) {
          popoverHelper.setAnchorElement(e);
        }
      })}
      name="flex-wrap"
      class="styles-pane-button"
      title=${buttonTitle}
      role="button"
      tabindex="-1"
      jslog=${VisualLogging.showStyleEditor(jslogContext).track({click: true})}
      @click=${async (event: Event) => {
        event.stopPropagation();
        onClick?.();
        if (!triggerButton) {
          return;
        }
        const widget = StyleEditorWidget.instance();
        if (popoverHelper.isShowing()) {
          const isSameTrigger = popoverHelper.isShowing(widget) && widget.getTriggerKey() === triggerKey;
          popoverHelper.hide(true);
          if (isSameTrigger) {
            return;
          }
        }
        widget.setEditor(editorClass);
        widget.bindContext(stylesContainer, section);
        widget.setTriggerKey(triggerKey);
        await widget.render();
        if (!triggerButton.isConnected) {
          widget.unbindContext();
          widget.#clearEditor();
          return;
        }
        const scrollerElement = triggerButton.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        const onScroll = (): void => {
          popoverHelper.hide(true);
        };
        const onStylesUpdateCompleted = widget.requestUpdate.bind(widget);
        stylesContainer.addStyleUpdateListener(onStylesUpdateCompleted);
        stylesContainer.setEditingStyle(true);
        popoverHelper.show(widget, triggerButton, () => {
          stylesContainer.setEditingStyle(false);
          widget.#trackChanges();
          widget.unbindContext();
          widget.#clearEditor();
          if (scrollerElement) {
            scrollerElement.removeEventListener('scroll', onScroll);
          }
          stylesContainer.removeStyleUpdateListener(onStylesUpdateCompleted);
        });
        if (scrollerElement) {
          scrollerElement.addEventListener('scroll', onScroll);
        }
      }}
      @mousedown=${(event: Event) => event.consume()}
      @mouseup=${(event: Event) => {
        // Stop propagation to prevent the property editor from being activated.
        event.stopPropagation();
      }}
    ></devtools-icon>`;
    // clang-format on
  }
}

function ensureTreeElementForProperty(section: StylePropertiesSection, propertyName: string): StylePropertyTreeElement {
  const target = section.propertiesTreeOutline.rootElement().children().find(
      child => child instanceof StylePropertyTreeElement && child.property.name === propertyName);
  if (target) {
    return target as StylePropertyTreeElement;
  }
  const newTarget = section.addNewBlankProperty();
  newTarget.property.name = propertyName;
  return newTarget;
}

async function fetchComputedStyles(stylesContainer: StylesContainer): Promise<Map<string, string>> {
  const computedStyleModel = stylesContainer.computedStyleModel();
  const style = await computedStyleModel.fetchComputedStyle();
  return style ? style.computedStyle : new Map();
}

function getAuthoredStyles(
    section: StylePropertiesSection, editableProperties: Array<{propertyName: string}>): Map<string, string> {
  const authoredProperties = new Map();
  const editablePropertiesSet = new Set(editableProperties.map(prop => prop.propertyName));
  for (const prop of section.style().leadingProperties()) {
    if (editablePropertiesSet.has(prop.name)) {
      authoredProperties.set(prop.name, prop.value);
    }
  }
  return authoredProperties;
}
