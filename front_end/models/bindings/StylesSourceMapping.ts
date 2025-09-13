// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import type {SourceMapping} from './CSSWorkspaceBinding.js';
import {NetworkProject} from './NetworkProject.js';
import {metadataForURL} from './ResourceUtils.js';

const uiSourceCodeToStyleMap = new WeakMap<Workspace.UISourceCode.UISourceCode, StyleFile>();

export class StylesSourceMapping implements SourceMapping {
  #cssModel: SDK.CSSModel.CSSModel;
  #project: ContentProviderBasedProject;
  readonly #styleFiles = new Map<string, StyleFile>();
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(cssModel: SDK.CSSModel.CSSModel, workspace: Workspace.Workspace.WorkspaceImpl) {
    this.#cssModel = cssModel;
    const target = this.#cssModel.target();
    this.#project = new ContentProviderBasedProject(
        workspace, 'css:' + target.id(), Workspace.Workspace.projectTypes.Network, '', false /* isServiceProject */);
    NetworkProject.setTargetForProject(this.#project, target);

    this.#eventListeners = [
      this.#cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.styleSheetAdded, this),
      this.#cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.styleSheetRemoved, this),
      this.#cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.styleSheetChanged, this),
    ];
  }

  addSourceMap(sourceUrl: Platform.DevToolsPath.UrlString, sourceMapUrl: Platform.DevToolsPath.UrlString): void {
    this.#styleFiles.get(sourceUrl)?.addSourceMap(sourceUrl, sourceMapUrl);
  }

  rawLocationToUILocation(rawLocation: SDK.CSSModel.CSSLocation): Workspace.UISourceCode.UILocation|null {
    const header = rawLocation.header();
    if (!header || !this.acceptsHeader(header)) {
      return null;
    }
    const styleFile = this.#styleFiles.get(header.resourceURL());
    if (!styleFile) {
      return null;
    }
    let lineNumber = rawLocation.lineNumber;
    let columnNumber: undefined|number = rawLocation.columnNumber;
    if (header.isInline && header.hasSourceURL) {
      lineNumber -= header.lineNumberInSource(0);
      const headerColumnNumber = header.columnNumberInSource(lineNumber, 0);
      if (typeof headerColumnNumber === 'undefined') {
        columnNumber = headerColumnNumber;
      } else {
        columnNumber -= headerColumnNumber;
      }
    }
    return styleFile.getUiSourceCode().uiLocation(lineNumber, columnNumber);
  }

  uiLocationToRawLocations(uiLocation: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[] {
    const styleFile = uiSourceCodeToStyleMap.get(uiLocation.uiSourceCode);
    if (!styleFile) {
      return [];
    }
    const rawLocations = [];
    for (const header of styleFile.getHeaders()) {
      let lineNumber = uiLocation.lineNumber;
      let columnNumber = uiLocation.columnNumber;
      if (header.isInline && header.hasSourceURL) {
        // TODO(crbug.com/1153123): Revisit the `#columnNumber || 0` and also preserve `undefined` for source maps?
        columnNumber = header.columnNumberInSource(lineNumber, uiLocation.columnNumber || 0);
        lineNumber = header.lineNumberInSource(lineNumber);
      }
      rawLocations.push(new SDK.CSSModel.CSSLocation(header, lineNumber, columnNumber));
    }
    return rawLocations;
  }

  private acceptsHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): boolean {
    if (header.isConstructedByNew()) {
      return false;
    }
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector') {
      return false;
    }
    if (!header.resourceURL()) {
      return false;
    }
    return true;
  }

  private styleSheetAdded(event: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>):
      void {
    const header = event.data;
    if (!this.acceptsHeader(header)) {
      return;
    }

    const url = header.resourceURL();
    let styleFile = this.#styleFiles.get(url);
    if (!styleFile) {
      styleFile = new StyleFile(this.#cssModel, this.#project, header);
      this.#styleFiles.set(url, styleFile);
    } else {
      styleFile.addHeader(header);
    }
  }

  private styleSheetRemoved(event: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>):
      void {
    const header = event.data;
    if (!this.acceptsHeader(header)) {
      return;
    }
    const url = header.resourceURL();
    const styleFile = this.#styleFiles.get(url);
    if (styleFile) {
      if (styleFile.getHeaders().size === 1) {
        styleFile.dispose();
        this.#styleFiles.delete(url);
      } else {
        styleFile.removeHeader(header);
      }
    }
  }

  private styleSheetChanged(event: Common.EventTarget.EventTargetEvent<SDK.CSSModel.StyleSheetChangedEvent>): void {
    const header = this.#cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !this.acceptsHeader(header)) {
      return;
    }
    const styleFile = this.#styleFiles.get(header.resourceURL());
    if (styleFile) {
      styleFile.styleSheetChanged(header);
    }
  }

  dispose(): void {
    for (const styleFile of this.#styleFiles.values()) {
      styleFile.dispose();
    }
    this.#styleFiles.clear();
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#project.removeProject();
  }
}

