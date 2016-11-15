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
 * @unrestricted
 */
SourceFrame.ImageView = class extends UI.SimpleView {
  /**
   * @param {string} mimeType
   * @param {!Common.ContentProvider} contentProvider
   */
  constructor(mimeType, contentProvider) {
    super(Common.UIString('Image'));
    this.registerRequiredCSS('source_frame/imageView.css');
    this.element.classList.add('image-view');
    this._url = contentProvider.contentURL();
    this._parsedURL = new Common.ParsedURL(this._url);
    this._mimeType = mimeType;
    this._contentProvider = contentProvider;
    this._sizeLabel = new UI.ToolbarText();
    this._dimensionsLabel = new UI.ToolbarText();
    this._mimeTypeLabel = new UI.ToolbarText(mimeType);
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    return [
      this._sizeLabel, new UI.ToolbarSeparator(), this._dimensionsLabel, new UI.ToolbarSeparator(), this._mimeTypeLabel
    ];
  }

  /**
   * @override
   */
  wasShown() {
    this._createContentIfNeeded();
  }

  _createContentIfNeeded() {
    if (this._container)
      return;

    this._container = this.element.createChild('div', 'image');
    var imagePreviewElement = this._container.createChild('img', 'resource-image-view');
    imagePreviewElement.addEventListener('contextmenu', this._contextMenu.bind(this), true);

    this._contentProvider.requestContent().then(onContentAvailable.bind(this));

    /**
     * @param {?string} content
     * @this {SourceFrame.ImageView}
     */
    function onContentAvailable(content) {
      var imageSrc = Common.ContentProvider.contentAsDataURL(content, this._mimeType, true);
      if (imageSrc === null)
        imageSrc = this._url;
      imagePreviewElement.src = imageSrc;
      this._sizeLabel.setText(Number.bytesToString(this._base64ToSize(content)));
      this._dimensionsLabel.setText(
          Common.UIString('%d × %d', imagePreviewElement.naturalWidth, imagePreviewElement.naturalHeight));
    }
    this._imagePreviewElement = imagePreviewElement;
  }

  /**
   * @param {?string} content
   * @return {number}
   */
  _base64ToSize(content) {
    if (!content || !content.length)
      return 0;
    var size = (content.length || 0) * 3 / 4;
    if (content.length > 0 && content[content.length - 1] === '=')
      size--;
    if (content.length > 1 && content[content.length - 2] === '=')
      size--;
    return size;
  }

  _contextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    if (!this._parsedURL.isDataURL())
      contextMenu.appendItem(Common.UIString.capitalize('Copy ^image URL'), this._copyImageURL.bind(this));
    if (this._imagePreviewElement.src) {
      contextMenu.appendItem(
          Common.UIString.capitalize('Copy ^image as Data URI'), this._copyImageAsDataURL.bind(this));
    }
    contextMenu.appendItem(Common.UIString.capitalize('Open ^image in ^new ^tab'), this._openInNewTab.bind(this));
    contextMenu.appendItem(Common.UIString.capitalize('Save\u2026'), this._saveImage.bind(this));
    contextMenu.show();
  }

  _copyImageAsDataURL() {
    InspectorFrontendHost.copyText(this._imagePreviewElement.src);
  }

  _copyImageURL() {
    InspectorFrontendHost.copyText(this._url);
  }

  _saveImage() {
    var link = createElement('a');
    link.download = this._parsedURL.displayName;
    link.href = this._url;
    link.click();
  }

  _openInNewTab() {
    InspectorFrontendHost.openInNewTab(this._url);
  }
};
