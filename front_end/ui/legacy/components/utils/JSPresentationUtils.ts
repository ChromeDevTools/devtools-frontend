// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import jsUtilsStyles from './jsUtils.css.js';
import {Events as LinkifierEvents, Linkifier} from './Linkifier.js';

const UIStrings = {
  /**
   *@description Text to stop preventing the debugger from stepping into library code
   */
  removeFromIgnore: 'Remove from ignore list',
  /**
   *@description Text for scripts that should not be stepped into when debugging
   */
  addToIgnore: 'Add script to ignore list',
  /**
   * @description A link to show more frames when they are available. Never 0.
   */
  showSMoreFrames: '{n, plural, =1 {Show # more frame} other {Show # more frames}}',
  /**
   * @description A link to rehide frames that are by default hidden.
   */
  showLess: 'Show less',
  /**
   *@description Text indicating that source url of a link is currently unknown
   */
  unknownSource: 'unknown',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/utils/JSPresentationUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function populateContextMenu(link: Element, event: Event): void {
  const contextMenu = new UI.ContextMenu.ContextMenu(event);
  event.consume(true);
  const uiLocation = Linkifier.uiLocation(link);
  if (uiLocation &&
      Bindings.IgnoreListManager.IgnoreListManager.instance().canIgnoreListUISourceCode(uiLocation.uiSourceCode)) {
    if (Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(uiLocation.uiSourceCode.url())) {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.removeFromIgnore),
          () => Bindings.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(
              uiLocation.uiSourceCode));
    } else {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.addToIgnore),
          () =>
              Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiLocation.uiSourceCode));
    }
  }
  contextMenu.appendApplicableItems(event);
  void contextMenu.show();
}

export function buildStackTraceRows(
    stackTrace: Protocol.Runtime.StackTrace,
    target: SDK.Target.Target|null,
    linkifier: Linkifier,
    tabStops: boolean|undefined,
    updateCallback?: (arg0: (StackTraceRegularRow|StackTraceAsyncRow)[]) => void,
    ): (StackTraceRegularRow|StackTraceAsyncRow)[] {
  const stackTraceRows: (StackTraceRegularRow|StackTraceAsyncRow)[] = [];

  if (updateCallback) {
    const throttler = new Common.Throttler.Throttler(100);
    linkifier.addEventListener(LinkifierEvents.LiveLocationUpdated, () => {
      void throttler.schedule(async () => updateHiddenRows(updateCallback, stackTraceRows));
    });
  }

  function buildStackTraceRowsHelper(
      stackTrace: Protocol.Runtime.StackTrace,
      previousCallFrames: Protocol.Runtime.CallFrame[]|undefined = undefined): void {
    let asyncRow: StackTraceAsyncRow|null = null;
    if (previousCallFrames) {
      asyncRow = {
        asyncDescription: UI.UIUtils.asyncStackTraceLabel(stackTrace.description, previousCallFrames),
        ignoreListHide: false,
      };
      stackTraceRows.push(asyncRow);
    }
    let hiddenCallFrames = 0;
    let previousStackFrameWasBreakpointCondition = false;
    for (const stackFrame of stackTrace.callFrames) {
      let ignoreListHide = false;
      const functionName = UI.UIUtils.beautifyFunctionName(stackFrame.functionName);
      const link = linkifier.maybeLinkifyConsoleCallFrame(target, stackFrame, {
        tabStop: Boolean(tabStops),
        inlineFrameIndex: 0,
        revealBreakpoint: previousStackFrameWasBreakpointCondition,
      });
      if (link) {
        link.setAttribute('jslog', `${VisualLogging.link('stack-trace').track({click: true})}`);
        link.addEventListener('contextmenu', populateContextMenu.bind(null, link));
        // TODO(crbug.com/1183325): fix race condition with uiLocation still being null here
        // Note: This has always checked whether the call frame location *in the generated
        // code* is ignore-listed or not. This can change after the live location updates,
        // and is handled again in the linkifier live location update callback.
        const uiLocation = Linkifier.uiLocation(link);
        if (uiLocation &&
            Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
                uiLocation.uiSourceCode)) {
          ignoreListHide = true;
        }
        if (!link.textContent) {
          link.textContent = i18nString(UIStrings.unknownSource);
        }
      }
      if (ignoreListHide) {
        ++hiddenCallFrames;
      }
      stackTraceRows.push({functionName, link, ignoreListHide});
      previousStackFrameWasBreakpointCondition = [
        SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL,
        SDK.DebuggerModel.LOGPOINT_SOURCE_URL,
      ].includes(stackFrame.url);
    }
    if (asyncRow && hiddenCallFrames > 0 && hiddenCallFrames === stackTrace.callFrames.length) {
      asyncRow.ignoreListHide = true;
    }
  }

  buildStackTraceRowsHelper(stackTrace);
  let previousCallFrames = stackTrace.callFrames;
  for (let asyncStackTrace = stackTrace.parent; asyncStackTrace; asyncStackTrace = asyncStackTrace.parent) {
    if (asyncStackTrace.callFrames.length) {
      buildStackTraceRowsHelper(asyncStackTrace, previousCallFrames);
    }
    previousCallFrames = asyncStackTrace.callFrames;
  }
  return stackTraceRows;
}

/**
 * @param {function(!Array<!StackTraceRegularRow|!StackTraceAsyncRow>): *} renderCallback
 * @param {!Array<!StackTraceRegularRow|!StackTraceAsyncRow>} stackTraceRows
 */
