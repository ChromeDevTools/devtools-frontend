// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CoverageInfo, CoverageModel} from './CoverageModel.js';  // eslint-disable-line no-unused-vars

export const decoratorType = 'coverage';

export class CoverageDecorationManager {
  /**
   * @param {!CoverageModel} coverageModel
   */
  constructor(coverageModel) {
    this._coverageModel = coverageModel;
    /** @type {!Map<!Common.ContentProvider, ?TextUtils.Text>} */
    this._textByProvider = new Map();
    /** @type {!Platform.Multimap<!Common.ContentProvider, !Workspace.UISourceCode>} */
    this._uiSourceCodeByContentProvider = new Platform.Multimap();

    for (const uiSourceCode of Workspace.workspace.uiSourceCodes()) {
      uiSourceCode.addLineDecoration(0, decoratorType, this);
    }
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  reset() {
    for (const uiSourceCode of Workspace.workspace.uiSourceCodes()) {
      uiSourceCode.removeDecorationsForType(decoratorType);
    }
  }

  dispose() {
    this.reset();
    Workspace.workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  /**
   * @param {!Array<!CoverageInfo>} updatedEntries
   */
  update(updatedEntries) {
    for (const entry of updatedEntries) {
      for (const uiSourceCode of this._uiSourceCodeByContentProvider.get(entry.contentProvider())) {
        uiSourceCode.removeDecorationsForType(decoratorType);
        uiSourceCode.addLineDecoration(0, decoratorType, this);
      }
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<!Array<boolean>>}
   */
  async usageByLine(uiSourceCode) {
    const result = [];
    const {content} = await uiSourceCode.requestContent();
    if (!content) {
      return [];
    }
    const sourceText = new TextUtils.Text(/** @type {string} */ (content));
    await this._updateTexts(uiSourceCode, sourceText);
    const lineEndings = sourceText.lineEndings();
    for (let line = 0; line < sourceText.lineCount(); ++line) {
      const lineLength = lineEndings[line] - (line ? lineEndings[line - 1] : 0) - 1;
      if (!lineLength) {
        result.push(undefined);
        continue;
      }
      const startLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, 0);
      const endLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, lineLength);
      let used = undefined;
      for (let startIndex = 0, endIndex = 0; startIndex < startLocations.length; ++startIndex) {
        const start = startLocations[startIndex];
        while (endIndex < endLocations.length &&
               CoverageDecorationManager._compareLocations(start, endLocations[endIndex]) >= 0) {
          ++endIndex;
        }
        if (endIndex >= endLocations.length || endLocations[endIndex].id !== start.id) {
          continue;
        }
        const end = endLocations[endIndex++];
        const text = this._textByProvider.get(end.contentProvider);
        if (!text) {
          continue;
        }
        const textValue = text.value();
        let startOffset = Math.min(text.offsetFromPosition(start.line, start.column), textValue.length - 1);
        let endOffset = Math.min(text.offsetFromPosition(end.line, end.column), textValue.length - 1);
        while (startOffset <= endOffset && /\s/.test(textValue[startOffset])) {
          ++startOffset;
        }
        while (startOffset <= endOffset && /\s/.test(textValue[endOffset])) {
          --endOffset;
        }
        if (startOffset <= endOffset) {
          used = this._coverageModel.usageForRange(end.contentProvider, startOffset, endOffset);
        }
        if (used) {
          break;
        }
      }
      result.push(used);
    }
    return result;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextUtils.Text} text
   * @return {!Promise}
   */
  _updateTexts(uiSourceCode, text) {
    const promises = [];
    for (let line = 0; line < text.lineCount(); ++line) {
      for (const entry of this._rawLocationsForSourceLocation(uiSourceCode, line, 0)) {
        if (this._textByProvider.has(entry.contentProvider)) {
          continue;
        }
        this._textByProvider.set(entry.contentProvider, null);
        this._uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode);
        promises.push(this._updateTextForProvider(entry.contentProvider));
      }
    }
    return Promise.all(promises);
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @return {!Promise}
   */
  async _updateTextForProvider(contentProvider) {
    const {content} = await contentProvider.requestContent();
    this._textByProvider.set(contentProvider, new TextUtils.Text(content || ''));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} line
   * @param {number} column
   * @return {!Array<!Coverage.RawLocation>}
   */
  _rawLocationsForSourceLocation(uiSourceCode, line, column) {
    const result = [];
    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      let locations = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, line, column);
      locations = locations.filter(location => !!location.script());
      for (const location of locations) {
        const script = location.script();
        if (script.isInlineScript() && contentType.isDocument()) {
          location.lineNumber -= script.lineOffset;
          if (!location.lineNumber) {
            location.columnNumber -= script.columnOffset;
          }
        }
        result.push({
          id: `js:${location.scriptId}`,
          contentProvider: location.script(),
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    if (contentType.isStyleSheet() || contentType.isDocument()) {
      const rawStyleLocations =
          Bindings.cssWorkspaceBinding.uiLocationToRawLocations(new Workspace.UILocation(uiSourceCode, line, column));
      for (const location of rawStyleLocations) {
        const header = location.header();
        if (!header) {
          continue;
        }
        if (header.isInline && contentType.isDocument()) {
          location.lineNumber -= header.startLine;
          if (!location.lineNumber) {
            location.columnNumber -= header.startColumn;
          }
        }
        result.push({
          id: `css:${location.styleSheetId}`,
          contentProvider: location.header(),
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    return result.sort(CoverageDecorationManager._compareLocations);
  }

  /**
   * @param {!Coverage.RawLocation} a
   * @param {!Coverage.RawLocation} b
   */
  static _compareLocations(a, b) {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column;
  }

  /**
   * @param {!Common.Event} event
   */
  _onUISourceCodeAdded(event) {
    const uiSourceCode = /** @type !Workspace.UISourceCode */ (event.data);
    uiSourceCode.addLineDecoration(0, decoratorType, this);
  }
}
