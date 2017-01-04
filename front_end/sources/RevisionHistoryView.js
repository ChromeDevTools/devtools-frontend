/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Sources.RevisionHistoryView = class extends UI.VBox {
  constructor() {
    super();
    this._uiSourceCodeItems = new Map();

    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('sources/revisionHistory.css');
    this._treeOutline.makeDense();
    this.element.appendChild(this._treeOutline.element);

    /**
     * @param {!Workspace.UISourceCode} uiSourceCode
     * @this {Sources.RevisionHistoryView}
     */
    function populateRevisions(uiSourceCode) {
      if (uiSourceCode.history().length)
        this._createUISourceCodeItem(uiSourceCode);
    }

    Workspace.workspace.uiSourceCodes().forEach(populateRevisions.bind(this));
    Workspace.workspace.addEventListener(
        Workspace.Workspace.Events.WorkingCopyCommittedByUser, this._revisionAdded, this);
    Workspace.workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  static showHistory(uiSourceCode) {
    UI.viewManager.showView('sources.history');
    var historyView =
        /** @type {!Sources.RevisionHistoryView} */ (self.runtime.sharedInstance(Sources.RevisionHistoryView));
    historyView._revealUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _createUISourceCodeItem(uiSourceCode) {
    var uiSourceCodeItem = new UI.TreeElement(uiSourceCode.displayName(), true);
    uiSourceCodeItem.selectable = false;

    // Insert in sorted order
    var rootElement = this._treeOutline.rootElement();
    for (var i = 0; i < rootElement.childCount(); ++i) {
      if (rootElement.childAt(i).title.localeCompare(uiSourceCode.displayName()) > 0) {
        rootElement.insertChild(uiSourceCodeItem, i);
        break;
      }
    }
    if (i === rootElement.childCount())
      rootElement.appendChild(uiSourceCodeItem);

    this._uiSourceCodeItems.set(uiSourceCode, uiSourceCodeItem);

    var history = uiSourceCode.history();
    var revisionCount = history.length;
    for (var i = revisionCount - 1; i >= 0; --i) {
      var revision = history[i];
      var historyItem = new Sources.RevisionHistoryTreeElement(revision, history[i - 1], i !== revisionCount - 1);
      uiSourceCodeItem.appendChild(historyItem);
    }

    var linkItem = new UI.TreeElement();
    linkItem.selectable = false;
    uiSourceCodeItem.appendChild(linkItem);

    var revertToOriginal =
        linkItem.listItemElement.createChild('span', 'revision-history-link revision-history-link-row');
    revertToOriginal.textContent = Common.UIString('apply original content');
    revertToOriginal.addEventListener('click', this._revertToOriginal.bind(this, uiSourceCode));

    var clearHistoryElement = uiSourceCodeItem.listItemElement.createChild('span', 'revision-history-link');
    clearHistoryElement.textContent = Common.UIString('revert');
    clearHistoryElement.addEventListener('click', this._clearHistory.bind(this, uiSourceCode));
    return uiSourceCodeItem;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _revertToOriginal(uiSourceCode) {
    uiSourceCode.revertToOriginal();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _clearHistory(uiSourceCode) {
    uiSourceCode.revertAndClearHistory(this._removeUISourceCode.bind(this));
  }

  _revisionAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
    if (!uiSourceCodeItem) {
      uiSourceCodeItem = this._createUISourceCodeItem(uiSourceCode);
      return;
    }

    var history = uiSourceCode.history();
    var historyItem =
        new Sources.RevisionHistoryTreeElement(history[history.length - 1], history[history.length - 2], false);
    if (uiSourceCodeItem.firstChild())
      uiSourceCodeItem.firstChild().allowRevert();
    uiSourceCodeItem.insertChild(historyItem, 0);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _revealUISourceCode(uiSourceCode) {
    var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
    if (uiSourceCodeItem) {
      uiSourceCodeItem.reveal();
      uiSourceCodeItem.expand();
    }
  }

  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._removeUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _removeUISourceCode(uiSourceCode) {
    var uiSourceCodeItem = this._uiSourceCodeItems.get(uiSourceCode);
    if (!uiSourceCodeItem)
      return;
    this._treeOutline.removeChild(uiSourceCodeItem);
    this._uiSourceCodeItems.remove(uiSourceCode);
  }

  _projectRemoved(event) {
    var project = event.data;
    project.uiSourceCodes().forEach(this._removeUISourceCode.bind(this));
  }
};


/**
 * @unrestricted
 */
Sources.RevisionHistoryTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Workspace.Revision} revision
   * @param {!Workspace.Revision} baseRevision
   * @param {boolean} allowRevert
   */
  constructor(revision, baseRevision, allowRevert) {
    super(revision.timestamp.toLocaleTimeString(), true);
    this.selectable = false;

    this._revision = revision;
    this._baseRevision = baseRevision;

    this._revertElement = createElement('span');
    this._revertElement.className = 'revision-history-link';
    this._revertElement.textContent = Common.UIString('apply revision content');
    this._revertElement.addEventListener('click', event => {
      this._revision.revertToThis();
    }, false);
    if (!allowRevert)
      this._revertElement.classList.add('hidden');
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.add('revision-history-revision');
  }

  /**
   * @override
   */
  onpopulate() {
    this.listItemElement.appendChild(this._revertElement);

    this.childrenListElement.classList.add('source-code');
    Promise
        .all([
          this._baseRevision ? this._baseRevision.requestContent() :
                               this._revision.uiSourceCode.requestOriginalContent(),
          this._revision.requestContent()
        ])
        .spread(diff.bind(this));

    /**
     * @param {?string} baseContent
     * @param {?string} newContent
     * @this {Sources.RevisionHistoryTreeElement}
     */
    function diff(baseContent, newContent) {
      var baseLines = baseContent.split('\n');
      var newLines = newContent.split('\n');
      var opcodes = Diff.Diff.lineDiff(baseLines, newLines);
      var lastWasSeparator = false;

      var baseLineNumber = 0;
      var newLineNumber = 0;
      for (var idx = 0; idx < opcodes.length; idx++) {
        var code = opcodes[idx][0];
        var rowCount = opcodes[idx][1].length;
        if (code === Diff.Diff.Operation.Equal) {
          baseLineNumber += rowCount;
          newLineNumber += rowCount;
          if (!lastWasSeparator)
            this._createLine(null, null, '    \u2026', 'separator');
          lastWasSeparator = true;
        } else if (code === Diff.Diff.Operation.Delete) {
          lastWasSeparator = false;
          for (var i = 0; i < rowCount; ++i)
            this._createLine(baseLineNumber + i, null, baseLines[baseLineNumber + i], 'removed');
          baseLineNumber += rowCount;
        } else if (code === Diff.Diff.Operation.Insert) {
          lastWasSeparator = false;
          for (var i = 0; i < rowCount; ++i)
            this._createLine(null, newLineNumber + i, newLines[newLineNumber + i], 'added');
          newLineNumber += rowCount;
        }
      }
    }
  }

  /**
   * @override
   */
  oncollapse() {
    this._revertElement.remove();
  }

  /**
   * @param {?number} baseLineNumber
   * @param {?number} newLineNumber
   * @param {string} lineContent
   * @param {string} changeType
   */
  _createLine(baseLineNumber, newLineNumber, lineContent, changeType) {
    var child = new UI.TreeElement();
    child.selectable = false;
    this.appendChild(child);

    function appendLineNumber(lineNumber) {
      var numberString = lineNumber !== null ? numberToStringWithSpacesPadding(lineNumber + 1, 4) : spacesPadding(4);
      var lineNumberSpan = createElement('span');
      lineNumberSpan.classList.add('webkit-line-number');
      lineNumberSpan.textContent = numberString;
      child.listItemElement.appendChild(lineNumberSpan);
    }

    appendLineNumber(baseLineNumber);
    appendLineNumber(newLineNumber);

    var contentSpan = createElement('span');
    contentSpan.textContent = lineContent;
    child.listItemElement.appendChild(contentSpan);
    child.listItemElement.classList.add('revision-history-line');
    contentSpan.classList.add('revision-history-line-' + changeType);
  }

  allowRevert() {
    this._revertElement.classList.remove('hidden');
  }
};
