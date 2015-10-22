// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ListWidget.Delegate} delegate
 */
WebInspector.ListWidget = function(delegate)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("ui/listWidget.css");
    this._delegate = delegate;

    this._list = this.contentElement.createChild("div", "list");

    /** @type {?WebInspector.ListWidget.Editor} */
    this._editor = null;
    /** @type {*|null} */
    this._editItem = null;
    /** @type {?Element} */
    this._editElement = null;

    this.clear();
}

/**
 * @interface
 */
WebInspector.ListWidget.Delegate = function()
{
}

WebInspector.ListWidget.Delegate.prototype = {
    /**
     * @param {*} item
     * @return {!Element}
     */
    renderItem: function(item) { },

    /**
     * @param {number} index
     */
    removeItemRequested: function(index) { },

    /**
     * @param {*|null} item
     * @return {!WebInspector.ListWidget.Editor}
     */
    beginEdit: function(item) { },

    /**
     * @param {*|null} item
     * @param {!WebInspector.ListWidget.Editor} editor
     */
    commitEdit: function(item, editor) { }
}

WebInspector.ListWidget.prototype = {
    clear: function()
    {
        this._items = [];
        this._editable = [];
        this._elements = [];
        this._lastSeparator = false;
        this._list.removeChildren();
        this._stopEditing();
    },

    /**
     * @param {*} item
     * @param {boolean} editable
     */
    appendItem: function(item, editable)
    {
        if (this._lastSeparator && this._items.length)
            this._list.appendChild(createElementWithClass("div", "list-separator"));
        this._lastSeparator = false;

        this._items.push(item);
        this._editable.push(editable);

        var element = this._list.createChild("div", "list-item");
        element.appendChild(this._delegate.renderItem(item));
        if (editable) {
            element.classList.add("editable");
            element.appendChild(this._createControls(item, element, this._items.length - 1));
        }
        this._elements.push(element);
    },

    appendSeparator: function()
    {
        this._lastSeparator = true;
    },

    /**
     * @param {number} index
     */
    removeItem: function(index)
    {
        if (this._editItem === this._items[index])
            this._stopEditing();

        var element = this._elements[index];

        var previous = element.previousElementSibling;
        var previousIsSeparator = previous && previous.classList.contains("list-separator");

        var next = element.nextElementSibling;
        var nextIsSeparator = next && next.classList.contains("list-separator");

        if (previousIsSeparator && (nextIsSeparator || !next))
            previous.remove();
        if (nextIsSeparator && !previous)
            next.remove();
        element.remove();

        this._elements.splice(index, 1);
        this._items.splice(index, 1);
        this._editable.splice(index, 1);
    },

    /**
     * @param {number} index
     */
    addNewItem: function(index)
    {
        this._startEditing(null, null, this._elements[index] || null);
    },

    /**
     * @param {*} item
     * @param {!Element} element
     * @param {number} index
     * @return {!Element}
     */
    _createControls: function(item, element, index)
    {
        var controls = createElementWithClass("div", "controls-container fill");
        var gradient = controls.createChild("div", "controls-gradient");
        var buttons = controls.createChild("div", "controls-buttons");

        var editButton = buttons.createChild("div", "edit-button");
        editButton.title = WebInspector.UIString("Edit");
        editButton.addEventListener("click", onEditClicked.bind(this), false);

        var removeButton = buttons.createChild("div", "remove-button");
        removeButton.title = WebInspector.UIString("Remove");
        removeButton.addEventListener("click", onRemoveClicked.bind(this), false);

        return controls;

        /**
         * @param {!Event} event
         * @this {WebInspector.ListWidget}
         */
        function onEditClicked(event)
        {
            event.consume();
            var insertionPoint = element && element.nextElementSibling ? element.nextElementSibling : null;
            this._startEditing(item, element, insertionPoint);
        }

        /**
         * @param {!Event} event
         * @this {WebInspector.ListWidget}
         */
        function onRemoveClicked(event)
        {
            event.consume();
            this._delegate.removeItemRequested(index);
        }
    },

    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        this._stopEditing();
    },

    /**
     * @param {*} item
     * @param {?Element} element
     * @param {?Element} insertionPoint
     */
    _startEditing: function(item, element, insertionPoint)
    {
        if (element && this._editElement === element)
            return;

        this._stopEditing();

        this._list.classList.add("list-editing");
        this._editItem = item;
        this._editElement = element;
        if (element)
            element.classList.add("hidden");

        this._editor = this._delegate.beginEdit(item);
        this._list.insertBefore(this._editor.element, insertionPoint);
        this._editor.beginEdit(element ? WebInspector.UIString("Save") : WebInspector.UIString("Add"), this._commitEditing.bind(this), this._stopEditing.bind(this));
    },

    _commitEditing: function()
    {
        var editItem = this._editItem;
        var editor = /** @type {!WebInspector.ListWidget.Editor} */ (this._editor);
        this._stopEditing();
        this._delegate.commitEdit(editItem, editor);
    },

    _stopEditing: function()
    {
        this._list.classList.remove("list-editing");
        if (this._editElement)
            this._editElement.classList.remove("hidden");
        if (this._editor && this._editor.element.parentElement)
            this._editor.element.remove();

        this._editor = null;
        this._editItem = null;
        this._editElement = null;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 */
WebInspector.ListWidget.Editor = function()
{
    this.element = createElementWithClass("div", "editor-container");
    this.element.addEventListener("keydown", onKeyDown.bind(null, isEscKey, this._cancelClicked.bind(this)), false);
    this.element.addEventListener("keydown", onKeyDown.bind(null, isEnterKey, this._commitClicked.bind(this)), false);

    this._contentElement = this.element.createChild("div", "editor-content");

    var buttonsRow = this.element.createChild("div", "editor-buttons");
    this._commitButton = createTextButton("", this._commitClicked.bind(this));
    buttonsRow.appendChild(this._commitButton);
    this._cancelButton = createTextButton(WebInspector.UIString("Cancel"), this._cancelClicked.bind(this));
    this._cancelButton.addEventListener("keydown", onKeyDown.bind(null, isEnterKey, this._cancelClicked.bind(this)), false);
    buttonsRow.appendChild(this._cancelButton);

    /**
     * @param {function(!Event):boolean} predicate
     * @param {function()} callback
     * @param {!Event} event
     */
    function onKeyDown(predicate, callback, event)
    {
        if (predicate(event)) {
            event.consume(true);
            callback();
        }
    }

    /** @type {!Array<!HTMLInputElement>} */
    this._inputs = [];
    /** @type {!Map<string, !HTMLInputElement>} */
    this._inputByName = new Map();
    /** @type {!Array<function(!HTMLInputElement):boolean>} */
    this._validators = [];

    /** @type {?function()} */
    this._commit = null;
    /** @type {?function()} */
    this._cancel = null;
}

WebInspector.ListWidget.Editor.prototype = {
    /**
     * @return {!Element}
     */
    contentElement: function()
    {
        return this._contentElement;
    },

    /**
     * @param {string} name
     * @param {string} type
     * @param {string} title
     * @param {function(!HTMLInputElement):boolean} validator
     * @return {!HTMLInputElement}
     */
    createInput: function(name, type, title, validator)
    {
        var input = /** @type {!HTMLInputElement} */ (createElement("input"));
        input.type = type;
        input.placeholder = title;
        input.addEventListener("input", this._validateInputs.bind(this, false), false);
        input.addEventListener("blur", this._validateInputs.bind(this, false), false);
        this._inputByName.set(name, input);
        this._inputs.push(input);
        this._validators.push(validator);
        return input;
    },

    /**
     * @param {string} name
     * @return {!HTMLInputElement}
     */
    input: function(name)
    {
        return /** @type {!HTMLInputElement} */ (this._inputByName.get(name));
    },

    /**
     * @param {boolean} forceValid
     */
    _validateInputs: function(forceValid)
    {
        var allValid = true;
        for (var index = 0; index < this._inputs.length; ++index) {
            var input = this._inputs[index];
            var valid = this._validators[index].call(null, input);
            input.classList.toggle("error-input", !valid && !forceValid);
            allValid &= valid;
        }
        this._commitButton.disabled = !allValid;
    },

    /**
     * @param {string} commitButtonTitle
     * @param {function()} commit
     * @param {function()} cancel
     */
    beginEdit: function(commitButtonTitle, commit, cancel)
    {
        this._commit = commit;
        this._cancel = cancel;

        this._commitButton.textContent = commitButtonTitle;
        this._commitButton.scrollIntoView();
        if (this._inputs.length)
            this._inputs[0].focus();
        this._validateInputs(true);
    },

    _commitClicked: function()
    {
        if (this._commitButton.disabled)
            return;

        var commit = this._commit;
        this._commit = null;
        this._cancel = null;
        commit();
    },

    _cancelClicked: function()
    {
        var cancel = this._cancel;
        this._commit = null;
        this._cancel = null;
        cancel();
    }
}
