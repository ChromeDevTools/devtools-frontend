// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {ObjectPropertiesSection} from './ObjectPropertiesSection.js';

export const UIStrings = {
  /**
  *@description A context menu item in the Custom Preview Component
  */
  showAsJavascriptObject: 'Show as JavaScript object',
};
const str_ = i18n.i18n.registerUIStrings('object_ui/CustomPreviewComponent.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CustomPreviewSection {
  /**
   * @param {!SDK.RemoteObject.RemoteObject} object
   */
  constructor(object) {
    this._sectionElement = document.createElement('span');
    this._sectionElement.classList.add('custom-expandable-section');
    this._object = object;
    this._expanded = false;
    /**
     * @type {?Node}
     */
    this._cachedContent = null;
    const customPreview = object.customPreview();

    if (!customPreview) {
      return;
    }

    let headerJSON;
    try {
      headerJSON = JSON.parse(customPreview.header);
    } catch (e) {
      Common.Console.Console.instance().error('Broken formatter: header is invalid json ' + e);
      return;
    }
    this._header = this._renderJSONMLTag(headerJSON);
    if (this._header.nodeType === Node.TEXT_NODE) {
      Common.Console.Console.instance().error('Broken formatter: header should be an element node.');
      return;
    }

    if (customPreview.bodyGetterId) {
      if (this._header instanceof Element) {
        this._header.classList.add('custom-expandable-section-header');
      }
      this._header.addEventListener('click', this._onClick.bind(this), false);
      this._expandIcon = UI.Icon.Icon.create('smallicon-triangle-right', 'custom-expand-icon');
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
    if (!Array.isArray(jsonML)) {
      return document.createTextNode(String(jsonML));
    }

    const array = /** @type {!Array.<*>} */ (jsonML);
    return array[0] === 'object' ? this._layoutObjectTag(array) : this._renderElement(array);
  }

  /**
   *
   * @param {!Array.<*>} object
   * @return {!Node}
   */
  _renderElement(object) {
    const tagName = object.shift();
    if (!CustomPreviewSection._allowedTags.has(tagName)) {
      Common.Console.Console.instance().error('Broken formatter: element ' + tagName + ' is not allowed!');
      return document.createElement('span');
    }
    const element = document.createElement(/** @type {string} */ (tagName));
    if ((typeof object[0] === 'object') && !Array.isArray(object[0])) {
      const attributes = object.shift();
      for (const key in attributes) {
        const value = attributes[key];
        if ((key !== 'style') || (typeof value !== 'string')) {
          continue;
        }

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
    const attributes = objectTag.shift();
    const remoteObject = this._object.runtimeModel().createRemoteObject(
        /** @type {!Protocol.Runtime.RemoteObject} */ (attributes));
    if (remoteObject.customPreview()) {
      return (new CustomPreviewSection(remoteObject)).element();
    }

    const sectionElement = ObjectPropertiesSection.defaultObjectPresentation(remoteObject);
    sectionElement.classList.toggle('custom-expandable-section-standard-section', remoteObject.hasChildren);
    return sectionElement;
  }

  /**
   * @param {!Node} parentElement
   * @param {!Array.<*>} jsonMLTags
   */
  _appendJsonMLTags(parentElement, jsonMLTags) {
    for (let i = 0; i < jsonMLTags.length; ++i) {
      parentElement.appendChild(this._renderJSONMLTag(jsonMLTags[i]));
    }
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    event.consume(true);
    if (this._cachedContent) {
      this._toggleExpand();
    } else {
      this._loadBody();
    }
  }

  _toggleExpand() {
    this._expanded = !this._expanded;
    if (this._header instanceof Element) {
      this._header.classList.toggle('expanded', this._expanded);
    }
    if (this._cachedContent instanceof Element) {
      this._cachedContent.classList.toggle('hidden', !this._expanded);
    }
    if (this._expandIcon) {
      if (this._expanded) {
        this._expandIcon.setIconType('smallicon-triangle-down');
      } else {
        this._expandIcon.setIconType('smallicon-triangle-right');
      }
    }
  }

  async _loadBody() {
    const customPreview = this._object.customPreview();

    if (!customPreview) {
      return;
    }

    if (customPreview.bodyGetterId) {
      const bodyJsonML = await this._object.callFunctionJSON(
          bodyGetter => /** @type {function():*} */ (bodyGetter)(), [{objectId: customPreview.bodyGetterId}]);
      if (!bodyJsonML) {
        return;
      }

      this._cachedContent = this._renderJSONMLTag(bodyJsonML);
      this._sectionElement.appendChild(this._cachedContent);
      this._toggleExpand();
    }
  }
}

export class CustomPreviewComponent {
  /**
   * @param {!SDK.RemoteObject.RemoteObject} object
   */
  constructor(object) {
    this._object = object;
    /** @type {?CustomPreviewSection} */
    this._customPreviewSection = new CustomPreviewSection(object);
    this.element = document.createElement('span');
    this.element.classList.add('source-code');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        this.element,
        {cssFile: 'object_ui/customPreviewComponent.css', enableLegacyPatching: false, delegatesFocus: undefined});
    this.element.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);
    shadowRoot.appendChild(this._customPreviewSection.element());
  }

  expandIfPossible() {
    const customPreview = this._object.customPreview();
    if (customPreview && customPreview.bodyGetterId && this._customPreviewSection) {
      this._customPreviewSection._loadBody();
    }
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (this._customPreviewSection) {
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.showAsJavascriptObject), this._disassemble.bind(this));
    }
    contextMenu.appendApplicableItems(this._object);
    contextMenu.show();
  }

  _disassemble() {
    if (this.element.shadowRoot) {
      this.element.shadowRoot.textContent = '';
      this._customPreviewSection = null;
      this.element.shadowRoot.appendChild(ObjectPropertiesSection.defaultObjectPresentation(this._object));
    }
  }
}

CustomPreviewSection._allowedTags = new Set(['span', 'div', 'ol', 'li', 'table', 'tr', 'td']);
