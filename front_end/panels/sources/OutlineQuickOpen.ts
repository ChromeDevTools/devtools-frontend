// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Formatter from '../../models/formatter/formatter.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../ui/legacy/legacy.js';

import {SourcesView} from './SourcesView.js';

const UIStrings = {
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  */
  noFileSelected: 'No file selected.',
  /**
  *@description Text in Outline Quick Open of the Sources panel
  */
  openAJavascriptOrCssFileToSee: 'Open a JavaScript or CSS file to see symbols',
  /**
  *@description Text to show no results have been found
  */
  noResultsFound: 'No results found',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/OutlineQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let outlineQuickOpenInstance: OutlineQuickOpen;

export class OutlineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  private items: Formatter.FormatterWorkerPool.OutlineItem[];
  private active: boolean;
  private constructor() {
    super();
    this.items = [];
    this.active = false;
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): OutlineQuickOpen {
    const {forceNew} = opts;
    if (!outlineQuickOpenInstance || forceNew) {
      outlineQuickOpenInstance = new OutlineQuickOpen();
    }

    return outlineQuickOpenInstance;
  }

  attach(): void {
    this.items = [];
    this.active = false;

    const uiSourceCode = this.currentUISourceCode();
    if (uiSourceCode) {
      this.active = Formatter.FormatterWorkerPool.formatterWorkerPool().outlineForMimetype(
          uiSourceCode.workingCopy(), uiSourceCode.contentType().canonicalMimeType(),
          this.didBuildOutlineChunk.bind(this));
    }
  }

  private didBuildOutlineChunk(isLastChunk: boolean, items: Formatter.FormatterWorkerPool.OutlineItem[]): void {
    this.items.push(...items);
    this.refresh();
  }

  itemCount(): number {
    return this.items.length;
  }

  itemKeyAt(itemIndex: number): string {
    const item = this.items[itemIndex];
    return item.title + (item.subtitle ? item.subtitle : '');
  }

  itemScoreAt(itemIndex: number, query: string): number {
    const item = this.items[itemIndex];
    const methodName = query.split('(')[0];
    if (methodName.toLowerCase() === item.title.toLowerCase()) {
      return 1 / (1 + item.line);
    }
    return -item.line - 1;
  }

  renderItem(itemIndex: number, query: string, titleElement: Element, _subtitleElement: Element): void {
    const item = this.items[itemIndex];
    titleElement.textContent = item.title + (item.subtitle ? item.subtitle : '');
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query);

    const tagElement = (titleElement.parentElement?.parentElement?.createChild('span', 'tag') as HTMLElement);
    if (!tagElement) {
      return;
    }
    tagElement.textContent = ':' + (item.line + 1);
  }

  selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex === null) {
      return;
    }
    const uiSourceCode = this.currentUISourceCode();
    if (!uiSourceCode) {
      return;
    }
    const lineNumber = this.items[itemIndex].line;
    if (!isNaN(lineNumber) && lineNumber >= 0) {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, this.items[itemIndex].column));
    }
  }

  private currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentUISourceCode();
  }

  notFoundText(): string {
    if (!this.currentUISourceCode()) {
      return i18nString(UIStrings.noFileSelected);
    }
    if (!this.active) {
      return i18nString(UIStrings.openAJavascriptOrCssFileToSee);
    }
    return i18nString(UIStrings.noResultsFound);
  }
}