function updateHiddenRows(
    renderCallback: (arg0: (StackTraceRegularRow|StackTraceAsyncRow)[]) => void,
    stackTraceRows: (StackTraceRegularRow|StackTraceAsyncRow)[],
    ): void {
  let shouldHideSubCount = 0;  // keeps track of number hidden (regular) rows between asyncRows
  let indexOfAsyncRow = stackTraceRows.length;

  for (let i = stackTraceRows.length - 1; i >= 0; i--) {
    const row = stackTraceRows[i];

    if ('link' in row && row.link) {
      // Note: This checks whether the call frame location *in the live location* is
      // ignore-listed or not. When a source map is present, this corresponds to the
      // location in the original source, not the generated source. Therefore, the
      // ignore-list status might be different now from when the row was created.
      const uiLocation = Linkifier.uiLocation(row.link);
      if (uiLocation &&
          Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
              uiLocation.uiSourceCode)) {
        row.ignoreListHide = true;
      }
      if (row.ignoreListHide) {
        shouldHideSubCount++;
      }
    }
    if ('asyncDescription' in row) {
      // hide current row if all (regular) rows since the previous asyncRow are hidden
      if (shouldHideSubCount > 0 && shouldHideSubCount === indexOfAsyncRow - i - 1) {
        row.ignoreListHide = true;
      }
      indexOfAsyncRow = i;
      shouldHideSubCount = 0;
    }
  }
  renderCallback(stackTraceRows);
}

export function buildStackTracePreviewContents(
    target: SDK.Target.Target|null, linkifier: Linkifier, options: Options = {
      widthConstrained: false,
      stackTrace: undefined,
      tabStops: undefined,
    }): {element: HTMLElement, links: HTMLElement[]} {
  const {stackTrace, tabStops} = options;
  const element = document.createElement('span');
  element.classList.add('monospace');
  element.classList.add('stack-preview-container');
  element.classList.toggle('width-constrained', options.widthConstrained);
  element.style.display = 'inline-block';
  const shadowRoot =
      UI.Utils.createShadowRootWithCoreStyles(element, {cssFile: [jsUtilsStyles], delegatesFocus: undefined});
  const contentElement = shadowRoot.createChild('table', 'stack-preview-container');
  contentElement.classList.toggle('width-constrained', options.widthConstrained);
  if (!stackTrace) {
    return {element, links: []};
  }

  const updateCallback = renderStackTraceTable.bind(null, contentElement);
  const stackTraceRows = buildStackTraceRows(stackTrace, target, linkifier, tabStops, updateCallback);
  const links = renderStackTraceTable(contentElement, stackTraceRows);
  return {element, links};
}

function renderStackTraceTable(
    container: Element, stackTraceRows: (StackTraceRegularRow|StackTraceAsyncRow)[]): HTMLElement[] {
  container.removeChildren();
  let hiddenCallFramesCount = 0;
  const links: HTMLElement[] = [];

  for (const item of stackTraceRows) {
    const row = container.createChild('tr');
    if ('asyncDescription' in item) {
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'stack-preview-async-description').textContent = item.asyncDescription;
      row.createChild('td');
      row.createChild('td');
    } else {
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'function-name').textContent = item.functionName;
      row.createChild('td').textContent = ' @ ';
      if (item.link) {
        row.createChild('td', 'link').appendChild(item.link);
        links.push(item.link);
      }
      if (item.ignoreListHide) {
        ++hiddenCallFramesCount;
      }
    }
    if (item.ignoreListHide) {
      row.classList.add('hidden-row');
    }
    container.appendChild(row);
  }

  if (hiddenCallFramesCount) {
    const showAllRow = container.createChild('tr', 'show-all-link');
    showAllRow.createChild('td').textContent = '\n';
    const cell = showAllRow.createChild('td') as HTMLTableCellElement;
    cell.colSpan = 4;
    const showAllLink = cell.createChild('span', 'link');
    showAllLink.textContent = i18nString(UIStrings.showSMoreFrames, {n: hiddenCallFramesCount});
    showAllLink.addEventListener('click', () => {
      container.classList.add('show-hidden-rows');
      // If we are in a popup, this will trigger a re-layout
      UI.GlassPane.GlassPane.containerMoved(container);
    }, false);
    const showLessRow = container.createChild('tr', 'show-less-link');
    showLessRow.createChild('td').textContent = '\n';
    const showLesscell = showLessRow.createChild('td') as HTMLTableCellElement;
    showLesscell.colSpan = 4;
    const showLessLink = showLesscell.createChild('span', 'link');
    showLessLink.textContent = i18nString(UIStrings.showLess);
    showLessLink.addEventListener('click', () => {
      container.classList.remove('show-hidden-rows');
      // If we are in a popup, this will trigger a re-layout
      UI.GlassPane.GlassPane.containerMoved(container);
    }, false);
  }
  return links;
}

export interface Options {
  stackTrace: Protocol.Runtime.StackTrace|undefined;
  tabStops: boolean|undefined;
  // Whether the width of stack trace preview
  // is constrained to its container or whether
  // it can grow the container.
  widthConstrained?: boolean;
}

export interface StackTraceRegularRow {
  functionName: string;
  ignoreListHide: boolean;
  link: HTMLElement|null;
}

export interface StackTraceAsyncRow {
  asyncDescription: string;
  ignoreListHide: boolean;
}
