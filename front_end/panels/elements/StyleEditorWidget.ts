// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as ElementsComponents from './components/components.js';

import {type StylePropertiesSection} from './StylePropertiesSection.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import {type StylesSidebarPane} from './StylesSidebarPane.js';

type PropertySelectedEvent = ElementsComponents.StylePropertyEditor.PropertySelectedEvent;
type PropertyDeselectedEvent = ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent;

let instance: StyleEditorWidget|null = null;
interface Editor extends HTMLElement {
  data: {
    authoredProperties: Map<String, String>,
    computedProperties: Map<String, String>,
  };
  getEditableProperties(): Array<{propertyName: string}>;
}

/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export class StyleEditorWidget extends UI.Widget.VBox {
  private editor?: Editor;
  private pane?: StylesSidebarPane;
  private section?: StylePropertiesSection;
  private editorContainer: HTMLElement;

  #triggerKey: string|undefined;

  constructor() {
    super(true);
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
    await this.render();
  }

  async onPropertyDeselected(event: PropertyDeselectedEvent): Promise<void> {
    if (!this.section) {
      return;
    }
    const target = ensureTreeElementForProperty(this.section, event.data.name);
    await target.applyStyleText('', false);
    await this.render();
  }

  bindContext(pane: StylesSidebarPane, section: StylePropertiesSection): void {
    this.pane = pane;
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
    this.pane = undefined;
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
      computedProperties: this.pane ? await fetchComputedStyles(this.pane) : new Map(),
    };
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
      pane: StylesSidebarPane, section: StylePropertiesSection, editorClass: {new(): Editor}, buttonTitle: string,
      triggerKey: string): HTMLElement {
    const triggerButton = createButton(buttonTitle);

    triggerButton.onclick = async(event): Promise<void> => {
      event.stopPropagation();
      const popoverHelper = pane.swatchPopoverHelper();
      const widget = StyleEditorWidget.instance();
      widget.setEditor(editorClass);
      widget.bindContext(pane, section);
      widget.setTriggerKey(triggerKey);
      await widget.render();
      const scrollerElement = triggerButton.enclosingNodeOrSelfWithClass('style-panes-wrapper');
      const onScroll = (): void => {
        popoverHelper.hide(true);
      };
      popoverHelper.show(widget, triggerButton, () => {
        widget.unbindContext();
        if (scrollerElement) {
          scrollerElement.removeEventListener('scroll', onScroll);
        }
      });
      if (scrollerElement) {
        scrollerElement.addEventListener('scroll', onScroll);
      }
    };

    return triggerButton;
  }
}

function createButton(buttonTitle: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.classList.add('styles-pane-button');
  button.tabIndex = 0;
  button.title = buttonTitle;
  button.onmouseup = (event): void => {
    // Stop propagation to prevent the property editor from being activated.
    event.stopPropagation();
  };
  const icon = new IconButton.Icon.Icon();
  icon.data = {iconName: 'flex-wrap-icon', color: 'var(--color-text-secondary)', width: '12px', height: '12px'};
  button.appendChild(icon);
  return button;
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

async function fetchComputedStyles(pane: StylesSidebarPane): Promise<Map<string, string>> {
  const computedStyleModel = pane.computedStyleModel();
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
