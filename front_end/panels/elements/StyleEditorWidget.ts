// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import {createIcon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as ElementsComponents from './components/components.js';
import type {StylePropertiesSection} from './StylePropertiesSection.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import type {StylesContainer} from './StylesContainer.js';

type PropertySelectedEvent = ElementsComponents.StylePropertyEditor.PropertySelectedEvent;
type PropertyDeselectedEvent = ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent;

let instance: StyleEditorWidget|null = null;
interface Editor extends HTMLElement {
  data: {
    authoredProperties: Map<String, String>,
    computedProperties: Map<String, String>,
  };
  getEditableProperties(): Array<{propertyName: string}>;
  jslogContext: string;
}

/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export class StyleEditorWidget extends UI.Widget.VBox {
  private editor?: Editor;
  private stylesContainer?: StylesContainer;
  private section?: StylePropertiesSection;
  private editorContainer: HTMLElement;

  #triggerKey: string|undefined;

  constructor() {
    super({useShadowDom: true});
    this.contentElement.tabIndex = 0;
    this.setDefaultFocusedElement(this.contentElement);
    this.editorContainer = document.createElement('div');
    this.contentElement.appendChild(this.editorContainer);
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

  async render(): Promise<void> {
    if (!this.editor) {
      return;
    }
    this.editor.data = {
      authoredProperties: this.section ? getAuthoredStyles(this.section, this.editor.getEditableProperties()) :
                                         new Map(),
      computedProperties: this.stylesContainer ? await fetchComputedStyles(this.stylesContainer) : new Map(),
    };
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
      this.contentElement.removeChildren();
      this.editor = new editorClass();
      this.contentElement.appendChild(this.editor);
    }
  }

  static createTriggerButton(
      stylesContainer: StylesContainer, section: StylePropertiesSection, editorClass: {new(): Editor},
      buttonTitle: string, triggerKey: string): HTMLElement {
    const triggerButton = createIcon('flex-wrap', 'styles-pane-button');
    triggerButton.title = buttonTitle;
    triggerButton.role = 'button';

    triggerButton.onclick = async event => {
      event.stopPropagation();
      const popoverHelper = stylesContainer.swatchPopoverHelper();
      const widget = StyleEditorWidget.instance();
      widget.element.classList.toggle('with-padding', true);
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
        widget.unbindContext();
        if (scrollerElement) {
          scrollerElement.removeEventListener('scroll', onScroll);
        }
        stylesContainer.removeStyleUpdateListener(onStylesUpdateCompleted);
      });
      if (scrollerElement) {
        scrollerElement.addEventListener('scroll', onScroll);
      }
    };
    triggerButton.onmouseup = event => {
      // Stop propagation to prevent the property editor from being activated.
      event.stopPropagation();
    };

    return triggerButton;
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
