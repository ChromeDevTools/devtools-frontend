// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

import type {CoverageInfo, CoverageModel} from './CoverageModel.js';

export const decoratorType = 'coverage';

export class CoverageDecorationManager {
  private coverageModel: CoverageModel;
  private readonly textByProvider: Map<TextUtils.ContentProvider.ContentProvider, TextUtils.Text.Text|null>;
  private readonly uiSourceCodeByContentProvider:
      Platform.MapUtilities.Multimap<TextUtils.ContentProvider.ContentProvider, Workspace.UISourceCode.UISourceCode>;

  readonly #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly #debuggerBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  readonly #cssBinding: Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding;

  constructor(
      coverageModel: CoverageModel, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
      cssBinding: Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding) {
    this.coverageModel = coverageModel;
    this.#workspace = workspace;
    this.#debuggerBinding = debuggerBinding;
    this.#cssBinding = cssBinding;

    this.textByProvider = new Map();
    this.uiSourceCodeByContentProvider = new Platform.MapUtilities.Multimap();

    for (const uiSourceCode of this.#workspace.uiSourceCodes()) {
      uiSourceCode.setDecorationData(decoratorType, this);
    }
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.onUISourceCodeAdded, this);
  }

  reset(): void {
    for (const uiSourceCode of this.#workspace.uiSourceCodes()) {
      uiSourceCode.setDecorationData(decoratorType, undefined);
    }
  }

  dispose(): void {
    this.reset();
    this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.onUISourceCodeAdded, this);
  }

  update(updatedEntries: CoverageInfo[]): void {
    for (const entry of updatedEntries) {
      for (const uiSourceCode of this.uiSourceCodeByContentProvider.get(entry.getContentProvider())) {
        uiSourceCode.setDecorationData(decoratorType, this);
      }
    }
  }

  /**
   * Returns the coverage per line of the provided uiSourceCode. The resulting array has the same length
   * as the provided `lines` array.
   *
   * @param uiSourceCode The UISourceCode for which to get the coverage info.
   * @param lineMappings The caller might have applied formatting to the UISourceCode. Each entry
   *                     in this array represents one line and the range specifies where it's found in
   *                     the original content.
   */
  async usageByLine(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineMappings: TextUtils.TextRange.TextRange[]):
      Promise<(boolean | undefined)[]> {
    const result = [];
    await this.updateTexts(uiSourceCode, lineMappings);

    for (const {startLine, startColumn, endLine, endColumn} of lineMappings) {
      const startLocationsPromise = this.rawLocationsForSourceLocation(uiSourceCode, startLine, startColumn);
      const endLocationsPromise = this.rawLocationsForSourceLocation(uiSourceCode, endLine, endColumn);
      const [startLocations, endLocations] = await Promise.all([startLocationsPromise, endLocationsPromise]);
      let used: (boolean|undefined)|undefined = undefined;
      for (let startIndex = 0, endIndex = 0; startIndex < startLocations.length; ++startIndex) {
        const start = startLocations[startIndex];
        while (endIndex < endLocations.length &&
               CoverageDecorationManager.compareLocations(start, endLocations[endIndex]) >= 0) {
          ++endIndex;
        }
        if (endIndex >= endLocations.length || endLocations[endIndex].id !== start.id) {
          continue;
        }
        const end = endLocations[endIndex++];
        const text = this.textByProvider.get(end.contentProvider);
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
          used = this.coverageModel.usageForRange(end.contentProvider, startOffset, endOffset);
        }
        if (used) {
          break;
        }
      }
      result.push(used);
    }
    return result;
  }

  private async updateTexts(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineMappings: TextUtils.TextRange.TextRange[]): Promise<void> {
    const promises = [];
    for (const range of lineMappings) {
      for (const entry of await this.rawLocationsForSourceLocation(uiSourceCode, range.startLine, 0)) {
        if (this.textByProvider.has(entry.contentProvider)) {
          continue;
        }
        this.textByProvider.set(entry.contentProvider, null);
        this.uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode);
        promises.push(this.updateTextForProvider(entry.contentProvider));
      }
    }
    await Promise.all(promises);
  }

  private async updateTextForProvider(contentProvider: TextUtils.ContentProvider.ContentProvider): Promise<void> {
    const contentData =
        TextUtils.ContentData.ContentData.contentDataOrEmpty(await contentProvider.requestContentData());
    this.textByProvider.set(contentProvider, contentData.textObj);
  }

  private async rawLocationsForSourceLocation(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, line: number, column: number): Promise<RawLocation[]> {
    const result: RawLocation[] = [];
    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      let locations = await this.#debuggerBinding.uiLocationToRawLocations(uiSourceCode, line, column);
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
      const rawStyleLocations =
          this.#cssBinding.uiLocationToRawLocations(new Workspace.UISourceCode.UILocation(uiSourceCode, line, column));
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
    return result.sort(CoverageDecorationManager.compareLocations);
  }

  private static compareLocations(a: RawLocation, b: RawLocation): number {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column;
  }

  private onUISourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    uiSourceCode.setDecorationData(decoratorType, this);
  }
}
export interface RawLocation {
  id: string;
  contentProvider: TextUtils.ContentProvider.ContentProvider;
  line: number;
  column: number;
}
