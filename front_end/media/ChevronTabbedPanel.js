// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

/**
 * @typedef {{
 *     title: !Node,
 *     element: !UI.Widget.Widget,
 * }}
 */
export let ChevronTab;

/**
 * @unrestricted
 */
export class ChevronTabbedPanel extends UI.Widget.VBox {
  /**
   * @param {!Object.<!ChevronTab>} tab_definitions
   */
  constructor(tab_definitions) {
    super();
    this.registerRequiredCSS('media/chevronTabbedPanel.css');

    // map button elements to content elements for display.
    this._chevronButtons = new Map();

    // Partition into a header and content.
    this._header_panel = this.contentElement.createChild('div', 'chevron-tabbed-panel-title');
    this._content_panel = this.contentElement.createChild('div', 'chevron-tabbed-panel-content');
    this._header_panel_button_container = this._header_panel.createChild('div', 'chevron-tabbed-panel-title-buttons');

    for (const accessor_id in tab_definitions) {
      this.CreateAndAddDropdownButton(accessor_id, tab_definitions[accessor_id]);
    }
  }

  /**
   * @param {string} identifier
   * @param {!ChevronTab} tab
   */
  CreateAndAddDropdownButton(identifier, tab) {
    const button = this._header_panel_button_container.createChild('div', 'chevron-tabbed-panel-buttons-item');
    button.appendChild(tab.title);

    this._chevronButtons.set(identifier, {content: tab.element, button: button});

    // By default have the first element selected.
    if (this._chevronButtons.size === 1) {
      this._DisplayContentSection(tab.element);
      button.classList.add('selected');
    }

    button.addEventListener('click', event => {
      if (event.currentTarget.classList.contains('selected')) {
        return;
      }

      for (const elements of this._chevronButtons.values()) {
        elements.button.classList.remove('selected');
      }


      event.currentTarget.classList.add('selected');
      this._DisplayContentSection(tab.element);
    }, false);
  }

  RemoveTab(identifier, remove_all = false) {
    const button = this._chevronButtons.get(identifier);
    this._chevronButtons.delete(identifier);
    // If we're removing all the buttons, then nothing gets reselected.
    if (!remove_all && button.classList.contains('selected')) {
      // Make sure there are actually buttons to select now
      if (this._chevronButtons.size !== 0) {
        const new_selected = this._chevronButtons.values().next().value;
        new_selected.classList.add('selected');
      }
    }
    this._header_panel_button_container.removeChild(button.button);
  }

  RemoveTabs(identifiers) {
    for (const identifier of identifiers) {
      this.RemoveTab(identifier, true);
    }
  }

  /**
   * @param {!UI.Widget.Widget} content_element
   */
  _DisplayContentSection(content_element) {
    this._content_panel.innerHTML = '';
    content_element.show(this._content_panel);
  }

  /**
   * @return {!Iterator<string>}
   */
  GetListOfButtons() {
    return this._chevronButtons.keys();
  }

  /**
   * @param {string} name
   * @return {?UI.Widget.Widget}
   */
  GetContentPanelByName(name) {
    if (!this._chevronButtons.has(name)) {
      return null;
    }
    return this._chevronButtons.get(name).content;
  }

  /**
   * @param {string} name
   * @return {?UI.Widget.Widget}
   */
  GetButtonByName(name) {
    return this._chevronButtons.get(name).button;
  }
}