export class StyleFile implements TextUtils.ContentProvider.ContentProvider {
  readonly #cssModel: SDK.CSSModel.CSSModel;
  readonly #project: ContentProviderBasedProject;
  headers: Set<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>;
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  readonly #throttler = new Common.Throttler.Throttler(200);
  #terminated = false;
  #isAddingRevision?: boolean;
  #isUpdatingHeaders?: boolean;

  constructor(
      cssModel: SDK.CSSModel.CSSModel, project: ContentProviderBasedProject,
      header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader) {
    this.#cssModel = cssModel;
    this.#project = project;
    this.headers = new Set([header]);

    const target = cssModel.target();

    const url = header.resourceURL();
    const metadata = metadataForURL(target, header.frameId, url);

    this.uiSourceCode = this.#project.createUISourceCode(url, header.contentType());
    uiSourceCodeToStyleMap.set(this.uiSourceCode, this);
    NetworkProject.setInitialFrameAttribution(this.uiSourceCode, header.frameId);
    this.#project.addUISourceCodeWithProvider(this.uiSourceCode, this, metadata, 'text/css');

    this.#eventListeners = [
      this.uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this),
      this.uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this),
    ];
  }

  addHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): void {
    this.headers.add(header);
    NetworkProject.addFrameAttribution(this.uiSourceCode, header.frameId);
  }

  removeHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): void {
    this.headers.delete(header);
    NetworkProject.removeFrameAttribution(this.uiSourceCode, header.frameId);
  }

  styleSheetChanged(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): void {
    console.assert(this.headers.has(header));
    if (this.#isUpdatingHeaders || !this.headers.has(header)) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(this, header, true /* majorChange */);
    void this.#throttler.schedule(mirrorContentBound, Common.Throttler.Scheduling.DEFAULT);
  }

  private workingCopyCommitted(): void {
    if (this.#isAddingRevision) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(this, this.uiSourceCode, true /* majorChange */);
    void this.#throttler.schedule(mirrorContentBound, Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE);
  }

  private workingCopyChanged(): void {
    if (this.#isAddingRevision) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(this, this.uiSourceCode, false /* majorChange */);
    void this.#throttler.schedule(mirrorContentBound, Common.Throttler.Scheduling.DEFAULT);
  }

  private async mirrorContent(fromProvider: TextUtils.ContentProvider.ContentProvider, majorChange: boolean):
      Promise<void> {
    if (this.#terminated) {
      this.styleFileSyncedForTest();
      return;
    }

    let newContent: string|null = null;
    if (fromProvider === this.uiSourceCode) {
      newContent = this.uiSourceCode.workingCopy();
    } else {
      newContent = TextUtils.ContentData.ContentData.textOr(await fromProvider.requestContentData(), null);
    }

    if (newContent === null || this.#terminated) {
      this.styleFileSyncedForTest();
      return;
    }

    if (fromProvider !== this.uiSourceCode) {
      this.#isAddingRevision = true;
      this.uiSourceCode.setWorkingCopy(newContent);
      this.#isAddingRevision = false;
    }

    this.#isUpdatingHeaders = true;
    const promises = [];
    for (const header of this.headers) {
      if (header === fromProvider) {
        continue;
      }
      promises.push(this.#cssModel.setStyleSheetText(header.id, newContent, majorChange));
    }
    // ------ ASYNC ------
    await Promise.all(promises);
    this.#isUpdatingHeaders = false;
    this.styleFileSyncedForTest();
  }

  private styleFileSyncedForTest(): void {
  }

  dispose(): void {
    if (this.#terminated) {
      return;
    }
    this.#terminated = true;
    this.#project.removeUISourceCode(this.uiSourceCode.url());
    Common.EventTarget.removeEventListeners(this.#eventListeners);
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().contentURL();
  }

  contentType(): Common.ResourceType.ResourceType {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().contentType();
  }

  requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().requestContentData();
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().searchInContent(query, caseSensitive, isRegex);
  }

  #firstHeader(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader {
    console.assert(this.headers.size > 0);
    return this.headers.values().next().value as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
  }

  getHeaders(): Set<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader> {
    return this.headers;
  }

  getUiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.uiSourceCode;
  }

  addSourceMap(sourceUrl: Platform.DevToolsPath.UrlString, sourceMapUrl: Platform.DevToolsPath.UrlString): void {
    const sourceMapManager = this.#cssModel.sourceMapManager();
    this.headers.forEach(header => {
      sourceMapManager.detachSourceMap(header);
      sourceMapManager.attachSourceMap(header, sourceUrl, sourceMapUrl);
    });
  }
}
