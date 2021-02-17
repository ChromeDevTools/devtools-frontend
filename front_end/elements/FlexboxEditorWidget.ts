// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import {EditableProperties, FlexboxEditor, PropertyDeselectedEvent, PropertySelectedEvent} from './FlexboxEditor.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import {StylePropertiesSection, StylesSidebarPane} from './StylesSidebarPane.js';

const UIStrings = {
  /**
    * @description Title of the button that opens the flexbox editor in the Styles panel.
    */
  editorButton: 'Open Flexbox editor',
};
const str_ = i18n.i18n.registerUIStrings('elements/FlexboxEditorWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let instance: FlexboxEditorWidget|null = null;

/**
 * Thin UI.Widget wrapper around FlexboxEditor to allow using it as a popover.
 */
export class FlexboxEditorWidget extends UI.Widget.VBox {
  private editor: FlexboxEditor;
  private pane?: StylesSidebarPane;
  private section?: StylePropertiesSection;

  constructor() {
    super(true);
    this.contentElement.tabIndex = 0;
    this.setDefaultFocusedElement(this.contentElement);
    this.editor = new FlexboxEditor();
    this.editor.data = {
      authoredProperties: new Map(),
      computedProperties: new Map(),
    };
    this.contentElement.appendChild(this.editor);
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
    this.editor.addEventListener('property-selected', this.onPropertySelected);
    this.editor.addEventListener('property-deselected', this.onPropertyDeselected);
  }

  unbindContext(): void {
    this.pane = undefined;
    this.section = undefined;
    this.editor.removeEventListener('property-selected', this.onPropertySelected);
    this.editor.removeEventListener('property-deselected', this.onPropertyDeselected);
  }

  async render(): Promise<void> {
    this.editor.data = {
      authoredProperties: this.section ? getAuthoredStyles(this.section) : new Map(),
      computedProperties: this.pane ? await fetchComputedStyles(this.pane) : new Map(),
    };
  }

  static instance(): FlexboxEditorWidget {
    if (!instance) {
      instance = new FlexboxEditorWidget();
    }
    return instance;
  }

  static createFlexboxEditorButton(pane: StylesSidebarPane, section: StylePropertiesSection): HTMLElement {
    const flexboxEditorButton = createButton();

    // TODO: Remove next line once crbug.com/1177242 is solved.
    // eslint-disable-next-line @typescript-eslint/space-before-function-paren
    flexboxEditorButton.onclick = async(event): Promise<void> => {
      event.stopPropagation();
      const popoverHelper = pane.swatchPopoverHelper();
      const widget = FlexboxEditorWidget.instance();
      widget.bindContext(pane, section);
      await widget.render();
      const scrollerElement = flexboxEditorButton.enclosingNodeOrSelfWithClass('style-panes-wrapper');
      const onScroll = (): void => {
        popoverHelper.hide(true);
      };
      popoverHelper.show(widget, flexboxEditorButton, () => {
        widget.unbindContext();
        if (scrollerElement) {
          scrollerElement.removeEventListener('scroll', onScroll);
        }
      });
      if (scrollerElement) {
        scrollerElement.addEventListener('scroll', onScroll);
      }
    };

    return flexboxEditorButton;
  }
}

function createButton(): HTMLButtonElement {
  const flexboxEditorButton = document.createElement('button');
  flexboxEditorButton.classList.add('styles-pane-button');
  flexboxEditorButton.tabIndex = 0;
  flexboxEditorButton.title = i18nString(UIStrings.editorButton);
  flexboxEditorButton.onmouseup = (event): void => {
    // Stop propagation to prevent the property editor from being activated.
    event.stopPropagation();
  };
  const flexboxIcon = new Components.Icon.Icon();
  flexboxIcon.data = {iconName: 'flex-wrap-icon', color: 'var(--color-text-secondary)', width: '12px', height: '12px'};
  flexboxEditorButton.appendChild(flexboxIcon);
  return flexboxEditorButton;
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

function getAuthoredStyles(section: StylePropertiesSection): Map<string, string> {
  const authoredProperties = new Map();
  const flexboxProperties = new Set(EditableProperties.map(prop => prop.propertyName as string));
  for (const prop of section._style.leadingProperties()) {
    if (flexboxProperties.has(prop.name)) {
      authoredProperties.set(prop.name, prop.value);
    }
  }
  return authoredProperties;
}
