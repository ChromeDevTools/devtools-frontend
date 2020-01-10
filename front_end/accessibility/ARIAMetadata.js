// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class ARIAMetadata {
  /**
   * @param {?Object} config
   */
  constructor(config) {
    /** @type {!Map<string, !Accessibility.ARIAMetadata.Attribute>} */
    this._attributes = new Map();

    if (config) {
      this._initialize(config);
    }
  }

  /**
   * @param {!Object} config
   */
  _initialize(config) {
    const attributes = config['attributes'];

    const booleanEnum = ['true', 'false'];
    for (const attributeConfig of attributes) {
      if (attributeConfig.type === 'boolean') {
        attributeConfig.enum = booleanEnum;
      }
      this._attributes.set(attributeConfig.name, new Accessibility.ARIAMetadata.Attribute(attributeConfig));
    }

    /** @type {!Array<string>} */
    this._roleNames = config['roles'].map(roleConfig => roleConfig.name);
  }

  /**
   * @param {string} property
   * @return {!Array<string>}
   */
  valuesForProperty(property) {
    if (this._attributes.has(property)) {
      return this._attributes.get(property).getEnum();
    }

    if (property === 'role') {
      return this._roleNames;
    }

    return [];
  }
}

/**
 * @return {!Accessibility.ARIAMetadata}
 */
export function ariaMetadata() {
  if (!Accessibility.ARIAMetadata._instance) {
    Accessibility.ARIAMetadata._instance = new Accessibility.ARIAMetadata(Accessibility.ARIAMetadata._config || null);
  }
  return Accessibility.ARIAMetadata._instance;
}

/**
 * @unrestricted
 */
export class Attribute {
  /**
   * @param {!Object} config
   */
  constructor(config) {
    /** @type {!Array<string>} */
    this._enum = [];

    if ('enum' in config) {
      this._enum = config.enum;
    }
  }

  /**
   * @return {!Array<string>}
   */
  getEnum() {
    return this._enum;
  }
}

/* Legacy exported object */
self.Accessibility = self.Accessibility || {};

/* Legacy exported object */
Accessibility = Accessibility || {};

/**
 * @constructor
 */
Accessibility.ARIAMetadata = ARIAMetadata;

/**
 * @unrestricted
 * @constructor
 */
Accessibility.ARIAMetadata.Attribute = Attribute;

/**
 * @return {!Accessibility.ARIAMetadata}
 */
Accessibility.ariaMetadata = ariaMetadata;
