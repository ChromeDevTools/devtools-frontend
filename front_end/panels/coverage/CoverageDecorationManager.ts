// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../../models/bindings/bindings.js';
import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

import type {CoverageInfo, CoverageModel} from './CoverageModel.js';

export const decoratorType = 'coverage';

export class CoverageDecorationManager {
  _coverageModel: CoverageModel;
  _textByProvider: Map<TextUtils.ContentProvider.ContentProvider, TextUtils.Text.Text|null>;
  _uiSourceCodeByContentProvider:
      Platform.MapUtilities.Multimap<TextUtils.ContentProvider.ContentProvider, Workspace.UISourceCode.UISourceCode>;

  constructor(coverageModel: CoverageModel) {
    this._coverageModel = coverageModel;
    this._textByProvider = new Map();
    this._uiSourceCodeByContentProvider = new Platform.MapUtilities.Multimap();

    for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
      uiSourceCode.addLineDecoration(0, decoratorType, this);
    }
    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  reset(): void {
    for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
      uiSourceCode.removeDecorationsForType(decoratorType);
    }
  }

  dispose(): void {
    this.reset();
    Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  update(updatedEntries: CoverageInfo[]): void {
    for (const entry of updatedEntries) {
      for (const uiSourceCode of this._uiSourceCodeByContentProvider.get(entry.contentProvider())) {
        uiSourceCode.removeDecorationsForType(decoratorType);
        uiSourceCode.addLineDecoration(0, decoratorType, this);
      }
    }
  }

  async usageByLine(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<(boolean | undefined)[]> {
    const result = [];
    const {content} = await uiSourceCode.requestContent();
    if (!content) {
      return [];
    }
    const sourceText = new TextUtils.Text.Text(content as string);
    await this._updateTexts(uiSourceCode, sourceText);
    const lineEndings = sourceText.lineEndings();
    for (let line = 0; line < sourceText.lineCount(); ++line) {
      const lineLength = lineEndings[line] - (line ? lineEndings[line - 1] : 0) - 1;
      if (!lineLength) {
        result.push(undefined);
        continue;
      }
      const startLocationsPromise = this._rawLocationsForSourceLocation(uiSourceCode, line, 0);
      const endLocationsPromise = this._rawLocationsForSourceLocation(uiSourceCode, line, lineLength);
      const [startLocations, endLocations] = await Promise.all([startLocationsPromise, endLocationsPromise]);
      let used: (boolean|undefined)|undefined = undefined;
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

  async _updateTexts(uiSourceCode: Workspace.UISourceCode.UISourceCode, text: TextUtils.Text.Text): Promise<void> {
    const promises = [];
    for (let line = 0; line < text.lineCount(); ++line) {
      for (const entry of await this._rawLocationsForSourceLocation(uiSourceCode, line, 0)) {
        if (this._textByProvider.has(entry.contentProvider)) {
          continue;
        }
        this._textByProvider.set(entry.contentProvider, null);
        this._uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode);
        promises.push(this._updateTextForProvider(entry.contentProvider));
      }
    }
    await Promise.all(promises);
  }

  async _updateTextForProvider(contentProvider: TextUtils.ContentProvider.ContentProvider): Promise<void> {
    const {content} = await contentProvider.requestContent();
    this._textByProvider.set(contentProvider, new TextUtils.Text.Text(content || ''));
  }

  async _rawLocationsForSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode, line: number, column: number):
      Promise<RawLocation[]> {
    const result: RawLocation[] = [];
    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      let locations =
          await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
              uiSourceCode, line, column);
      locations = locations.filter(location => Boolean(location.script()));
      for (const location of locations) {
        const script = location.script();
        if (!script) {
          continue;
        }
        if (script.isInlineScript() && contentType.isDocument()) {
          location.lineNumber -= script.lineOffset;
          if (!location.lineNumber) {
            location.columnNumber -= script.columnOffset;
          }
        }
        result.push({
          id: `js:${location.scriptId}`,
          contentProvider: script,
          line: location.lineNumber,
          column: location.columnNumber,
        });
      }
    }
    if (contentType.isStyleSheet() || contentType.isDocument()) {
      const rawStyleLocations = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().uiLocationToRawLocations(
          new Workspace.UISourceCode.UILocation(uiSourceCode, line, column));
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
          contentProvider: header,
          line: location.lineNumber,
          column: location.columnNumber,
        });
      }
    }
    return result.sort(CoverageDecorationManager._compareLocations);
  }

  static _compareLocations(a: RawLocation, b: RawLocation): number {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column;
  }

  _onUISourceCodeAdded(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = event.data as Workspace.UISourceCode.UISourceCode;
    uiSourceCode.addLineDecoration(0, decoratorType, this);
  }
}
export interface RawLocation {
  id: string;
  contentProvider: TextUtils.ContentProvider.ContentProvider;
  line: number;
  column: number;
}
