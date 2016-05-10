/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {string} className
 * @param {!Element=} parentElement
 */
WebInspector.Toolbar = function(className, parentElement)
{
    /** @type {!Array.<!WebInspector.ToolbarItem>} */
    this._items = [];
    this._reverse = false;
    this.element = parentElement ? parentElement.createChild("div") : createElement("div");
    this.element.className = className;
    this.element.classList.add("toolbar");
    this._shadowRoot = WebInspector.createShadowRootWithCoreStyles(this.element, "ui/toolbar.css");
    this._contentElement = this._shadowRoot.createChild("div", "toolbar-shadow");
    this._insertionPoint = this._contentElement.createChild("content");
}

WebInspector.Toolbar.prototype = {
    /**
     * @param {boolean=} reverse
     */
    makeWrappable: function(reverse)
    {
        this._contentElement.classList.add("wrappable");
        this._reverse = !!reverse;
        if (reverse)
            this._contentElement.classList.add("wrappable-reverse");
    },

    makeVertical: function()
    {
        this._contentElement.classList.add("vertical");
    },

    makeBlueOnHover: function()
    {
        this._contentElement.classList.add("toolbar-blue-on-hover");
    },

    makeToggledGray: function()
    {
        this._contentElement.classList.add("toolbar-toggled-gray");
    },

    renderAsLinks: function()
    {
        this._contentElement.classList.add("toolbar-render-as-links");
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        for (var item of this._items)
            item.setEnabled(enabled);
    },

    /**
     * @param {!WebInspector.ToolbarItem} item
     */
    appendToolbarItem: function(item)
    {
        this._items.push(item);
        item._toolbar = this;
        if (this._reverse)
            this._contentElement.insertBefore(item.element, this._insertionPoint.nextSibling);
        else
            this._contentElement.insertBefore(item.element, this._insertionPoint);
        this._hideSeparatorDupes();
    },

    appendSeparator: function()
    {
        this.appendToolbarItem(new WebInspector.ToolbarSeparator());
    },

    appendSpacer: function()
    {
        this.appendToolbarItem(new WebInspector.ToolbarSeparator(true));
    },

    /**
     * @param {string} text
     */
    appendText: function(text)
    {
        this.appendToolbarItem(new WebInspector.ToolbarText(text));
    },

    removeToolbarItems: function()
    {
        for (var item of this._items)
            delete item._toolbar;
        this._items = [];
        this._contentElement.removeChildren();
        this._insertionPoint = this._contentElement.createChild("content");
    },

    /**
     * @param {string} color
     */
    setColor: function(color)
    {
        var style = createElement("style");
        style.textContent = ".toolbar-glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    },

    /**
     * @param {string} color
     */
    setToggledColor: function(color)
    {
        var style = createElement("style");
        style.textContent = ".toolbar-button.toolbar-state-on .toolbar-glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    },

    _hideSeparatorDupes: function()
    {
        if (!this._items.length)
            return;
        // Don't hide first and last separators if they were added explicitly.
        var previousIsSeparator = false;
        var lastSeparator;
        var nonSeparatorVisible = false;
        for (var i = 0; i < this._items.length; ++i) {
            if (this._items[i] instanceof WebInspector.ToolbarSeparator) {
                this._items[i].setVisible(!previousIsSeparator);
                previousIsSeparator = true;
                lastSeparator = this._items[i];
                continue;
            }
            if (this._items[i].visible()) {
                previousIsSeparator = false;
                lastSeparator = null;
                nonSeparatorVisible = true;
            }
        }
        if (lastSeparator && lastSeparator !== this._items.peekLast())
            lastSeparator.setVisible(false);

        this.element.classList.toggle("hidden", !!lastSeparator && lastSeparator.visible() && !nonSeparatorVisible);
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!Element} element
 */
WebInspector.ToolbarItem = function(element)
{
    this.element = element;
    this.element.classList.add("toolbar-item");
    this._visible = true;
    this._enabled = true;
    this.element.addEventListener("mouseenter", this._mouseEnter.bind(this), false);
    this.element.addEventListener("mouseleave", this._mouseLeave.bind(this), false);
}

WebInspector.ToolbarItem.prototype = {
    /**
     * @param {string} title
     */
    setTitle: function(title)
    {
        if (this._title === title)
            return;
        this._title = title;
        WebInspector.Tooltip.install(this.element, title);
    },

    _mouseEnter: function()
    {
        this.element.classList.add("hover");
    },

    _mouseLeave: function()
    {
        this.element.classList.remove("hover");
    },

    /**
     * @param {boolean} value
     */
    setEnabled: function(value)
    {
        if (this._enabled === value)
            return;
        this._enabled = value;
        this._applyEnabledState();
    },

    _applyEnabledState: function()
    {
        this.element.disabled = !this._enabled;
    },

    /**
     * @return {boolean} x
     */
    visible: function()
    {
        return this._visible;
    },

    /**
     * @param {boolean} x
     */
    setVisible: function(x)
    {
        if (this._visible === x)
            return;
        this.element.classList.toggle("hidden", !x);
        this._visible = x;
        if (this._toolbar && !(this instanceof WebInspector.ToolbarSeparator))
            this._toolbar._hideSeparatorDupes();
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string=} text
 */
WebInspector.ToolbarText = function(text)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("div", "toolbar-text"));
    this.element.classList.add("toolbar-text");
    this.setText(text || "");
}

WebInspector.ToolbarText.prototype = {
     /**
     * @param {string} text
     */
    setText: function(text)
    {
        this.element.textContent = text;
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string} title
 * @param {string=} glyph
 * @param {string=} text
 */
WebInspector.ToolbarButton = function(title, glyph, text)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("button", "toolbar-button"));
    this.element.addEventListener("click", this._clicked.bind(this), false);
    this.element.addEventListener("mousedown", this._mouseDown.bind(this), false);
    this.element.addEventListener("mouseup", this._mouseUp.bind(this), false);

    this._glyphElement = this.element.createChild("div", "toolbar-glyph hidden");
    this._textElement = this.element.createChild("div", "toolbar-text hidden");

    this.setTitle(title);
    if (glyph)
        this.setGlyph(glyph);
    this.setText(text || "");
    this._state = "";
    this._title = "";
}

WebInspector.ToolbarButton.prototype = {
    /**
     * @param {string} text
     */
    setText: function(text)
    {
        if (this._text === text)
            return;
        this._textElement.textContent = text;
        this._textElement.classList.toggle("hidden", !text);
        this._text = text;
    },

    /**
     * @param {string} glyph
     */
    setGlyph: function(glyph)
    {
        if (this._glyph === glyph)
            return;
        if (this._glyph)
            this._glyphElement.classList.remove(this._glyph);
        if (glyph)
            this._glyphElement.classList.add(glyph);
        this._glyphElement.classList.toggle("hidden", !glyph);
        this.element.classList.toggle("toolbar-has-glyph", !!glyph);
        this._glyph = glyph;
    },

    /**
     * @param {string} iconURL
     */
    setBackgroundImage: function(iconURL)
    {
        this.element.style.backgroundImage = "url(" + iconURL + ")";
    },

    /**
     * @return {string}
     */
    state: function()
    {
        return this._state;
    },

    /**
     * @param {string} state
     */
    setState: function(state)
    {
        if (this._state === state)
            return;
        this.element.classList.remove("toolbar-state-" + this._state);
        this.element.classList.add("toolbar-state-" + state);
        this._state = state;
    },

    /**
     * @param {number=} width
     */
    turnIntoSelect: function(width)
    {
        this.element.classList.add("toolbar-has-dropdown");
        this.element.createChild("div", "toolbar-dropdown-arrow");
        if (width)
            this.element.style.width = width + "px";
    },

    /**
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        var defaultPrevented = this.dispatchEventToListeners("click", event);
        event.consume(defaultPrevented);
    },

    /**
     * @param {!Event} event
     */
    _mouseDown: function(event)
    {
        this.dispatchEventToListeners("mousedown", event);
    },

    /**
     * @param {!Event} event
     */
    _mouseUp: function(event)
    {
        this.dispatchEventToListeners("mouseup", event);
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string=} placeholder
 * @param {number=} growFactor
 */
WebInspector.ToolbarInput = function(placeholder, growFactor)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("input", "toolbar-item"));
    this.element.addEventListener("input", this._onChangeCallback.bind(this), false);
    if (growFactor)
        this.element.style.flexGrow = growFactor;
    if (placeholder)
        this.element.setAttribute("placeholder", placeholder);
    this._value = "";
}

