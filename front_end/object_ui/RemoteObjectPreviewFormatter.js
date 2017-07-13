// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
ObjectUI.RemoteObjectPreviewFormatter = class {
  /**
   * @param {!Protocol.Runtime.PropertyPreview} a
   * @param {!Protocol.Runtime.PropertyPreview} b
   * @return {number}
   */
  static _objectPropertyComparator(a, b) {
    if (a.type !== 'function' && b.type === 'function')
      return -1;
    if (a.type === 'function' && b.type !== 'function')
      return 1;
    return 0;
  }

  /**
   * @param {!Element} parentElement
   * @param {!Protocol.Runtime.ObjectPreview} preview
   * @param {boolean} isEntry
   */
  appendObjectPreview(parentElement, preview, isEntry) {
    const previewExperimentEnabled = Runtime.experiments.isEnabled('objectPreviews');
    var description = preview.description;
    var subTypesWithoutValuePreview = new Set(['null', 'regexp', 'error', 'internal#entry']);
    if (preview.type !== 'object' || subTypesWithoutValuePreview.has(preview.subtype) ||
        (previewExperimentEnabled && isEntry)) {
      parentElement.appendChild(this.renderPropertyPreview(preview.type, preview.subtype, description));
      return;
    }
    const isArrayOrTypedArray = preview.subtype === 'array' || preview.subtype === 'typedarray';
    if (description) {
      var text;
      if (isArrayOrTypedArray) {
        var arrayLength = SDK.RemoteObject.arrayLength(preview);
        var arrayLengthText = arrayLength > 1 ? ('(' + arrayLength + ')') : '';
        var arrayName = preview.subtype === 'typedarray' ? SDK.RemoteObject.arrayNameFromDescription(description) : '';
        text = arrayName + arrayLengthText;
      } else {
        var hideDescription = previewExperimentEnabled && description === 'Object';
        text = hideDescription ? '' : description;
      }
      if (text.length > 0)
        parentElement.createChild('span', 'object-description').textContent = text + ' ';
    }

    var propertiesElement = parentElement.createChild('span', 'object-properties-preview source-code');
    propertiesElement.createTextChild(isArrayOrTypedArray ? '[' : '{');
    if (preview.entries)
      this._appendEntriesPreview(propertiesElement, preview);
    else if (isArrayOrTypedArray)
      this._appendArrayPropertiesPreview(propertiesElement, preview);
    else
      this._appendObjectPropertiesPreview(propertiesElement, preview);
    if (preview.overflow) {
      var ellipsisText = propertiesElement.textContent.length > 1 ? ',\u00a0\u2026' : '\u2026';
      propertiesElement.createChild('span').textContent = ellipsisText;
    }
    propertiesElement.createTextChild(isArrayOrTypedArray ? ']' : '}');
  }

  /**
   * @param {string} description
   * @return {string}
   */
  _abbreviateFullQualifiedClassName(description) {
    var abbreviatedDescription = description.split('.');
    for (var i = 0; i < abbreviatedDescription.length - 1; ++i)
      abbreviatedDescription[i] = abbreviatedDescription[i].trimMiddle(3);
    return abbreviatedDescription.join('.');
  }

  /**
   * @param {!Element} parentElement
   * @param {!Protocol.Runtime.ObjectPreview} preview
   */
  _appendObjectPropertiesPreview(parentElement, preview) {
    var properties = preview.properties.filter(p => p.type !== 'accessor')
                         .stableSort(ObjectUI.RemoteObjectPreviewFormatter._objectPropertyComparator);
    for (var i = 0; i < properties.length; ++i) {
      if (i > 0)
        parentElement.createTextChild(', ');

      var property = properties[i];
      parentElement.appendChild(this._renderDisplayName(property.name));
      parentElement.createTextChild(': ');
      parentElement.appendChild(this._renderPropertyPreviewOrAccessor([property]));
    }
  }

  /**
   * @param {!Element} parentElement
   * @param {!Protocol.Runtime.ObjectPreview} preview
   */
  _appendArrayPropertiesPreview(parentElement, preview) {
    var arrayLength = SDK.RemoteObject.arrayLength(preview);
    var indexProperties = preview.properties.filter(p => toArrayIndex(p.name) !== -1).stableSort(arrayEntryComparator);
    var otherProperties = preview.properties.filter(p => toArrayIndex(p.name) === -1)
                              .stableSort(ObjectUI.RemoteObjectPreviewFormatter._objectPropertyComparator);

    /**
     * @param {!Protocol.Runtime.PropertyPreview} a
     * @param {!Protocol.Runtime.PropertyPreview} b
     * @return {number}
     */
    function arrayEntryComparator(a, b) {
      return toArrayIndex(a.name) - toArrayIndex(b.name);
    }

    /**
     * @param {string} name
     * @return {number}
     */
    function toArrayIndex(name) {
      var index = name >>> 0;
      if (String(index) === name && index < arrayLength)
        return index;
      return -1;
    }

    // Gaps can be shown when all properties are guaranteed to be in the preview.
    var canShowGaps = !preview.overflow;
    var lastNonEmptyArrayIndex = -1;
    var elementsAdded = false;
    for (var i = 0; i < indexProperties.length; ++i) {
      if (elementsAdded)
        parentElement.createTextChild(', ');

      var property = indexProperties[i];
      var index = toArrayIndex(property.name);
      if (canShowGaps && index - lastNonEmptyArrayIndex > 1) {
        appendUndefined(index);
        parentElement.createTextChild(', ');
      }
      if (!canShowGaps && i !== index) {
        parentElement.appendChild(this._renderDisplayName(property.name));
        parentElement.createTextChild(': ');
      }
      parentElement.appendChild(this._renderPropertyPreviewOrAccessor([property]));
      lastNonEmptyArrayIndex = index;
      elementsAdded = true;
    }

    if (canShowGaps && arrayLength - lastNonEmptyArrayIndex > 1) {
      if (elementsAdded)
        parentElement.createTextChild(', ');
      appendUndefined(arrayLength);
    }

    for (var i = 0; i < otherProperties.length; ++i) {
      if (elementsAdded)
        parentElement.createTextChild(', ');

      var property = otherProperties[i];
      parentElement.appendChild(this._renderDisplayName(property.name));
      parentElement.createTextChild(': ');
      parentElement.appendChild(this._renderPropertyPreviewOrAccessor([property]));
      elementsAdded = true;
    }

    /**
     * @param {number} index
     */
    function appendUndefined(index) {
      var span = parentElement.createChild('span', 'object-value-undefined');
      span.textContent = Common.UIString('empty × %d', index - lastNonEmptyArrayIndex - 1);
      elementsAdded = true;
    }
  }

  /**
   * @param {!Element} parentElement
   * @param {!Protocol.Runtime.ObjectPreview} preview
   */
  _appendEntriesPreview(parentElement, preview) {
    for (var i = 0; i < preview.entries.length; ++i) {
      if (i > 0)
        parentElement.createTextChild(', ');

      var entry = preview.entries[i];
      if (entry.key) {
        this.appendObjectPreview(parentElement, entry.key, true /* isEntry */);
        parentElement.createTextChild(' => ');
      }
      this.appendObjectPreview(parentElement, entry.value, true /* isEntry */);
    }
  }

  /**
   * @param {string} name
   * @return {!Element}
   */
  _renderDisplayName(name) {
    var result = createElementWithClass('span', 'name');
    var needsQuotes = /^\s|\s$|^$|\n/.test(name);
    result.textContent = needsQuotes ? '"' + name.replace(/\n/g, '\u21B5') + '"' : name;
    return result;
  }

  /**
   * @param {!Array.<!Protocol.Runtime.PropertyPreview>} propertyPath
   * @return {!Element}
   */
  _renderPropertyPreviewOrAccessor(propertyPath) {
    var property = propertyPath.peekLast();
    return this.renderPropertyPreview(property.type, /** @type {string} */ (property.subtype), property.value);
  }

  /**
   * @param {string} type
   * @param {string=} subtype
   * @param {string=} description
   * @return {!Element}
   */
  renderPropertyPreview(type, subtype, description) {
    var span = createElementWithClass('span', 'object-value-' + (subtype || type));
    description = description || '';

    if (type === 'accessor') {
      span.textContent = '(...)';
      span.title = Common.UIString('The property is computed with a getter');
      return span;
    }

    if (type === 'function') {
      span.textContent = '\u0192';
      return span;
    }

    if (type === 'object' && subtype === 'node' && description) {
      Components.DOMPresentationUtils.createSpansForNodeTitle(span, description);
      return span;
    }

    if (type === 'string') {
      span.createTextChildren('"', description.replace(/\n/g, '\u21B5'), '"');
      return span;
    }

    if (type === 'object' && !subtype) {
      var preview = this._abbreviateFullQualifiedClassName(description);
      if (preview === 'Object')
        preview = '{\u2026}';
      span.textContent = preview;
      span.title = description;
      return span;
    }

    span.textContent = description;
    return span;
  }
};
