// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {HTMLSpanElement}
 */
WebInspector.Icon = class extends HTMLSpanElement {
  constructor() {
    super();
    throw new Error('icon must be created via factory method.');
  }

  /**
   * @param {string=} iconType
   * @param {string=} className
   * @return {!WebInspector.Icon}
   */
  static create(iconType, className) {
    if (!WebInspector.Icon._constructor)
      WebInspector.Icon._constructor = registerCustomElement('span', 'ui-icon', WebInspector.Icon.prototype);

    var icon = /** @type {!WebInspector.Icon} */ (new WebInspector.Icon._constructor());
    if (className)
      icon.className = className;
    if (iconType)
      icon.setIconType(iconType);
    return icon;
  }

  /**
   * @override
   */
  createdCallback() {
    /** @type {?WebInspector.Icon.Descriptor} */
    this._descriptor = null;
    /** @type {string} */
    this._iconType = '';
  }

  /**
   * @param {string} iconType
   */
  setIconType(iconType) {
    if (this._descriptor) {
      this.style.removeProperty(this._propertyName());
      this.style.removeProperty('width');
      this.style.removeProperty('height');
      this.classList.remove(this._spritesheetClass());
      this.classList.remove(this._iconType);
      this._iconType = '';
      this._descriptor = null;
    }
    var descriptor = WebInspector.Icon.Descriptors[iconType] || null;
    if (descriptor) {
      this._iconType = iconType;
      this._descriptor = descriptor;
      this.style.setProperty(this._propertyName(), this._propertyValue());
      this.style.setProperty('width', this._descriptor.width + 'px');
      this.style.setProperty('height', this._descriptor.height + 'px');
      this.classList.add(this._spritesheetClass());
      this.classList.add(this._iconType);
    } else if (iconType) {
      throw new Error(`ERROR: failed to find icon descriptor for type: ${iconType}`);
    }
  }

  /**
   * @return {string}
   */
  _spritesheetClass() {
    return 'spritesheet-' + this._descriptor.spritesheet + (this._descriptor.isMask ? '-mask' : '');
  }

  /**
   * @return {string}
   */
  _propertyName() {
    return this._descriptor.isMask ? '-webkit-mask-position' : 'background-position';
  }

  /**
   * @return {string}
   */
  _propertyValue() {
    return `${this._descriptor.x}px ${this._descriptor.y}px`;
  }
};

/** @typedef {{x: number, y: number, width: number, height: number, spritesheet: string, isMask: (boolean|undefined)}} */
WebInspector.Icon.Descriptor;

/** @enum {!WebInspector.Icon.Descriptor} */
WebInspector.Icon.Descriptors = {
  'smallicon-error': {x: -20, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-revoked-error': {x: -40, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-warning': {x: -60, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-info': {x: -80, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-device': {x: -100, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-red-ball': {x: -120, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-ball': {x: -140, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-orange-ball': {x: -160, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-right-arrow': {x: -180, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-user-command': {x: 0, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-text-prompt': {x: -20, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-command-result': {x: -40, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-shadow-mask': {x: -60, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-bezier-mask': {x: -80, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
};
