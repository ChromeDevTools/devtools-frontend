// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ElementsPanel} from './ElementsPanel.js';

/**
 * @unrestricted
 */
export class ElementStatePaneWidget extends UI.Widget.Widget {
  constructor() {
    super(true);
    this.registerRequiredCSS('elements/elementStatePaneWidget.css');
    this.contentElement.className = 'styles-element-state-pane';
    UI.UIUtils.createTextChild(this.contentElement.createChild('div'), Common.UIString.UIString('Force element state'));
    const table = document.createElement('table');
    table.classList.add('source-code');
    UI.ARIAUtils.markAsPresentation(table);

    /** @type {!Array<!HTMLInputElement>} */
    const inputs = [];
    this._inputs = inputs;

    /** @type {!WeakMap<!HTMLInputElement,string>} */
    this._inputStates = new WeakMap();

    /**
     * @param {!MouseEvent} event
     */
    const clickListener = event => {
      const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
      if (!node || !(event.target instanceof HTMLInputElement)) {
        return;
      }
      const state = this._inputStates.get(event.target);
      if (!state) {
        return;
      }
      node.domModel().cssModel().forcePseudoState(node, state, event.target.checked);
    };

    /**
     * @param {string} state
     * @return {!Element}
     */
    const createCheckbox = state => {
      const td = document.createElement('td');
      const label = UI.UIUtils.CheckboxLabel.create(':' + state);
      const input = label.checkboxElement;
      this._inputStates.set(input, state);
      input.addEventListener('click', /** @type {!EventListener} */ (clickListener), false);
      inputs.push(input);
      td.appendChild(label);
      return td;
    };

    let tr = table.createChild('tr');
    tr.appendChild(createCheckbox('active'));
    tr.appendChild(createCheckbox('hover'));

    tr = table.createChild('tr');
    tr.appendChild(createCheckbox('focus'));
    tr.appendChild(createCheckbox('visited'));

    tr = table.createChild('tr');
    tr.appendChild(createCheckbox('focus-within'));
    tr.appendChild(createCheckbox('focus-visible'));

    this.contentElement.appendChild(table);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this._update, this);
  }

  /**
   * @param {?SDK.CSSModel.CSSModel} cssModel
   */
  _updateModel(cssModel) {
    if (this._cssModel === cssModel) {
      return;
    }
    if (this._cssModel) {
      this._cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
    /** @type {?SDK.CSSModel.CSSModel} */
    this._cssModel = cssModel;
    if (this._cssModel) {
      this._cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._update();
  }

  _update() {
    if (!this.isShowing()) {
      return;
    }

    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }

    this._updateModel(node ? node.domModel().cssModel() : null);
    if (node) {
      const nodePseudoState = node.domModel().cssModel().pseudoState(node);
      for (const input of this._inputs) {
        input.disabled = !!node.pseudoType();
        const state = this._inputStates.get(input);
        input.checked = nodePseudoState && state !== undefined ? nodePseudoState.indexOf(state) >= 0 : false;
      }
    } else {
      for (const input of this._inputs) {
        input.disabled = true;
        input.checked = false;
      }
    }
  }
}

/**
 * @implements {UI.Toolbar.Provider}
 * @unrestricted
 */
export class ButtonProvider {
  constructor() {
    this._button = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Toggle Element State'), '');
    this._button.setText(Common.UIString.UIString(':hov'));
    this._button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clicked, this);
    this._button.element.classList.add('monospace');
    this._view = new ElementStatePaneWidget();
  }

  _clicked() {
    ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
  }

  /**
   * @override
   * @return {!UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._button;
  }
}
