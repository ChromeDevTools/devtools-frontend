// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Elements.ElementStatePaneWidget = class extends UI.Widget {
  constructor() {
    super();
    this.element.className = 'styles-element-state-pane';
    this.element.createChild('div').createTextChild(Common.UIString('Force element state'));
    var table = createElementWithClass('table', 'source-code');

    var inputs = [];
    this._inputs = inputs;

    /**
     * @param {!Event} event
     */
    function clickListener(event) {
      var node = UI.context.flavor(SDK.DOMNode);
      if (!node)
        return;
      SDK.CSSModel.fromNode(node).forcePseudoState(node, event.target.state, event.target.checked);
    }

    /**
     * @param {string} state
     * @return {!Element}
     */
    function createCheckbox(state) {
      var td = createElement('td');
      var label = UI.createCheckboxLabel(':' + state);
      var input = label.checkboxElement;
      input.state = state;
      input.addEventListener('click', clickListener, false);
      inputs.push(input);
      td.appendChild(label);
      return td;
    }

    var tr = table.createChild('tr');
    tr.appendChild(createCheckbox.call(null, 'active'));
    tr.appendChild(createCheckbox.call(null, 'hover'));

    tr = table.createChild('tr');
    tr.appendChild(createCheckbox.call(null, 'focus'));
    tr.appendChild(createCheckbox.call(null, 'visited'));

    this.element.appendChild(table);
    UI.context.addFlavorChangeListener(SDK.DOMNode, this._update, this);
  }

  /**
   * @param {?SDK.Target} target
   */
  _updateTarget(target) {
    if (this._target === target)
      return;

    if (this._target) {
      var cssModel = SDK.CSSModel.fromTarget(this._target);
      cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
    this._target = target;
    if (target) {
      var cssModel = SDK.CSSModel.fromTarget(target);
      cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this._update, this);
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._update();
  }

  _update() {
    if (!this.isShowing())
      return;

    var node = UI.context.flavor(SDK.DOMNode);
    if (node)
      node = node.enclosingElementOrSelf();

    this._updateTarget(node ? node.target() : null);
    if (node) {
      var nodePseudoState = SDK.CSSModel.fromNode(node).pseudoState(node);
      for (var input of this._inputs) {
        input.disabled = !!node.pseudoType();
        input.checked = nodePseudoState.indexOf(input.state) >= 0;
      }
    } else {
      for (var input of this._inputs) {
        input.disabled = true;
        input.checked = false;
      }
    }
  }
};

/**
 * @implements {UI.ToolbarItem.Provider}
 * @unrestricted
 */
Elements.ElementStatePaneWidget.ButtonProvider = class {
  constructor() {
    this._button = new UI.ToolbarToggle(Common.UIString('Toggle Element State'), '');
    this._button.setText(Common.UIString(':hov'));
    this._button.addEventListener(UI.ToolbarButton.Events.Click, this._clicked, this);
    this._button.element.classList.add('monospace');
    this._view = new Elements.ElementStatePaneWidget();
  }

  _clicked() {
    Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
  }

  /**
   * @override
   * @return {!UI.ToolbarItem}
   */
  item() {
    return this._button;
  }
};
