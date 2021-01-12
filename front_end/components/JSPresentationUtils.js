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

import * as Bindings from '../bindings/bindings.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {Linkifier} from './Linkifier.js';

export const UIStrings = {
  /**
  *@description Text to stop preventing the debugger from stepping into library code
  */
  removeFromIgnore: 'Remove from ignore list',
  /**
  *@description Text for scripts that should not be stepped into when debugging
  */
  addToIgnore: 'Add script to ignore list',
  /**
  *@description Show all link text content in JSPresentation Utils
  */
  showMoreFrame: 'Show 1 more frame',
  /**
  *@description Show all link text content in JSPresentation Utils
  *@example {2} PH1
  */
  showSMoreFrames: 'Show {PH1} more frames',
  /**
   *@description Text indicating that source url of a link is currently unknown
   */
  unknownSource: 'unknown',
};
const str_ = i18n.i18n.registerUIStrings('components/JSPresentationUtils.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @param {?SDK.SDKModel.Target} target
 * @param {!Linkifier} linkifier
 * @param {!Options=} options
 * @return {{element: !HTMLElement, links: !Array<!HTMLElement>}}
 */
export function buildStackTracePreviewContents(target, linkifier, options = {
  stackTrace: undefined,
  contentUpdated: undefined,
  tabStops: undefined
}) {
  const {stackTrace, contentUpdated, tabStops} = options;
  const element = /** @type {!HTMLElement} */ (document.createElement('span'));
  element.classList.add('monospace');
  element.style.display = 'inline-block';
  const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
      element, {cssFile: 'components/jsUtils.css', enableLegacyPatching: false, delegatesFocus: undefined});
  const contentElement = shadowRoot.createChild('table', 'stack-preview-container');
  let totalHiddenCallFramesCount = 0;
  let totalCallFramesCount = 0;
  /** @type {!Array<!HTMLElement>} */
  const links = [];

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {boolean}
   */
  function appendStackTrace(stackTrace) {
    let hiddenCallFrames = 0;
    for (const stackFrame of stackTrace.callFrames) {
      totalCallFramesCount++;
      let shouldHide = totalCallFramesCount > 30 && stackTrace.callFrames.length > 31;
      const row = document.createElement('tr');
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'function-name').textContent = UI.UIUtils.beautifyFunctionName(stackFrame.functionName);
      const link = linkifier.maybeLinkifyConsoleCallFrame(
          target, stackFrame, {tabStop: Boolean(tabStops), className: undefined, columnNumber: undefined});
      if (link) {
        link.addEventListener('contextmenu', populateContextMenu.bind(null, link));
        const uiLocation = Linkifier.uiLocation(link);
        if (uiLocation &&
            Bindings.IgnoreListManager.IgnoreListManager.instance().isIgnoreListedUISourceCode(
                uiLocation.uiSourceCode)) {
          shouldHide = true;
        }
        row.createChild('td').textContent = ' @ ';
        row.createChild('td').appendChild(link);
        // Linkifier is using a workaround with the 'zero width space' (\u200b).
        // TODO(szuend): Remove once the Linkfier is no longer using the workaround.
        if (!link.textContent || link.textContent === '\u200b') {
          link.textContent = i18nString(UIStrings.unknownSource);
        }
        links.push(link);
      }
      if (shouldHide) {
        row.classList.add('ignore-listed');
        ++hiddenCallFrames;
      }
      contentElement.appendChild(row);
    }
    totalHiddenCallFramesCount += hiddenCallFrames;
    return stackTrace.callFrames.length === hiddenCallFrames;
  }

  /**
   * @param {!Element} link
   * @param {!Event} event
   */
  function populateContextMenu(link, event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    event.consume(true);
    const uiLocation = Linkifier.uiLocation(link);
    if (uiLocation &&
        Bindings.IgnoreListManager.IgnoreListManager.instance().canIgnoreListUISourceCode(uiLocation.uiSourceCode)) {
      if (Bindings.IgnoreListManager.IgnoreListManager.instance().isIgnoreListedUISourceCode(uiLocation.uiSourceCode)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.removeFromIgnore),
            () => Bindings.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(
                uiLocation.uiSourceCode));
      } else {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.addToIgnore),
            () => Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(
                uiLocation.uiSourceCode));
      }
    }
    contextMenu.appendApplicableItems(event);
    contextMenu.show();
  }

  if (!stackTrace) {
    return {element, links};
  }

  appendStackTrace(stackTrace);

  let asyncStackTrace = stackTrace.parent;
  while (asyncStackTrace) {
    if (!asyncStackTrace.callFrames.length) {
      asyncStackTrace = asyncStackTrace.parent;
      continue;
    }
    const row = contentElement.createChild('tr');
    row.createChild('td').textContent = '\n';
    row.createChild('td', 'stack-preview-async-description').textContent =
        UI.UIUtils.asyncStackTraceLabel(asyncStackTrace.description);
    row.createChild('td');
    row.createChild('td');
    if (appendStackTrace(asyncStackTrace)) {
      row.classList.add('ignore-listed');
    }
    asyncStackTrace = asyncStackTrace.parent;
  }

  if (totalHiddenCallFramesCount) {
    const row = contentElement.createChild('tr', 'show-ignore-listed-link');
    row.createChild('td').textContent = '\n';
    const cell = /** @type {!HTMLTableCellElement} */ (row.createChild('td'));
    cell.colSpan = 4;
    const showAllLink = cell.createChild('span', 'link');
    if (totalHiddenCallFramesCount === 1) {
      showAllLink.textContent = i18nString(UIStrings.showMoreFrame);
    } else {
      showAllLink.textContent = i18nString(UIStrings.showSMoreFrames, {PH1: totalHiddenCallFramesCount});
    }
    showAllLink.addEventListener('click', () => {
      contentElement.classList.add('show-ignore-listed');
      if (contentUpdated) {
        contentUpdated();
      }
    }, false);
  }

  return {element, links};
}

/**
 * @typedef {{
 *   stackTrace: (!Protocol.Runtime.StackTrace|undefined),
 *   contentUpdated: ((function(): *) | undefined),
 *   tabStops: (boolean|undefined)
 * }}
 */
// @ts-ignore typedef
export let Options;
