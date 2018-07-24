// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Console.ConsolePinPane = class extends UI.ThrottledWidget {
  constructor() {
    super(true, 250);
    this.registerRequiredCSS('console/consolePinPane.css');
    this.registerRequiredCSS('object_ui/objectValue.css');
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);

    /** @type {!Set<!Console.ConsolePin>} */
    this._pins = new Set();
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    const contextMenu = new UI.ContextMenu(event);
    const target = event.deepElementFromPoint();
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
      if (targetPinElement) {
        const targetPin = targetPinElement[Console.ConsolePin._PinSymbol];
        contextMenu.editSection().appendItem(ls`Edit pin`, targetPin.focus.bind(targetPin));
        contextMenu.editSection().appendItem(ls`Remove pin`, this._removePin.bind(this, targetPin));
        targetPin.appendToContextMenu(contextMenu);
      }
    }
    contextMenu.editSection().appendItem(ls`Remove all pins`, this._removeAllPins.bind(this));
    contextMenu.show();
  }

  _removeAllPins() {
    for (const pin of this._pins)
      this._removePin(pin);
  }

  /**
   * @param {!Console.ConsolePin} pin
   */
  _removePin(pin) {
    pin.element().remove();
    this._pins.delete(pin);
  }

  /**
   * @param {string} expression
   */
  addPin(expression) {
    const pin = new Console.ConsolePin(expression, this._removePin.bind(this));
    this.contentElement.appendChild(pin.element());
    this._pins.add(pin);
    pin.focus();
    this.update();
  }

  /**
   * @override
   */
  doUpdate() {
    if (!this._pins.size)
      return Promise.resolve();
    if (this.isShowing())
      this.update();
    const updatePromises = Array.from(this._pins, pin => pin.updatePreview());
    return Promise.all(updatePromises).then(this._updatedForTest.bind(this));
  }

  _updatedForTest() {
  }
};

Console.ConsolePin = class {
  /**
   * @param {string} expression
   * @param {function(!Console.ConsolePin)} onRemove
   */
  constructor(expression, onRemove) {
    const deletePinIcon = UI.Icon.create('smallicon-cross', 'console-delete-pin');
    deletePinIcon.addEventListener('click', () => onRemove(this));

    const fragment = UI.Fragment.build`
    <div class='console-pin'>
      ${deletePinIcon}
      <div class='console-pin-name' $='name'></div>
      <div class='console-pin-preview' $='preview'>${ls`not available`}</div>
    </div>`;
    this._pinElement = fragment.element();
    this._pinPreview = fragment.$('preview');
    const nameElement = fragment.$('name');
    nameElement.title = expression;
    this._pinElement[Console.ConsolePin._PinSymbol] = this;

    /** @type {?SDK.RemoteObject} */
    this._resultObject = null;
    /** @type {?UI.TextEditor} */
    this._editor = null;

    this._editorPromise = self.runtime.extension(UI.TextEditorFactory).instance().then(factory => {
      this._editor = factory.createEditor({
        lineNumbers: false,
        lineWrapping: true,
        mimeType: 'javascript',
        autoHeight: true,
        placeholder: ls`Expression`
      });
      this._editor.configureAutocomplete(ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
      this._editor.widget().show(nameElement);
      this._editor.widget().element.classList.add('console-pin-editor');
      this._editor.widget().element.tabIndex = -1;
      this._editor.setText(expression);
      this._editor.widget().element.addEventListener('keydown', event => {
        if (event.key === 'Tab')
          event.consume();
      }, true);
    });
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._pinElement;
  }

  async focus() {
    await this._editorPromise;
    this._editor.widget().focus();
    this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  appendToContextMenu(contextMenu) {
    if (this._resultObject)
      contextMenu.appendApplicableItems(this._resultObject);
  }

  /**
   * @return {!Promise}
   */
  async updatePreview() {
    if (!this._editor)
      return;
    const text = this._editor.textWithCurrentSuggestion().trim();
    const isEditing = this._pinElement.hasFocus();
    const timeout = isEditing ? 250 : undefined;
    const {preview, result} = await ObjectUI.JavaScriptREPL.evaluateAndBuildPreview(text, isEditing, timeout);
    this._resultObject = result ? (result.object || null) : null;
    const previewText = preview.deepTextContent();
    if (!previewText || previewText !== this._pinPreview.deepTextContent()) {
      this._pinPreview.removeChildren();
      if (result && SDK.RuntimeModel.isSideEffectFailure(result))
        this._pinPreview.appendChild(createTextNode(`(...)`));
      else
        this._pinPreview.appendChild(previewText ? preview : createTextNode(ls`not available`));
    }
  }
};

Console.ConsolePin._PinSymbol = Symbol('pinSymbol');
