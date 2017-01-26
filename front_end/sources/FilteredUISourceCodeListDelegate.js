/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
Sources.FilteredUISourceCodeListDelegate = class extends QuickOpen.FilteredListWidget.Delegate {
  /**
   * @param {!Map.<!Workspace.UISourceCode, number>=} defaultScores
   */
  constructor(defaultScores) {
    super();

    this._defaultScores = defaultScores;
    this._scorer = new Sources.FilePathScoreFunction('');
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _projectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    this.populate(project);
    this.refresh();
  }

  /**
   * @protected
   * @param {!Workspace.Project=} skipProject
   */
  populate(skipProject) {
    /** @type {!Array.<!Workspace.UISourceCode>} */
    this._uiSourceCodes = [];
    var projects = Workspace.workspace.projects().filter(this.filterProject.bind(this));
    for (var i = 0; i < projects.length; ++i) {
      if (skipProject && projects[i] === skipProject)
        continue;
      var uiSourceCodes = projects[i].uiSourceCodes().filter(this._filterUISourceCode.bind(this));
      this._uiSourceCodes = this._uiSourceCodes.concat(uiSourceCodes);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  _filterUISourceCode(uiSourceCode) {
    var binding = Persistence.persistence.binding(uiSourceCode);
    return !binding || binding.fileSystem === uiSourceCode;
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    // Overridden by subclasses
  }

  /**
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  filterProject(project) {
    return true;
    // Overridden by subclasses
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._uiSourceCodes.length;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @return {string}
   */
  itemKeyAt(itemIndex) {
    return this._uiSourceCodes[itemIndex].url();
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @return {number}
   */
  itemScoreAt(itemIndex, query) {
    var uiSourceCode = this._uiSourceCodes[itemIndex];
    var score = this._defaultScores ? (this._defaultScores.get(uiSourceCode) || 0) : 0;
    if (!query || query.length < 2)
      return score;

    if (this._query !== query) {
      this._query = query;
      this._scorer = new Sources.FilePathScoreFunction(query);
    }

    var fullDisplayName = uiSourceCode.fullDisplayName();
    return score + 10 * this._scorer.score(fullDisplayName, null);
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @param {!Element} titleElement
   * @param {!Element} subtitleElement
   */
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    query = this.rewriteQuery(query);
    var uiSourceCode = this._uiSourceCodes[itemIndex];
    var fullDisplayName = uiSourceCode.fullDisplayName();
    var indexes = [];
    new Sources.FilePathScoreFunction(query).score(fullDisplayName, indexes);
    var fileNameIndex = fullDisplayName.lastIndexOf('/');

    titleElement.textContent = uiSourceCode.displayName() + (this._queryLineNumberAndColumnNumber || '');
    this._renderSubtitleElement(subtitleElement, fullDisplayName);
    subtitleElement.title = fullDisplayName;
    var ranges = [];
    for (var i = 0; i < indexes.length; ++i)
      ranges.push({offset: indexes[i], length: 1});

    if (indexes[0] > fileNameIndex) {
      for (var i = 0; i < ranges.length; ++i)
        ranges[i].offset -= fileNameIndex + 1;
      UI.highlightRangesWithStyleClass(titleElement, ranges, 'highlight');
    } else {
      UI.highlightRangesWithStyleClass(subtitleElement, ranges, 'highlight');
    }
  }

  /**
   * @param {!Element} element
   * @param {string} text
   */
  _renderSubtitleElement(element, text) {
    element.removeChildren();
    var splitPosition = text.lastIndexOf('/');
    if (text.length > 55)
      splitPosition = text.length - 55;
    var first = element.createChild('div', 'first-part');
    first.textContent = text.substring(0, splitPosition);
    var second = element.createChild('div', 'second-part');
    second.textContent = text.substring(splitPosition);
    element.title = text;
  }

  /**
   * @override
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
    var parsedExpression = promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);
    if (!parsedExpression)
      return;

    var lineNumber;
    var columnNumber;
    if (parsedExpression[2])
      lineNumber = parseInt(parsedExpression[2].substr(1), 10) - 1;
    if (parsedExpression[3])
      columnNumber = parseInt(parsedExpression[3].substr(1), 10) - 1;
    var uiSourceCode = itemIndex !== null ? this._uiSourceCodes[itemIndex] : null;
    this.uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber);
  }

  /**
   * @override
   * @param {string} query
   * @return {string}
   */
  rewriteQuery(query) {
    query = query ? query.trim() : '';
    if (!query || query === ':')
      return '';
    var lineNumberMatch = query.match(/^([^:]+)((?::[^:]*){0,2})$/);
    this._queryLineNumberAndColumnNumber = lineNumberMatch ? lineNumberMatch[2] : '';
    return lineNumberMatch ? lineNumberMatch[1] : query;
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    if (!this._filterUISourceCode(uiSourceCode) || !this.filterProject(uiSourceCode.project()))
      return;
    this._uiSourceCodes.push(uiSourceCode);
    this.refresh();
  }

  /**
   * @override
   * @return {string}
   */
  notFoundText() {
    return Common.UIString('No files found');
  }

  /**
   * @override
   */
  dispose() {
    Workspace.workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    Workspace.workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
  }
};
