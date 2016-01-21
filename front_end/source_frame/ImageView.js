/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @extends {WebInspector.VBoxWithToolbarItems}
 * @constructor
 * @param {string} mimeType
 * @param {!WebInspector.ContentProvider} contentProvider
 */
WebInspector.ImageView = function(mimeType, contentProvider)
{
    WebInspector.VBoxWithToolbarItems.call(this);
    this.registerRequiredCSS("source_frame/imageView.css");
    this.element.classList.add("image-view");
    this._url = contentProvider.contentURL();
    this._parsedURL = new WebInspector.ParsedURL(this._url);
    this._mimeType = mimeType;
    this._contentProvider = contentProvider;
    this._sizeLabel = new WebInspector.ToolbarText();
    this._dimensionsLabel = new WebInspector.ToolbarText();
    this._mimeTypeLabel = new WebInspector.ToolbarText(mimeType);
}

WebInspector.ImageView.prototype = {
    /**
     * @override
     * @return {!Array<!WebInspector.ToolbarItem>}
     */
    toolbarItems: function()
    {
        return [this._sizeLabel, new WebInspector.ToolbarSeparator(), this._dimensionsLabel, new WebInspector.ToolbarSeparator(), this._mimeTypeLabel];
    },

    wasShown: function()
    {
        this._createContentIfNeeded();
    },

    _createContentIfNeeded: function()
    {
        if (this._container)
            return;

        this._container = this.element.createChild("div", "image");
        var imagePreviewElement = this._container.createChild("img", "resource-image-view");
        imagePreviewElement.addEventListener("contextmenu", this._contextMenu.bind(this), true);
        WebInspector.Resource.populateImageSource(this._url, this._mimeType, this._contentProvider, imagePreviewElement);

        this._contentProvider.requestContent().then(onContentAvailable.bind(this));

        /**
         * @param {?string} content
         * @this {WebInspector.ImageView}
         */
        function onContentAvailable(content)
        {
            this._sizeLabel.setText(Number.bytesToString(this._base64ToSize(content)));
            this._dimensionsLabel.setText(WebInspector.UIString("%d × %d", imagePreviewElement.naturalWidth, imagePreviewElement.naturalHeight));
        }
        this._imagePreviewElement = imagePreviewElement;
    },

    /**
     * @param {?string} content
     * @return {number}
     */
    _base64ToSize: function(content)
    {
        if (!content || !content.length)
            return 0;
        var size = (content.length || 0) * 3 / 4;
        if (content.length > 0 && content[content.length - 1] === "=")
            size--;
        if (content.length > 1 && content[content.length - 2] === "=")
            size--;
        return size;
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Copy ^image URL"), this._copyImageURL.bind(this));
        if (this._imagePreviewElement.src)
            contextMenu.appendItem(WebInspector.UIString.capitalize("Copy ^image as Data URL"), this._copyImageAsDataURL.bind(this));
        contextMenu.appendItem(WebInspector.UIString.capitalize("Open ^image in ^new ^tab"), this._openInNewTab.bind(this));
        contextMenu.show();
    },

    _copyImageAsDataURL: function()
    {
        InspectorFrontendHost.copyText(this._imagePreviewElement.src);
    },

    _copyImageURL: function()
    {
        InspectorFrontendHost.copyText(this._url);
    },

    _openInNewTab: function()
    {
        InspectorFrontendHost.openInNewTab(this._url);
    },

    __proto__: WebInspector.VBoxWithToolbarItems.prototype
}
