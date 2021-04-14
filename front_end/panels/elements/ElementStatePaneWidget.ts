// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ElementsPanel} from './ElementsPanel.js';

const UIStrings = {
  /**
  * @description Title of a section in the Element State Pane Widget of the Elements panel. The
  * controls in this section allow users to force a particular state on the selected element, e.g. a
  * focused state via :focus or a hover state via :hover.
  */
  forceElementState: 'Force element state',
  /**
  * @description Tooltip text in Element State Pane Widget of the Elements panel. For a button that
  * opens a tool that toggles the various states of the selected element on/off.
  */
  toggleElementState: 'Toggle Element State',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementStatePaneWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ElementStatePaneWidget extends UI.Widget.Widget {
  _inputs: HTMLInputElement[];
  _inputStates: WeakMap<HTMLInputElement, string>;
  _cssModel?: SDK.CSSModel.CSSModel|null;
  constructor() {
    super(true);
    this.registerRequiredCSS('panels/elements/elementStatePaneWidget.css', {enableLegacyPatching: false});
    this.contentElement.className = 'styles-element-state-pane';
    UI.UIUtils.createTextChild(this.contentElement.createChild('div'), i18nString(UIStrings.forceElementState));
    const table = document.createElement('table');
    table.classList.add('source-code');
    UI.ARIAUtils.markAsPresentation(table);

    const inputs: HTMLInputElement[] = [];
    this._inputs = inputs;

    this._inputStates = new WeakMap();

    const clickListener = (event: MouseEvent): void => {
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

    const createCheckbox = (state: string): Element => {
      const td = document.createElement('td');
      const label = UI.UIUtils.CheckboxLabel.create(':' + state);
      const input = label.checkboxElement;
      this._inputStates.set(input, state);
      input.addEventListener('click', (clickListener as EventListener), false);
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

    tr = table.createChild('tr');
    tr.appendChild(createCheckbox('target'));

    this.contentElement.appendChild(table);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this._update, this);
  }

  _updateModel(cssModel: SDK.CSSModel.CSSModel|null): void {
    if (this._cssModel === cssModel) {
      return;
    }
    if (this._cssModel) {
      this._cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
    this._cssModel = cssModel;
    if (this._cssModel) {
      this._cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
  }

  wasShown(): void {
    this._update();
  }

  _update(): void {
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
        input.disabled = Boolean(node.pseudoType());
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

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  _button: UI.Toolbar.ToolbarToggle;
  _view: ElementStatePaneWidget;
  private constructor() {
    this._button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleElementState), '');
    this._button.setText(i18n.i18n.lockedString(':hov'));
    this._button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clicked, this);
    this._button.element.classList.add('monospace');
    this._view = new ElementStatePaneWidget();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ButtonProvider {
    const {forceNew} = opts;
    if (!buttonProviderInstance || forceNew) {
      buttonProviderInstance = new ButtonProvider();
    }

    return buttonProviderInstance;
  }

  _clicked(): void {
    ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
  }

  item(): UI.Toolbar.ToolbarItem {
    return this._button;
  }
}
