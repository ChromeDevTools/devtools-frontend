// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';

import * as Elements from '../../models/elements/elements.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as ElementsComponents from './components/components.js';
import type {StylePropertiesSection} from './StylePropertiesSection.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import type {StylesContainer} from './StylesContainer.js';

const {ref} = Directives;
type PropertySelectedEvent = ElementsComponents.StylePropertyEditor.PropertySelectedEvent;
type PropertyDeselectedEvent = ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent;

let instance: StyleEditorWidget|null = null;
export interface Editor extends HTMLElement {
  data: {
    authoredProperties: Map<String, String>,
    computedProperties: Map<String, String>,
  };
  getEditableProperties(): Array<{propertyName: string}>;
  jslogContext: string;
}

export interface ViewInput {
  editor: Editor;
  authoredProperties: Map<string, string>;
  computedProperties: Map<string, string>;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  input.editor.data = {
    authoredProperties: input.authoredProperties,
    computedProperties: input.computedProperties,
  };
  // clang-format off
  render(
      html`<div tabindex="0" autofocus>${input.editor}</div>`,
      target, {container: {classes: ['with-padding']}});
  // clang-format on
};

/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export class StyleEditorWidget extends UI.Widget.VBox {
  private editor?: Editor;
  private stylesContainer?: StylesContainer;
  private section?: StylePropertiesSection;
  readonly #view: View;

  #triggerKey: string|undefined;
  #initialProperties: Map<string, string>|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.onPropertySelected = this.onPropertySelected.bind(this);
    this.onPropertyDeselected = this.onPropertyDeselected.bind(this);
  }

  getSection(): StylePropertiesSection|undefined {
    return this.section;
  }

  async onPropertySelected(event: PropertySelectedEvent): Promise<void> {
    if (!this.section) {
      return;
    }
    const target = ensureTreeElementForProperty(this.section, event.data.name);
    target.property.value = event.data.value;
    target.updateTitle();
    await target.applyStyleText(target.renderedPropertyText(), false);
    this.requestUpdate();
  }

  async onPropertyDeselected(event: PropertyDeselectedEvent): Promise<void> {
    if (!this.section) {
      return;
    }
    const target = ensureTreeElementForProperty(this.section, event.data.name);
    await target.applyStyleText('', false);
    this.requestUpdate();
  }

  bindContext(stylesContainer: StylesContainer, section: StylePropertiesSection): void {
    this.stylesContainer = stylesContainer;
    this.section = section;
    if (!this.#initialProperties) {
      this.#initialProperties =
          this.editor ? getAuthoredStyles(section, this.editor.getEditableProperties()) : new Map();
    }
    this.editor?.addEventListener('propertyselected', this.onPropertySelected);
    this.editor?.addEventListener('propertydeselected', this.onPropertyDeselected);
  }

  setTriggerKey(value: string): void {
    this.#triggerKey = value;
  }

  getTriggerKey(): string|undefined {
    return this.#triggerKey;
  }

  unbindContext(): void {
    this.stylesContainer = undefined;
    this.section = undefined;
    this.editor?.removeEventListener('propertyselected', this.onPropertySelected);
    this.editor?.removeEventListener('propertydeselected', this.onPropertyDeselected);
  }

  #trackChanges(): void {
    const initialProperties = this.#initialProperties;
    this.#initialProperties = null;
    if (!this.editor || !this.section || !this.stylesContainer || !initialProperties) {
      return;
    }
    const finalProperties = getAuthoredStyles(this.section, this.editor.getEditableProperties());
    const node = this.stylesContainer.node() ?? this.section.matchedStyles.node();
    const ruleHeader = this.section.headerText();
    for (const {propertyName} of this.editor.getEditableProperties()) {
      const oldValue = initialProperties.get(propertyName) ?? '';
      const newValue = finalProperties.get(propertyName) ?? '';
      Elements.StyleChanges.trackStylePropertyEdit(this.stylesContainer.changeTracker, node, {
        ruleHeader,
        oldName: oldValue ? propertyName : '',
        oldValue,
        newName: newValue ? propertyName : '',
        newValue,
      });
    }
  }
  async render(): Promise<void> {
    if (!this.editor) {
      return;
    }
    this.#view({
      editor: this.editor,
      authoredProperties: this.section ? getAuthoredStyles(this.section, this.editor.getEditableProperties()) :
                                         new Map(),
      computedProperties: this.stylesContainer ? await fetchComputedStyles(this.stylesContainer) : new Map(),
    },
               undefined, this.contentElement);
  }

  override async performUpdate(): Promise<void> {
    await super.performUpdate();
    await this.render();
  }

  static instance(): StyleEditorWidget {
    if (!instance) {
      instance = new StyleEditorWidget();
    }
    return instance;
  }

  setEditor(editorClass: {new(): Editor}): void {
    if (!(this.editor instanceof editorClass)) {
      this.editor = new editorClass();
    }
  }

  static createTriggerButton(stylesContainer: StylesContainer, section: StylePropertiesSection,
                             editorClass: {new(): Editor}, buttonTitle: string, triggerKey: string,
                             jslogContext: string, onClick?: () => void): LitTemplate {
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
        widget.setEditor(editorClass);
        widget.bindContext(stylesContainer, section);
        widget.setTriggerKey(triggerKey);
        await widget.render();
        widget.focus();
        const scrollerElement = triggerButton.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        const onScroll = (): void => {
          popoverHelper.hide(true);
        };
        const onStylesUpdateCompleted = widget.requestUpdate.bind(widget);
        stylesContainer.addStyleUpdateListener(onStylesUpdateCompleted);
        popoverHelper.show(widget, triggerButton, () => {
          widget.#trackChanges();
          widget.unbindContext();
          if (scrollerElement) {
            scrollerElement.removeEventListener('scroll', onScroll);
          }
          stylesContainer.removeStyleUpdateListener(onStylesUpdateCompleted);
        });
        if (scrollerElement) {
          scrollerElement.addEventListener('scroll', onScroll);
        }
      }}
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
