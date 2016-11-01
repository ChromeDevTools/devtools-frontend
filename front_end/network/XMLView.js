// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.Searchable}
 * @unrestricted
 */
WebInspector.XMLView = class extends WebInspector.Widget {
  /**
   * @param {!Document} parsedXML
   */
  constructor(parsedXML) {
    super(true);
    this.registerRequiredCSS('network/xmlView.css');
    this.contentElement.classList.add('shadow-xml-view', 'source-code');
    this._treeOutline = new TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('network/xmlTree.css');
    this.contentElement.appendChild(this._treeOutline.element);

    /** @type {?WebInspector.SearchableView} */
    this._searchableView;
    /** @type {number} */
    this._currentSearchFocusIndex = 0;
    /** @type {!Array.<!TreeElement>} */
    this._currentSearchTreeElements = [];
    /** @type {?WebInspector.SearchableView.SearchConfig} */
    this._searchConfig;

    WebInspector.XMLView.Node.populate(this._treeOutline, parsedXML, this);
  }

  /**
   * @param {!Document} parsedXML
   * @return {!WebInspector.SearchableView}
   */
  static createSearchableView(parsedXML) {
    var xmlView = new WebInspector.XMLView(parsedXML);
    var searchableView = new WebInspector.SearchableView(xmlView);
    searchableView.setPlaceholder(WebInspector.UIString('Find'));
    xmlView._searchableView = searchableView;
    xmlView.show(searchableView.element);
    xmlView.contentElement.setAttribute('tabIndex', 0);
    return searchableView;
  }

  /**
   * @param {string} text
   * @param {string} mimeType
   * @return {?Document}
   */
  static parseXML(text, mimeType) {
    var parsedXML;
    try {
      parsedXML = (new DOMParser()).parseFromString(text, mimeType);
    } catch (e) {
      return null;
    }
    if (parsedXML.body)
      return null;
    return parsedXML;
  }

  /**
   * @param {number} index
   * @param {boolean} shouldJump
   */
  _jumpToMatch(index, shouldJump) {
    if (!this._searchConfig)
      return;
    var regex = this._searchConfig.toSearchRegex(true);
    var previousFocusElement = this._currentSearchTreeElements[this._currentSearchFocusIndex];
    if (previousFocusElement)
      previousFocusElement.setSearchRegex(regex);

    var newFocusElement = this._currentSearchTreeElements[index];
    if (newFocusElement) {
      this._updateSearchIndex(index);
      if (shouldJump)
        newFocusElement.reveal(true);
      newFocusElement.setSearchRegex(regex, WebInspector.highlightedCurrentSearchResultClassName);
    } else {
      this._updateSearchIndex(0);
    }
  }

  /**
   * @param {number} count
   */
  _updateSearchCount(count) {
    if (!this._searchableView)
      return;
    this._searchableView.updateSearchMatchesCount(count);
  }

  /**
   * @param {number} index
   */
  _updateSearchIndex(index) {
    this._currentSearchFocusIndex = index;
    if (!this._searchableView)
      return;
    this._searchableView.updateCurrentMatchIndex(index);
  }

  /**
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  _innerPerformSearch(shouldJump, jumpBackwards) {
    if (!this._searchConfig)
      return;
    var newIndex = this._currentSearchFocusIndex;
    var previousSearchFocusElement = this._currentSearchTreeElements[newIndex];
    this._innerSearchCanceled();
    this._currentSearchTreeElements = [];
    var regex = this._searchConfig.toSearchRegex(true);

    for (var element = this._treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof WebInspector.XMLView.Node))
        continue;
      var hasMatch = element.setSearchRegex(regex);
      if (hasMatch)
        this._currentSearchTreeElements.push(element);
      if (previousSearchFocusElement === element) {
        var currentIndex = this._currentSearchTreeElements.length - 1;
        if (hasMatch || jumpBackwards)
          newIndex = currentIndex;
        else
          newIndex = currentIndex + 1;
      }
    }
    this._updateSearchCount(this._currentSearchTreeElements.length);

    if (!this._currentSearchTreeElements.length) {
      this._updateSearchIndex(0);
      return;
    }
    newIndex = mod(newIndex, this._currentSearchTreeElements.length);

    this._jumpToMatch(newIndex, shouldJump);
  }

  _innerSearchCanceled() {
    for (var element = this._treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof WebInspector.XMLView.Node))
        continue;
      element.revertHighlightChanges();
    }
    this._updateSearchCount(0);
    this._updateSearchIndex(0);
  }

  /**
   * @override
   */
  searchCanceled() {
    this._searchConfig = null;
    this._currentSearchTreeElements = [];
    this._innerSearchCanceled();
  }

  /**
   * @override
   * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this._searchConfig = searchConfig;
    this._innerPerformSearch(shouldJump, jumpBackwards);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._currentSearchTreeElements.length)
      return;

    var newIndex = mod(this._currentSearchFocusIndex + 1, this._currentSearchTreeElements.length);
    this._jumpToMatch(newIndex, true);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._currentSearchTreeElements.length)
      return;

    var newIndex = mod(this._currentSearchFocusIndex - 1, this._currentSearchTreeElements.length);
    this._jumpToMatch(newIndex, true);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }
};


/**
 * @unrestricted
 */
WebInspector.XMLView.Node = class extends TreeElement {
  /**
   * @param {!Node} node
   * @param {boolean} closeTag
   * @param {!WebInspector.XMLView} xmlView
   */
  constructor(node, closeTag, xmlView) {
    super('', !closeTag && !!node.childElementCount);
    this._node = node;
    this._closeTag = closeTag;
    this.selectable = false;
    /** @type {!Array.<!Object>} */
    this._highlightChanges = [];
    this._xmlView = xmlView;
    this._updateTitle();
  }

  /**
   * @param {!TreeOutline|!TreeElement} root
   * @param {!Node} xmlNode
   * @param {!WebInspector.XMLView} xmlView
   */
  static populate(root, xmlNode, xmlView) {
    var node = xmlNode.firstChild;
    while (node) {
      var currentNode = node;
      node = node.nextSibling;
      var nodeType = currentNode.nodeType;
      // ignore empty TEXT
      if (nodeType === 3 && currentNode.nodeValue.match(/\s+/))
        continue;
      // ignore ATTRIBUTE, ENTITY_REFERENCE, ENTITY, DOCUMENT, DOCUMENT_TYPE, DOCUMENT_FRAGMENT, NOTATION
      if ((nodeType !== 1) && (nodeType !== 3) && (nodeType !== 4) && (nodeType !== 7) && (nodeType !== 8))
        continue;
      root.appendChild(new WebInspector.XMLView.Node(currentNode, false, xmlView));
    }
  }

  /**
   * @param {?RegExp} regex
   * @param {string=} additionalCssClassName
   * @return {boolean}
   */
  setSearchRegex(regex, additionalCssClassName) {
    this.revertHighlightChanges();
    if (!regex)
      return false;
    if (this._closeTag && this.parent && !this.parent.expanded)
      return false;
    regex.lastIndex = 0;
    var cssClasses = WebInspector.highlightedSearchResultClassName;
    if (additionalCssClassName)
      cssClasses += ' ' + additionalCssClassName;
    var content = this.listItemElement.textContent.replace(/\xA0/g, ' ');
    var match = regex.exec(content);
    var ranges = [];
    while (match) {
      ranges.push(new WebInspector.SourceRange(match.index, match[0].length));
      match = regex.exec(content);
    }
    if (ranges.length)
      WebInspector.highlightRangesWithStyleClass(this.listItemElement, ranges, cssClasses, this._highlightChanges);
    return !!this._highlightChanges.length;
  }

  revertHighlightChanges() {
    WebInspector.revertDomChanges(this._highlightChanges);
    this._highlightChanges = [];
  }

  _updateTitle() {
    var node = this._node;
    switch (node.nodeType) {
      case 1:  // ELEMENT
        var tag = node.tagName;
        if (this._closeTag) {
          this._setTitle(['</' + tag + '>', 'shadow-xml-view-tag']);
          return;
        }
        var titleItems = ['<' + tag, 'shadow-xml-view-tag'];
        var attributes = node.attributes;
        for (var i = 0; i < attributes.length; ++i) {
          var attributeNode = attributes.item(i);
          titleItems.push(
              '\u00a0', 'shadow-xml-view-tag', attributeNode.name, 'shadow-xml-view-attribute-name', '="',
              'shadow-xml-view-tag', attributeNode.value, 'shadow-xml-view-attribute-value', '"',
              'shadow-xml-view-tag');
        }
        if (!this.expanded) {
          if (node.childElementCount) {
            titleItems.push(
                '>', 'shadow-xml-view-tag', '\u2026', 'shadow-xml-view-comment', '</' + tag, 'shadow-xml-view-tag');
          } else if (this._node.textContent) {
            titleItems.push(
                '>', 'shadow-xml-view-tag', node.textContent, 'shadow-xml-view-text', '</' + tag,
                'shadow-xml-view-tag');
          } else {
            titleItems.push(' /', 'shadow-xml-view-tag');
          }
        }
        titleItems.push('>', 'shadow-xml-view-tag');
        this._setTitle(titleItems);
        return;
      case 3:  // TEXT
        this._setTitle([node.nodeValue, 'shadow-xml-view-text']);
        return;
      case 4:  // CDATA
        this._setTitle([
          '<![CDATA[', 'shadow-xml-view-cdata', node.nodeValue, 'shadow-xml-view-text', ']]>', 'shadow-xml-view-cdata'
        ]);
        return;
      case 7:  // PROCESSING_INSTRUCTION
        this._setTitle(['<?' + node.nodeName + ' ' + node.nodeValue + '?>', 'shadow-xml-view-processing-instruction']);
        return;
      case 8:  // COMMENT
        this._setTitle(['<!--' + node.nodeValue + '-->', 'shadow-xml-view-comment']);
        return;
    }
  }

  /**
   * @param {!Array.<string>} items
   */
  _setTitle(items) {
    var titleFragment = createDocumentFragment();
    for (var i = 0; i < items.length; i += 2)
      titleFragment.createChild('span', items[i + 1]).textContent = items[i];
    this.title = titleFragment;
    this._xmlView._innerPerformSearch(false, false);
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.toggle('shadow-xml-view-close-tag', this._closeTag);
  }

  /**
   * @override
   */
  onexpand() {
    this._updateTitle();
  }

  /**
   * @override
   */
  oncollapse() {
    this._updateTitle();
  }

  /**
   * @override
   */
  onpopulate() {
    WebInspector.XMLView.Node.populate(this, this._node, this._xmlView);
    this.appendChild(new WebInspector.XMLView.Node(this._node, true, this._xmlView));
  }
};
