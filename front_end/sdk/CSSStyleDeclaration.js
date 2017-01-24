// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
SDK.CSSStyleDeclaration = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {?SDK.CSSRule} parentRule
   * @param {!Protocol.CSS.CSSStyle} payload
   * @param {!SDK.CSSStyleDeclaration.Type} type
   */
  constructor(cssModel, parentRule, payload, type) {
    this._cssModel = cssModel;
    this.parentRule = parentRule;
    /** @type {!Array<!SDK.CSSProperty>} */
    this._allProperties;
    /** @type {string|undefined} */
    this.styleSheetId;
    /** @type {?Common.TextRange} */
    this.range;
    /** @type {string|undefined} */
    this.cssText;
    /** @type {!Map<string, string>} */
    this._shorthandValues;
    /** @type {!Set<string>} */
    this._shorthandIsImportant;
    /** @type {!Map<string, !SDK.CSSProperty>} */
    this._activePropertyMap;
    /** @type {?Array<!SDK.CSSProperty>} */
    this._leadingProperties;
    this._reinitialize(payload);
    this.type = type;
  }

  /**
   * @param {!SDK.CSSModel.Edit} edit
   */
  rebase(edit) {
    if (this.styleSheetId !== edit.styleSheetId || !this.range)
      return;
    if (edit.oldRange.equal(this.range)) {
      this._reinitialize(/** @type {!Protocol.CSS.CSSStyle} */ (edit.payload));
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
      for (var i = 0; i < this._allProperties.length; ++i)
        this._allProperties[i].rebase(edit);
    }
  }

  /**
   * @param {!Protocol.CSS.CSSStyle} payload
   */
  _reinitialize(payload) {
    this.styleSheetId = payload.styleSheetId;
    this.range = payload.range ? Common.TextRange.fromObject(payload.range) : null;

    var shorthandEntries = payload.shorthandEntries;
    this._shorthandValues = new Map();
    this._shorthandIsImportant = new Set();
    for (var i = 0; i < shorthandEntries.length; ++i) {
      this._shorthandValues.set(shorthandEntries[i].name, shorthandEntries[i].value);
      if (shorthandEntries[i].important)
        this._shorthandIsImportant.add(shorthandEntries[i].name);
    }

    this._allProperties = [];
    for (var i = 0; i < payload.cssProperties.length; ++i) {
      var property = SDK.CSSProperty.parsePayload(this, i, payload.cssProperties[i]);
      this._allProperties.push(property);
    }

    this._generateSyntheticPropertiesIfNeeded();
    this._computeInactiveProperties();

    this._activePropertyMap = new Map();
    for (var property of this._allProperties) {
      if (!property.activeInStyle())
        continue;
      this._activePropertyMap.set(property.name, property);
    }

    this.cssText = payload.cssText;
    this._leadingProperties = null;
  }

  _generateSyntheticPropertiesIfNeeded() {
    if (this.range)
      return;

    if (!this._shorthandValues.size)
      return;

    var propertiesSet = new Set();
    for (var property of this._allProperties)
      propertiesSet.add(property.name);

    var generatedProperties = [];
    // For style-based properties, generate shorthands with values when possible.
    for (var property of this._allProperties) {
      // For style-based properties, try generating shorthands.
      var shorthands = SDK.cssMetadata().shorthands(property.name) || [];
      for (var shorthand of shorthands) {
        if (propertiesSet.has(shorthand))
          continue;  // There already is a shorthand this longhands falls under.
        var shorthandValue = this._shorthandValues.get(shorthand);
        if (!shorthandValue)
          continue;  // Never generate synthetic shorthands when no value is available.

        // Generate synthetic shorthand we have a value for.
        var shorthandImportance = !!this._shorthandIsImportant.has(shorthand);
        var shorthandProperty = new SDK.CSSProperty(
            this, this.allProperties().length, shorthand, shorthandValue, shorthandImportance, false, true, false);
        generatedProperties.push(shorthandProperty);
        propertiesSet.add(shorthand);
      }
    }
    this._allProperties = this._allProperties.concat(generatedProperties);
  }

  /**
   * @return {!Array.<!SDK.CSSProperty>}
   */
  _computeLeadingProperties() {
    /**
     * @param {!SDK.CSSProperty} property
     * @return {boolean}
     */
    function propertyHasRange(property) {
      return !!property.range;
    }

    if (this.range)
      return this._allProperties.filter(propertyHasRange);

    var leadingProperties = [];
    for (var property of this._allProperties) {
      var shorthands = SDK.cssMetadata().shorthands(property.name) || [];
      var belongToAnyShorthand = false;
      for (var shorthand of shorthands) {
        if (this._shorthandValues.get(shorthand)) {
          belongToAnyShorthand = true;
          break;
        }
      }
      if (!belongToAnyShorthand)
        leadingProperties.push(property);
    }

    return leadingProperties;
  }

  /**
   * @return {!Array.<!SDK.CSSProperty>}
   */
  leadingProperties() {
    if (!this._leadingProperties)
      this._leadingProperties = this._computeLeadingProperties();
    return this._leadingProperties;
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._cssModel.target();
  }

  /**
   * @return {!SDK.CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  _computeInactiveProperties() {
    var activeProperties = {};
    for (var i = 0; i < this._allProperties.length; ++i) {
      var property = this._allProperties[i];
      if (property.disabled || !property.parsedOk) {
        property.setActive(false);
        continue;
      }
      var canonicalName = SDK.cssMetadata().canonicalPropertyName(property.name);
      var activeProperty = activeProperties[canonicalName];
      if (!activeProperty) {
        activeProperties[canonicalName] = property;
      } else if (!activeProperty.important || property.important) {
        activeProperty.setActive(false);
        activeProperties[canonicalName] = property;
      } else {
        property.setActive(false);
      }
    }
  }

  /**
   * @return {!Array<!SDK.CSSProperty>}
   */
  allProperties() {
    return this._allProperties;
  }

  /**
   * @param {string} name
   * @return {string}
   */
  getPropertyValue(name) {
    var property = this._activePropertyMap.get(name);
    return property ? property.value : '';
  }

  /**
   * @param {string} name
   * @return {boolean}
   */
  isPropertyImplicit(name) {
    var property = this._activePropertyMap.get(name);
    return property ? property.implicit : false;
  }

  /**
   * @param {string} name
   * @return {!Array.<!SDK.CSSProperty>}
   */
  longhandProperties(name) {
    var longhands = SDK.cssMetadata().longhands(name);
    var result = [];
    for (var i = 0; longhands && i < longhands.length; ++i) {
      var property = this._activePropertyMap.get(longhands[i]);
      if (property)
        result.push(property);
    }
    return result;
  }

  /**
   * @param {number} index
   * @return {?SDK.CSSProperty}
   */
  propertyAt(index) {
    return (index < this.allProperties().length) ? this.allProperties()[index] : null;
  }

  /**
   * @return {number}
   */
  pastLastSourcePropertyIndex() {
    for (var i = this.allProperties().length - 1; i >= 0; --i) {
      if (this.allProperties()[i].range)
        return i + 1;
    }
    return 0;
  }

  /**
   * @param {number} index
   * @return {!Common.TextRange}
   */
  _insertionRange(index) {
    var property = this.propertyAt(index);
    return property && property.range ? property.range.collapseToStart() : this.range.collapseToEnd();
  }

  /**
   * @param {number=} index
   * @return {!SDK.CSSProperty}
   */
  newBlankProperty(index) {
    index = (typeof index === 'undefined') ? this.pastLastSourcePropertyIndex() : index;
    var property = new SDK.CSSProperty(this, index, '', '', false, false, true, false, '', this._insertionRange(index));
    return property;
  }

  /**
   * @param {string} text
   * @param {boolean} majorChange
   * @return {!Promise.<boolean>}
   */
  setText(text, majorChange) {
    if (!this.range || !this.styleSheetId)
      return Promise.resolve(false);
    return this._cssModel.setStyleText(this.styleSheetId, this.range, text, majorChange);
  }

  /**
   * @param {number} index
   * @param {string} name
   * @param {string} value
   * @param {function(boolean)=} userCallback
   */
  insertPropertyAt(index, name, value, userCallback) {
    this.newBlankProperty(index).setText(name + ': ' + value + ';', false, true).then(userCallback);
  }

  /**
   * @param {string} name
   * @param {string} value
   * @param {function(boolean)=} userCallback
   */
  appendProperty(name, value, userCallback) {
    this.insertPropertyAt(this.allProperties().length, name, value, userCallback);
  }
};

/** @enum {string} */
SDK.CSSStyleDeclaration.Type = {
  Regular: 'Regular',
  Inline: 'Inline',
  Attributes: 'Attributes'
};
