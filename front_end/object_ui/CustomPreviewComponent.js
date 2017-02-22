// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
ObjectUI.CustomPreviewSection = class {
  /**
   * @param {!SDK.RemoteObject} object
   */
  constructor(object) {
    this._sectionElement = createElementWithClass('span', 'custom-expandable-section');
    this._object = object;
    this._expanded = false;
    this._cachedContent = null;
    var customPreview = object.customPreview();

    try {
      var headerJSON = JSON.parse(customPreview.header);
    } catch (e) {
      Common.console.error('Broken formatter: header is invalid json ' + e);
      return;
    }
    this._header = this._renderJSONMLTag(headerJSON);
    if (this._header.nodeType === Node.TEXT_NODE) {
      Common.console.error('Broken formatter: header should be an element node.');
      return;
    }

    if (customPreview.hasBody) {
      this._header.classList.add('custom-expandable-section-header');
      this._header.addEventListener('click', this._onClick.bind(this), false);
      this._expandIcon = UI.Icon.create('smallicon-triangle-right', 'custom-expand-icon');
      this._header.insertBefore(this._expandIcon, this._header.firstChild);
    }

    this._sectionElement.appendChild(this._header);
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._sectionElement;
  }

  /**
   * @param {*} jsonML
   * @return {!Node}
   */
  _renderJSONMLTag(jsonML) {
    if (!Array.isArray(jsonML))
      return createTextNode(jsonML + '');

    var array = /** @type {!Array.<*>} */ (jsonML);
    return array[0] === 'object' ? this._layoutObjectTag(array) : this._renderElement(array);
  }

  /**
   *
   * @param {!Array.<*>} object
   * @return {!Node}
   */
  _renderElement(object) {
    var tagName = object.shift();
    if (!ObjectUI.CustomPreviewSection._tagsWhiteList.has(tagName)) {
      Common.console.error('Broken formatter: element ' + tagName + ' is not allowed!');
      return createElement('span');
    }
    var element = createElement(/** @type {string} */ (tagName));
    if ((typeof object[0] === 'object') && !Array.isArray(object[0])) {
      var attributes = object.shift();
      for (var key in attributes) {
        var value = attributes[key];
        if ((key !== 'style') || (typeof value !== 'string'))
          continue;

        element.setAttribute(key, value);
      }
    }

    this._appendJsonMLTags(element, object);
    return element;
  }

  /**
   * @param {!Array.<*>} objectTag
   * @return {!Node}
   */
  _layoutObjectTag(objectTag) {
    objectTag.shift();
    var attributes = objectTag.shift();
    var remoteObject = this._object.target().runtimeModel.createRemoteObject(
        /** @type {!Protocol.Runtime.RemoteObject} */ (attributes));
    if (remoteObject.customPreview())
      return (new ObjectUI.CustomPreviewSection(remoteObject)).element();

    var sectionElement = ObjectUI.ObjectPropertiesSection.defaultObjectPresentation(remoteObject);
    sectionElement.classList.toggle('custom-expandable-section-standard-section', remoteObject.hasChildren);
    return sectionElement;
  }

  /**
   * @param {!Node} parentElement
   * @param {!Array.<*>} jsonMLTags
   */
  _appendJsonMLTags(parentElement, jsonMLTags) {
    for (var i = 0; i < jsonMLTags.length; ++i)
      parentElement.appendChild(this._renderJSONMLTag(jsonMLTags[i]));
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    event.consume(true);
    if (this._cachedContent)
      this._toggleExpand();
    else
      this._loadBody();
  }

  _toggleExpand() {
    this._expanded = !this._expanded;
    this._header.classList.toggle('expanded', this._expanded);
    this._cachedContent.classList.toggle('hidden', !this._expanded);
    if (this._expanded)
      this._expandIcon.setIconType('smallicon-triangle-down');
    else
      this._expandIcon.setIconType('smallicon-triangle-right');
  }

  _loadBody() {
    /**
     * @suppressReceiverCheck
     * @suppressGlobalPropertiesCheck
     * @suppress {undefinedVars}
     * @this {Object}
     * @param {function(!Object, *):*} bindRemoteObject
     * @param {*=} formatter
     * @param {*=} config
     */
    function load(bindRemoteObject, formatter, config) {
      /**
       * @param {*} jsonMLObject
       * @throws {string} error message
       */
      function substituteObjectTagsInCustomPreview(jsonMLObject) {
        if (!jsonMLObject || (typeof jsonMLObject !== 'object') || (typeof jsonMLObject.splice !== 'function'))
          return;

        var obj = jsonMLObject.length;
        if (!(typeof obj === 'number' && obj >>> 0 === obj && (obj > 0 || 1 / obj > 0)))
          return;

        var startIndex = 1;
        if (jsonMLObject[0] === 'object') {
          var attributes = jsonMLObject[1];
          var originObject = attributes['object'];
          var config = attributes['config'];
          if (typeof originObject === 'undefined')
            throw 'Illegal format: obligatory attribute "object" isn\'t specified';

          jsonMLObject[1] = bindRemoteObject(originObject, config);
          startIndex = 2;
        }
        for (var i = startIndex; i < jsonMLObject.length; ++i)
          substituteObjectTagsInCustomPreview(jsonMLObject[i]);
      }

      try {
        var body = formatter.body(this, config);
        substituteObjectTagsInCustomPreview(body);
        return body;
      } catch (e) {
        console.error('Custom Formatter Failed: ' + e);
        return null;
      }
    }

    var customPreview = this._object.customPreview();
    var args = [{objectId: customPreview.bindRemoteObjectFunctionId}, {objectId: customPreview.formatterObjectId}];
    if (customPreview.configObjectId)
      args.push({objectId: customPreview.configObjectId});
    this._object.callFunctionJSON(load, args, onBodyLoaded.bind(this));

    /**
     * @param {*} bodyJsonML
     * @this {ObjectUI.CustomPreviewSection}
     */
    function onBodyLoaded(bodyJsonML) {
      if (!bodyJsonML)
        return;

      this._cachedContent = this._renderJSONMLTag(bodyJsonML);
      this._sectionElement.appendChild(this._cachedContent);
      this._toggleExpand();
    }
  }
};

/**
 * @unrestricted
 */
ObjectUI.CustomPreviewComponent = class {
  /**
   * @param {!SDK.RemoteObject} object
   */
  constructor(object) {
    this._object = object;
    this._customPreviewSection = new ObjectUI.CustomPreviewSection(object);
    this.element = createElementWithClass('span', 'source-code');
    var shadowRoot = UI.createShadowRootWithCoreStyles(this.element, 'object_ui/customPreviewComponent.css');
    this.element.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);
    shadowRoot.appendChild(this._customPreviewSection.element());
  }

  expandIfPossible() {
    if (this._object.customPreview().hasBody && this._customPreviewSection)
      this._customPreviewSection._loadBody();
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    var contextMenu = new UI.ContextMenu(event);
    if (this._customPreviewSection)
      contextMenu.appendItem(Common.UIString.capitalize('Show as Javascript ^object'), this._disassemble.bind(this));
    contextMenu.appendApplicableItems(this._object);
    contextMenu.show();
  }

  _disassemble() {
    this.element.shadowRoot.textContent = '';
    this._customPreviewSection = null;
    this.element.shadowRoot.appendChild(ObjectUI.ObjectPropertiesSection.defaultObjectPresentation(this._object));
  }
};

ObjectUI.CustomPreviewSection._tagsWhiteList = new Set(['span', 'div', 'ol', 'li', 'table', 'tr', 'td']);
