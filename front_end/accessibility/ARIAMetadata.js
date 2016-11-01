// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ARIAMetadata = class {
  /**
   * @param {?Object} config
   */
  constructor(config) {
    /** @type {!Map<string, !WebInspector.ARIAMetadata.Attribute>} */
    this._attributes = new Map();

    if (config)
      this._initialize(config);
  }

  /**
   * @param {!Object} config
   */
  _initialize(config) {
    var attributes = config['attributes'];

    var booleanEnum = ['true', 'false'];
    for (var name in attributes) {
      var attributeConfig = attributes[name];
      if (attributeConfig.type === 'boolean')
        attributeConfig.enum = booleanEnum;
      this._attributes.set(name, new WebInspector.ARIAMetadata.Attribute(attributeConfig));
    }

    /** @type {!Array<string>} */
    this._roleNames = Object.keys(config['roles']);
  }

  /**
   * @param {string} property
   * @return {!Array<string>}
   */
  valuesForProperty(property) {
    if (this._attributes.has(property))
      return this._attributes.get(property).getEnum();

    if (property === 'role')
      return this._roleNames;

    return [];
  }
};

/**
 * @return {!WebInspector.ARIAMetadata}
 */
WebInspector.ariaMetadata = function() {
  if (!WebInspector.ARIAMetadata._instance)
    WebInspector.ARIAMetadata._instance = new WebInspector.ARIAMetadata(WebInspector.ARIAMetadata._config || null);
  return WebInspector.ARIAMetadata._instance;
};

/**
 * @unrestricted
 */
WebInspector.ARIAMetadata.Attribute = class {
  /**
   * @param {!Object} config
   */
  constructor(config) {
    /** @type {!Array<string>} */
    this._enum = [];

    if ('enum' in config)
      this._enum = config.enum;
  }

  /**
   * @return {!Array<string>}
   */
  getEnum() {
    return this._enum;
  }
};
