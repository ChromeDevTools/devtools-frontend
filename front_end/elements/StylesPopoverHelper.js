 // Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.StylesPopoverHelper = function()
{
    this._popover = new WebInspector.Popover();
    this._popover.setCanShrink(false);
    this._popover.element.addEventListener("mousedown", consumeEvent, false);

    this._hideProxy = this.hide.bind(this, true);
    this._boundOnKeyDown = this._onKeyDown.bind(this);
}

WebInspector.StylesPopoverHelper.Events = {
    Hidden: "Hidden"
};

WebInspector.StylesPopoverHelper.prototype = {
    /**
     * @return {boolean}
     */
    isShowing: function()
    {
        return this._popover.isShowing();
    },

    /**
     * @param {!WebInspector.View} view
     * @param {!Element} anchorElement
     * @return {boolean}
     */
    show: function(view, anchorElement)
    {
        if (this._popover.isShowing()) {
            if (this._anchorElement === anchorElement)
                return false;

            // Reopen the picker for another anchor element.
            this.hide(true);
        }

        delete this._isHidden;
        this._anchorElement = anchorElement;
        this._view = view;
        this.reposition(this._view, anchorElement);

        var document = this._popover.element.ownerDocument;
        document.addEventListener("mousedown", this._hideProxy, false);
        document.defaultView.addEventListener("resize", this._hideProxy, false);
        this._view.contentElement.addEventListener("keydown", this._boundOnKeyDown, false);

        return true;
    },

    /**
     * @param {!Element} element
     * @param {!WebInspector.View} view
     * @param {!Event=} event
     */
    reposition: function(view, element, event)
    {
        if (!this._previousFocusElement)
            this._previousFocusElement = WebInspector.currentFocusElement();
        this._popover.showView(view, element);
        WebInspector.setCurrentFocusElement(view.contentElement);
    },

    /**
     * @param {boolean=} commitEdit
     */
    hide: function(commitEdit)
    {
        if (this._isHidden)
            return;
        var document = this._popover.element.ownerDocument;
        this._isHidden = true;
        this._popover.hide();

        document.removeEventListener("mousedown", this._hideProxy, false);
        document.defaultView.removeEventListener("resize", this._hideProxy, false);

        this.dispatchEventToListeners(WebInspector.StylesPopoverHelper.Events.Hidden, !!commitEdit);

        WebInspector.setCurrentFocusElement(this._previousFocusElement);
        delete this._previousFocusElement;
        delete this._anchorElement;
        if (this._view) {
            this._view.detach();
            this._view.contentElement.removeEventListener("keydown", this._boundOnKeyDown, false);
            delete this._view;
        }
    },

    /**
     * @param {!Event} event
     */
    _onKeyDown: function(event)
    {
        if (event.keyIdentifier === "Enter") {
            this.hide(true);
            event.consume(true);
            return;
        }
        if (event.keyIdentifier === "U+001B") { // Escape key
            this.hide(false);
            event.consume(true);
        }
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.StylePropertyTreeElementBase} treeElement
 * @param {?WebInspector.StylesPopoverHelper} stylesPopoverHelper
 * @param {!Element} nameElement
 * @param {!Element} valueElement
 * @param {string} text
 */
WebInspector.StylesPopoverIcon = function(treeElement, stylesPopoverHelper, nameElement, valueElement, text)
{
    this._treeElement = treeElement;
    this._stylesPopoverHelper = stylesPopoverHelper;
    this._nameElement = nameElement;
    this._valueElement = valueElement;
    this._text = text;
    this._boundPopoverHidden = this.popoverHidden.bind(this);
}

WebInspector.StylesPopoverIcon.prototype = {
    /**
     * @return {boolean}
     */
    editable: function()
    {
        return this._treeElement.isEditableStyleRule();
    },

    /**
     * @return {?WebInspector.View}
     */
    view: function()
    {
        return null;
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    toggle: function(event)
    {
        return false;
    },

    /**
     * @param {!Event} event
     */
    _iconClick: function(event)
    {
        event.consume(true);

        if (this.toggle(event)) {
            this._originalPropertyText = this._treeElement.property.propertyText;
            this._treeElement.editablePane().setEditingStyle(true);
            this._scrollerElement = this._iconElement.enclosingNodeOrSelfWithClass("style-panes-wrapper");
            this._stylesPopoverHelper.addEventListener(WebInspector.StylesPopoverHelper.Events.Hidden, this._boundPopoverHidden);
            if (this._scrollerElement && this.view()) {
                this._repositionCallback = this._stylesPopoverHelper.reposition.bind(this._stylesPopoverHelper, /** @type {!WebInspector.View} */(this.view()), this._iconElement);
                this._scrollerElement.addEventListener("scroll", this._repositionCallback, false);
            } else {
                console.error("Unable to handle picker scrolling");
            }
        }
    },

    _valueChanged: function()
    {
        this._treeElement.applyStyleText(this._nameElement.textContent + ": " + this._valueElement.textContent, false, false, false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    popoverHidden: function(event)
    {
        if (this._scrollerElement && this._repositionCallback) {
            this._scrollerElement.removeEventListener("scroll", this._repositionCallback, false);
            delete this._repositionCallback;
        }
        this._stylesPopoverHelper.removeEventListener(WebInspector.StylesPopoverHelper.Events.Hidden, this._boundPopoverHidden);
        var commitEdit = event.data;
        var propertyText = !commitEdit && this._originalPropertyText ? this._originalPropertyText : (this._nameElement.textContent + ": " + this._valueElement.textContent);
        this._treeElement.applyStyleText(propertyText, true, true, false);
        this._treeElement.editablePane().setEditingStyle(false);
        delete this._originalPropertyText;
    },

    __proto__: WebInspector.Object.prototype
}