WebInspector.ToolbarInput.Event = {
    TextChanged: "TextChanged"
};

WebInspector.ToolbarInput.prototype = {
    /**
     * @param {string} value
     */
    setValue: function(value)
    {
        this._value = value;
        this.element.value = value;
    },

    /**
     * @return {string}
     */
    value: function()
    {
        return this.element.value;
    },

    _onChangeCallback: function()
    {
        this.dispatchEventToListeners(WebInspector.ToolbarInput.Event.TextChanged, this.element.value);
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarButton}
 * @param {string} title
 * @param {string=} glyph
 * @param {string=} text
 */
WebInspector.ToolbarToggle = function(title, glyph, text)
{
    WebInspector.ToolbarButton.call(this, title, glyph, text);
    this._toggled = false;
    this.setState("off");
}

WebInspector.ToolbarToggle.prototype = {
    /**
     * @return {boolean}
     */
    toggled: function()
    {
        return this._toggled;
    },

    /**
     * @param {boolean} toggled
     */
    setToggled: function(toggled)
    {
        if (this._toggled === toggled)
            return;
        this._toggled = toggled;
        this.setState(toggled ? "on" : "off");
    },

    __proto__: WebInspector.ToolbarButton.prototype
}

/**
 * @param {!WebInspector.Action} action
 * @param {!Array<!WebInspector.ToolbarButton>=} toggledOptions
 * @param {!Array<!WebInspector.ToolbarButton>=} untoggledOptions
 * @return {!WebInspector.ToolbarItem}
 */
WebInspector.Toolbar.createActionButton = function(action, toggledOptions, untoggledOptions)
{
    var button = new WebInspector.ToolbarToggle(action.title(), action.icon());
    button.addEventListener("click", action.execute, action);
    action.addEventListener(WebInspector.Action.Events.Enabled, enabledChanged);
    action.addEventListener(WebInspector.Action.Events.Toggled, toggled);
    /** @type {?WebInspector.LongClickController} */
    var longClickController = null;
    /** @type {?Array<!WebInspector.ToolbarButton>} */
    var longClickButtons = null;
    /** @type {?Element} */
    var longClickGlyph = null;
    toggled();
    return button;

    /**
     * @param {!WebInspector.Event} event
     */
    function enabledChanged(event)
    {
        button.setEnabled(/** @type {boolean} */ (event.data));
    }

    function toggled()
    {
        button.setToggled(action.toggled());
        if (action.title())
            WebInspector.Tooltip.install(button.element, action.title(), action.id());
        updateOptions();
    }

    function updateOptions()
    {
        var buttons = action.toggled() ? (toggledOptions || null) : (untoggledOptions || null);

        if (buttons && buttons.length) {
            if (!longClickController) {
                longClickController = new WebInspector.LongClickController(button.element, showOptions);
                longClickGlyph = button.element.createChild("div", "long-click-glyph toolbar-button-theme");
                longClickButtons = buttons;
            }
        } else {
            if (longClickController) {
                longClickController.dispose();
                longClickController = null;
                longClickGlyph.remove();
                longClickGlyph = null;
                longClickButtons = null;
            }
        }
    }

    function showOptions()
    {
        var buttons = longClickButtons.slice();
        var mainButtonClone = new WebInspector.ToolbarToggle(action.title(), action.icon());
        mainButtonClone.addEventListener("click", clicked);

        /**
         * @param {!WebInspector.Event} event
         */
        function clicked(event)
        {
            button._clicked(/** @type {!Event} */ (event.data));
        }

        mainButtonClone.setToggled(action.toggled());
        buttons.push(mainButtonClone);

        var document = button.element.ownerDocument;
        document.documentElement.addEventListener("mouseup", mouseUp, false);

        var optionsGlassPane = new WebInspector.GlassPane(document);
        var optionsBar = new WebInspector.Toolbar("fill", optionsGlassPane.element);
        optionsBar._contentElement.classList.add("floating");
        const buttonHeight = 26;

        var hostButtonPosition = button.element.totalOffset();

        var topNotBottom = hostButtonPosition.top + buttonHeight * buttons.length < document.documentElement.offsetHeight;

        if (topNotBottom)
            buttons = buttons.reverse();

        optionsBar.element.style.height = (buttonHeight * buttons.length) + "px";
        if (topNotBottom)
            optionsBar.element.style.top = (hostButtonPosition.top + 1) + "px";
        else
            optionsBar.element.style.top = (hostButtonPosition.top - (buttonHeight * (buttons.length - 1))) + "px";
        optionsBar.element.style.left = (hostButtonPosition.left + 1) + "px";

        for (var i = 0; i < buttons.length; ++i) {
            buttons[i].element.addEventListener("mousemove", mouseOver, false);
            buttons[i].element.addEventListener("mouseout", mouseOut, false);
            optionsBar.appendToolbarItem(buttons[i]);
        }
        var hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
        buttons[hostButtonIndex].element.classList.add("emulate-active");

        function mouseOver(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.add("emulate-active");
        }

        function mouseOut(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.remove("emulate-active");
        }

        function mouseUp(e)
        {
            if (e.which !== 1)
                return;
            optionsGlassPane.dispose();
            document.documentElement.removeEventListener("mouseup", mouseUp, false);

            for (var i = 0; i < buttons.length; ++i) {
                if (buttons[i].element.classList.contains("emulate-active")) {
                    buttons[i].element.classList.remove("emulate-active");
                    buttons[i]._clicked(e);
                    break;
                }
            }
        }
    }
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarButton}
 * @param {function(!WebInspector.ContextMenu)} contextMenuHandler
 * @param {boolean=} useSoftMenu
 */
WebInspector.ToolbarMenuButton = function(contextMenuHandler, useSoftMenu)
{
    WebInspector.ToolbarButton.call(this, "", "menu-toolbar-item");
    this._contextMenuHandler = contextMenuHandler;
    this._useSoftMenu = !!useSoftMenu;
}

WebInspector.ToolbarMenuButton.prototype = {
    /**
     * @override
     * @param {!Event} event
     */
    _mouseDown: function(event)
    {
        if (event.buttons !== 1) {
            WebInspector.ToolbarButton.prototype._mouseDown.call(this, event);
            return;
        }

        if (!this._triggerTimeout)
            this._triggerTimeout = setTimeout(this._trigger.bind(this, event), 200);
    },

    /**
     * @param {!Event} event
     */
    _trigger: function(event)
    {
        delete this._triggerTimeout;
        var contextMenu = new WebInspector.ContextMenu(event,
            this._useSoftMenu,
            this.element.totalOffsetLeft(),
            this.element.totalOffsetTop() + this.element.offsetHeight);
        this._contextMenuHandler(contextMenu);
        contextMenu.show();
    },

    /**
     * @override
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        if (!this._triggerTimeout)
            return;
        clearTimeout(this._triggerTimeout);
        this._trigger(event);
    },

    __proto__: WebInspector.ToolbarButton.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarToggle}
 * @param {!WebInspector.Setting} setting
 * @param {string} glyph
 * @param {string} title
 * @param {string=} toggledTitle
 */
WebInspector.ToolbarSettingToggle = function(setting, glyph, title, toggledTitle)
{
    WebInspector.ToolbarToggle.call(this, title, glyph);
    this._defaultTitle = title;
    this._toggledTitle = toggledTitle || title;
    this._setting = setting;
    this._settingChanged();
    this._setting.addChangeListener(this._settingChanged, this);
}

WebInspector.ToolbarSettingToggle.prototype = {
    _settingChanged: function()
    {
        var toggled = this._setting.get();
        this.setToggled(toggled);
        this.setTitle(toggled ? this._toggledTitle : this._defaultTitle);
    },

    /**
     * @override
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        this._setting.set(!this.toggled());
        WebInspector.ToolbarToggle.prototype._clicked.call(this, event);
    },

    __proto__: WebInspector.ToolbarToggle.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {boolean=} spacer
 */
WebInspector.ToolbarSeparator = function(spacer)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("div", spacer ? "toolbar-spacer" : "toolbar-divider"));
}

WebInspector.ToolbarSeparator.prototype = {
    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @interface
 */
WebInspector.ToolbarItem.Provider = function()
{
}

WebInspector.ToolbarItem.Provider.prototype = {
    /**
     * @return {?WebInspector.ToolbarItem}
     */
    item: function() {}
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {?function(!Event)} changeHandler
 * @param {string=} className
 */
WebInspector.ToolbarComboBox = function(changeHandler, className)
{
    WebInspector.ToolbarItem.call(this, createElementWithClass("span", "toolbar-select-container"));

    this._selectElement = this.element.createChild("select", "toolbar-item");
    this.element.createChild("div", "toolbar-dropdown-arrow");
    if (changeHandler)
        this._selectElement.addEventListener("change", changeHandler, false);
    if (className)
        this._selectElement.classList.add(className);
}

WebInspector.ToolbarComboBox.prototype = {
    /**
     * @return {!HTMLSelectElement}
     */
    selectElement: function()
    {
        return /** @type {!HTMLSelectElement} */ (this._selectElement);
    },

    /**
     * @return {number}
     */
    size: function()
    {
        return this._selectElement.childElementCount;
    },

    /**
     * @return {!Array.<!Element>}
     */
    options: function()
    {
        return Array.prototype.slice.call(this._selectElement.children, 0);
    },

    /**
     * @param {!Element} option
     */
    addOption: function(option)
    {
        this._selectElement.appendChild(option);
    },

    /**
     * @param {string} label
     * @param {string=} title
     * @param {string=} value
     * @return {!Element}
     */
    createOption: function(label, title, value)
    {
        var option = this._selectElement.createChild("option");
        option.text = label;
        if (title)
            option.title = title;
        if (typeof value !== "undefined")
            option.value = value;
        return option;
    },

    /**
     * @override
     */
    _applyEnabledState: function()
    {
        this._selectElement.disabled = !this._enabled;
    },

    /**
     * @param {!Element} option
     */
    removeOption: function(option)
    {
        this._selectElement.removeChild(option);
    },

    removeOptions: function()
    {
        this._selectElement.removeChildren();
    },

    /**
     * @return {?Element}
     */
    selectedOption: function()
    {
        if (this._selectElement.selectedIndex >= 0)
            return this._selectElement[this._selectElement.selectedIndex];
        return null;
    },

    /**
     * @param {!Element} option
     */
    select: function(option)
    {
        this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
    },

    /**
     * @param {number} index
     */
    setSelectedIndex: function(index)
    {
        this._selectElement.selectedIndex = index;
    },

    /**
     * @return {number}
     */
    selectedIndex: function()
    {
        return this._selectElement.selectedIndex;
    },

    /**
     * @param {number} width
     */
    setMaxWidth: function(width)
    {
        this._selectElement.style.maxWidth = width + "px";
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ToolbarItem}
 * @param {string} text
 * @param {string=} title
 * @param {!WebInspector.Setting=} setting
 * @param {function()=} listener
 */
WebInspector.ToolbarCheckbox = function(text, title, setting, listener)
{
    WebInspector.ToolbarItem.call(this, createCheckboxLabel(text));
    this.element.classList.add("checkbox");
    this.inputElement = this.element.checkboxElement;
    if (title)
        this.element.title = title;
    if (setting)
        WebInspector.SettingsUI.bindCheckbox(this.inputElement, setting);
    if (listener)
        this.inputElement.addEventListener("click", listener, false);
}

WebInspector.ToolbarCheckbox.prototype = {
    /**
     * @return {boolean}
     */
    checked: function()
    {
        return this.inputElement.checked;
    },

    /**
     * @param {boolean} value
     */
    setChecked: function(value)
    {
        this.inputElement.checked = value;
    },

    __proto__: WebInspector.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Toolbar}
 * @param {string} location
 * @param {!Element=} parentElement
 */
WebInspector.ExtensibleToolbar = function(location, parentElement)
{
    WebInspector.Toolbar.call(this, "", parentElement);
    this._loadItems(location);
}

WebInspector.ExtensibleToolbar.prototype = {
    /**
     * @param {string} location
     */
    _loadItems: function(location)
    {
        var extensions = self.runtime.extensions(WebInspector.ToolbarItem.Provider);
        var promises = [];
        for (var i = 0; i < extensions.length; ++i) {
            if (extensions[i].descriptor()["location"] === location)
                promises.push(resolveItem(extensions[i]));
        }
        this._promise = Promise.all(promises).then(appendItemsInOrder.bind(this));

        /**
         * @param {!Runtime.Extension} extension
         * @return {!Promise.<?WebInspector.ToolbarItem>}
         */
        function resolveItem(extension)
        {
            var descriptor = extension.descriptor();
            if (descriptor["separator"])
                return Promise.resolve(/** @type {?WebInspector.ToolbarItem} */(new WebInspector.ToolbarSeparator()));
            if (descriptor["actionId"])
                return Promise.resolve(/** @type {?WebInspector.ToolbarItem} */(WebInspector.Toolbar.createActionButton(WebInspector.actionRegistry.action(descriptor["actionId"]))));
            return extension.instancePromise().then(fetchItemFromProvider);

            /**
             * @param {!Object} provider
             */
            function fetchItemFromProvider(provider)
            {
                return /** @type {!WebInspector.ToolbarItem.Provider} */ (provider).item();
            }
        }

        /**
         * @param {!Array.<?WebInspector.ToolbarItem>} items
         * @this {WebInspector.ExtensibleToolbar}
         */
        function appendItemsInOrder(items)
        {
            for (var i = 0; i < items.length; ++i) {
                var item = items[i];
                if (item)
                    this.appendToolbarItem(item);
            }
        }
    },

    /**
     * @return {!Promise}
     */
    onLoad: function()
    {
        return this._promise;
    },

    __proto__: WebInspector.Toolbar.prototype
}
