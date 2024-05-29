// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import type * as Protocol from '../../generated/protocol.js';

import {type CSSModel} from './CSSModel.js';
import {DeferredDOMNode} from './DOMModel.js';
import {type FrameAssociated} from './FrameAssociated.js';
import {type PageResourceLoadInitiator} from './PageResourceLoader.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';

const UIStrings = {
  /**
   *@description Error message for when a CSS file can't be loaded
   */
  couldNotFindTheOriginalStyle: 'Could not find the original style sheet.',
  /**
   *@description Error message to display when a source CSS file could not be retrieved.
   */
  thereWasAnErrorRetrievingThe: 'There was an error retrieving the source styles.',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/CSSStyleSheetHeader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CSSStyleSheetHeader implements TextUtils.ContentProvider.ContentProvider, FrameAssociated {
  #cssModelInternal: CSSModel;
  id: Protocol.CSS.StyleSheetId;
  frameId: Protocol.Page.FrameId;
  sourceURL: Platform.DevToolsPath.UrlString;
  hasSourceURL: boolean;
  origin: Protocol.CSS.StyleSheetOrigin;
  title: string;
  disabled: boolean;
  isInline: boolean;
  isMutable: boolean;
  isConstructed: boolean;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  contentLength: number;
  ownerNode: DeferredDOMNode|undefined;
  sourceMapURL: Platform.DevToolsPath.UrlString|undefined;
  readonly loadingFailed: boolean;
  #originalContentProviderInternal: TextUtils.StaticContentProvider.StaticContentProvider|null;

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSStyleSheetHeader) {
    this.#cssModelInternal = cssModel;
    this.id = payload.styleSheetId;
    this.frameId = payload.frameId;
    this.sourceURL = payload.sourceURL as Platform.DevToolsPath.UrlString;
    this.hasSourceURL = Boolean(payload.hasSourceURL);
    this.origin = payload.origin;
    this.title = payload.title;
    this.disabled = payload.disabled;
    this.isInline = payload.isInline;
    this.isMutable = payload.isMutable;
    this.isConstructed = payload.isConstructed;
    this.startLine = payload.startLine;
    this.startColumn = payload.startColumn;
    this.endLine = payload.endLine;
    this.endColumn = payload.endColumn;
    this.contentLength = payload.length;
    if (payload.ownerNode) {
      this.ownerNode = new DeferredDOMNode(cssModel.target(), payload.ownerNode);
    }
    this.sourceMapURL = payload.sourceMapURL as Platform.DevToolsPath.UrlString;
    this.loadingFailed = payload.loadingFailed ?? false;
    this.#originalContentProviderInternal = null;
  }

  originalContentProvider(): TextUtils.ContentProvider.ContentProvider {
    if (!this.#originalContentProviderInternal) {
      const lazyContent = (async(): Promise<TextUtils.ContentData.ContentDataOrError> => {
        const originalText = await this.#cssModelInternal.originalStyleSheetText(this);
        if (originalText === null) {
          return {error: i18nString(UIStrings.couldNotFindTheOriginalStyle)};
        }
        return new TextUtils.ContentData.ContentData(originalText, /* isBase64=*/ false, 'text/css');
      });
      this.#originalContentProviderInternal =
          new TextUtils.StaticContentProvider.StaticContentProvider(this.contentURL(), this.contentType(), lazyContent);
    }
    return this.#originalContentProviderInternal;
  }

  setSourceMapURL(sourceMapURL?: Platform.DevToolsPath.UrlString): void {
    this.sourceMapURL = sourceMapURL;
  }

  cssModel(): CSSModel {
    return this.#cssModelInternal;
  }

  isAnonymousInlineStyleSheet(): boolean {
    return !this.resourceURL() && !this.#cssModelInternal.sourceMapManager().sourceMapForClient(this);
  }

  isConstructedByNew(): boolean {
    return this.isConstructed && this.sourceURL.length === 0;
  }

  resourceURL(): Platform.DevToolsPath.UrlString {
    const url = this.isViaInspector() ? this.viaInspectorResourceURL() : this.sourceURL;
    if (!url && Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES)) {
      return this.dynamicStyleURL();
    }
    return url;
  }

  private getFrameURLPath(): string {
    const model = this.#cssModelInternal.target().model(ResourceTreeModel);
    console.assert(Boolean(model));
    if (!model) {
      return '';
    }
    const frame = model.frameForId(this.frameId);
    if (!frame) {
      return '';
    }
    console.assert(Boolean(frame));
    const parsedURL = new Common.ParsedURL.ParsedURL(frame.url);
    let urlPath = parsedURL.host + parsedURL.folderPathComponents;
    if (!urlPath.endsWith('/')) {
      urlPath += '/';
    }
    return urlPath;
  }

  private viaInspectorResourceURL(): Platform.DevToolsPath.UrlString {
    return `inspector://${this.getFrameURLPath()}inspector-stylesheet` as Platform.DevToolsPath.UrlString;
  }

  private dynamicStyleURL(): Platform.DevToolsPath.UrlString {
    return `stylesheet://${this.getFrameURLPath()}style#${this.id}` as Platform.DevToolsPath.UrlString;
  }

  lineNumberInSource(lineNumberInStyleSheet: number): number {
    return this.startLine + lineNumberInStyleSheet;
  }

  columnNumberInSource(lineNumberInStyleSheet: number, columnNumberInStyleSheet: number): number|undefined {
    return (lineNumberInStyleSheet ? 0 : this.startColumn) + columnNumberInStyleSheet;
  }

  /**
   * Checks whether the position is in this style sheet. Assumes that the
   * position's columnNumber is consistent with line endings.
   */
  containsLocation(lineNumber: number, columnNumber: number): boolean {
    const afterStart =
        (lineNumber === this.startLine && columnNumber >= this.startColumn) || lineNumber > this.startLine;
    const beforeEnd = lineNumber < this.endLine || (lineNumber === this.endLine && columnNumber <= this.endColumn);
    return afterStart && beforeEnd;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.resourceURL();
  }

  contentType(): Common.ResourceType.ResourceType {
    return Common.ResourceType.resourceTypes.Stylesheet;
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return this.requestContentData().then(TextUtils.ContentData.ContentData.asDeferredContent.bind(undefined));
  }

  async requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    const cssText = await this.#cssModelInternal.getStyleSheetText(this.id);
    if (cssText === null) {
      return {error: i18nString(UIStrings.thereWasAnErrorRetrievingThe)};
    }
    return new TextUtils.ContentData.ContentData(cssText, /* isBase64=*/ false, 'text/css');
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const contentData = await this.requestContentData();
    return TextUtils.TextUtils.performSearchInContentData(contentData, query, caseSensitive, isRegex);
  }

  isViaInspector(): boolean {
    return this.origin === 'inspector';
  }

  createPageResourceLoadInitiator(): PageResourceLoadInitiator {
    return {
      target: this.#cssModelInternal.target(),
      frameId: this.frameId,
      initiatorUrl: this.hasSourceURL ? Platform.DevToolsPath.EmptyUrlString : this.sourceURL,
    };
  }
}
