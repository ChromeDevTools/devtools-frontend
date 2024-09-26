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
   * @description A link to show more frames when they are available.
   */
  showMoreFrames: 'Show ignore-listed frames',
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
          () =>
              Bindings.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(uiLocation.uiSourceCode),
          {jslogContext: 'remove-from-ignore-list'});
    } else {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.addToIgnore),
          () => Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiLocation.uiSourceCode),
          {jslogContext: 'add-to-ignore-list'});
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
    showColumnNumber?: boolean,
    ): (StackTraceRegularRow|StackTraceAsyncRow)[] {
  const stackTraceRows: (StackTraceRegularRow|StackTraceAsyncRow)[] = [];

  if (updateCallback) {
    const throttler = new Common.Throttler.Throttler(100);
    linkifier.addEventListener(LinkifierEvents.LIVE_LOCATION_UPDATED, () => {
      void throttler.schedule(async () => updateCallback(stackTraceRows));
    });
  }

  function buildStackTraceRowsHelper(
      stackTrace: Protocol.Runtime.StackTrace,
      previousCallFrames: Protocol.Runtime.CallFrame[]|undefined = undefined): void {
    let asyncRow: StackTraceAsyncRow|null = null;
    if (previousCallFrames) {
      asyncRow = {
        asyncDescription: UI.UIUtils.asyncStackTraceLabel(stackTrace.description, previousCallFrames),
      };
      stackTraceRows.push(asyncRow);
    }
    let previousStackFrameWasBreakpointCondition = false;
    for (const stackFrame of stackTrace.callFrames) {
      const functionName = UI.UIUtils.beautifyFunctionName(stackFrame.functionName);
      const link = linkifier.maybeLinkifyConsoleCallFrame(target, stackFrame, {
        showColumnNumber,
        tabStop: Boolean(tabStops),
        inlineFrameIndex: 0,
        revealBreakpoint: previousStackFrameWasBreakpointCondition,
      });
      if (link) {
        link.setAttribute('jslog', `${VisualLogging.link('stack-trace').track({click: true})}`);
        link.addEventListener('contextmenu', populateContextMenu.bind(null, link));

        if (!link.textContent) {
          link.textContent = i18nString(UIStrings.unknownSource);
        }
      }
      stackTraceRows.push({functionName, link});
      previousStackFrameWasBreakpointCondition = [
        SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL,
        SDK.DebuggerModel.LOGPOINT_SOURCE_URL,
      ].includes(stackFrame.url);
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
      UI.UIUtils.createShadowRootWithCoreStyles(element, {cssFile: [jsUtilsStyles], delegatesFocus: undefined});
  const contentElement = shadowRoot.createChild('table', 'stack-preview-container');
  contentElement.classList.toggle('width-constrained', options.widthConstrained);

  const updateCallback = renderStackTraceTable.bind(null, contentElement, element);
  const stackTraceRows = buildStackTraceRows(
      stackTrace ?? {callFrames: []}, target, linkifier, tabStops, updateCallback, options.showColumnNumber);
  const links = renderStackTraceTable(contentElement, element, stackTraceRows);
  return {element, links};
}

function renderStackTraceTable(
    container: Element, parent: Element, stackTraceRows: (StackTraceRegularRow|StackTraceAsyncRow)[]): HTMLElement[] {
  container.removeChildren();
  const links: HTMLElement[] = [];

  // The tableSection groups one or more synchronous call frames together.
  // Wherever there is an asynchronous call, a new section is created.
  let tableSection: Element|null = null;
  for (const item of stackTraceRows) {
    if (!tableSection || 'asyncDescription' in item) {
      tableSection = container.createChild('tbody');
    }

    const row = tableSection.createChild('tr');
    if ('asyncDescription' in item) {
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'stack-preview-async-description').textContent = item.asyncDescription;
      row.createChild('td');
      row.createChild('td');
      row.classList.add('stack-preview-async-row');
    } else {
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'function-name').textContent = item.functionName;
      row.createChild('td').textContent = ' @ ';
      if (item.link) {
        row.createChild('td', 'link').appendChild(item.link);
        links.push(item.link);
      }
    }
  }

  tableSection = container.createChild('tfoot');
  const showAllRow = tableSection.createChild('tr', 'show-all-link');
  showAllRow.createChild('td');
  const cell = showAllRow.createChild('td') as HTMLTableCellElement;
  cell.colSpan = 4;
  const showAllLink = cell.createChild('span', 'link');
  // Don't directly put the text of the link in the DOM, as it will likely be
  // invisible and it may be confusing if it is copied to the clipboard.
  showAllLink.createChild('span', 'css-inserted-text')
      .setAttribute('data-inserted-text', i18nString(UIStrings.showMoreFrames));
  showAllLink.addEventListener('click', () => {
    container.classList.add('show-hidden-rows');
    parent.classList.add('show-hidden-rows');
    // If we are in a popup, this will trigger a re-layout
    UI.GlassPane.GlassPane.containerMoved(container);
  }, false);
  const showLessRow = tableSection.createChild('tr', 'show-less-link');
  showLessRow.createChild('td');
  const showLesscell = showLessRow.createChild('td') as HTMLTableCellElement;
  showLesscell.colSpan = 4;
  const showLessLink = showLesscell.createChild('span', 'link');
  showLessLink.createChild('span', 'css-inserted-text')
      .setAttribute('data-inserted-text', i18nString(UIStrings.showLess));
  showLessLink.addEventListener('click', () => {
    container.classList.remove('show-hidden-rows');
    parent.classList.remove('show-hidden-rows');
    // If we are in a popup, this will trigger a re-layout
    UI.GlassPane.GlassPane.containerMoved(container);
  }, false);

  return links;
}

export interface Options {
  stackTrace: Protocol.Runtime.StackTrace|undefined;
  tabStops: boolean|undefined;
  // Whether the width of stack trace preview
  // is constrained to its container or whether
  // it can grow the container.
  widthConstrained?: boolean;
  showColumnNumber?: boolean;
}

export interface StackTraceRegularRow {
  functionName: string;
  link: HTMLElement|null;
}

export interface StackTraceAsyncRow {
  asyncDescription: string;
}
