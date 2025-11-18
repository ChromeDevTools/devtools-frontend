// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/components/expandable_list/expandable_list.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, nothing, render, type TemplateResult} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import stackTraceLinkButtonStyles from './stackTraceLinkButton.css.js';
import stackTraceRowStyles from './stackTraceRow.css.js';

const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Error message stating that something went wrong when trying to render stack trace
   */
  cannotRenderStackTrace: 'Cannot render stack trace',
  /**
   * @description A link to show more frames in the stack trace if more are available. Never 0.
   */
  showSMoreFrames: '{n, plural, =1 {Show # more frame} other {Show # more frames}}',
  /**
   * @description A link to rehide frames that are by default hidden.
   */
  showLess: 'Show less',
  /**
   * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
   * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
   */
  creationStackTrace: 'Frame Creation `Stack Trace`',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/components/StackTrace.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface StackTraceData {
  creationStackTraceData: {
    creationStackTrace: Protocol.Runtime.StackTrace|null,
    creationStackTraceTarget: SDK.Target.Target|null,
  };
  buildStackTraceRows: (
      stackTrace: Protocol.Runtime.StackTrace,
      target: SDK.Target.Target|null,
      linkifier: Components.Linkifier.Linkifier,
      tabStops: boolean|undefined,
      updateCallback?: (arg0: Array<Components.JSPresentationUtils.StackTraceRegularRow|
                                    Components.JSPresentationUtils.StackTraceAsyncRow>) => void,
      ) => Array<Components.JSPresentationUtils.StackTraceRegularRow|Components.JSPresentationUtils.StackTraceAsyncRow>;
}

interface StackTraceRowViewInput {
  stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow|null;
}

type StackTraceRowView = (input: StackTraceRowViewInput, output: undefined, target: HTMLElement) => void;
const ROW_DEFAULT_VIEW: StackTraceRowView = (input, output, target) => {
  if (!input.stackTraceRowItem) {
    return;
  }
  // clang-format off
  render(html`
    <style>${stackTraceRowStyles}</style>
    <div class="stack-trace-row">
      <div class="stack-trace-function-name text-ellipsis" title=${input.stackTraceRowItem.functionName}>
        ${input.stackTraceRowItem.functionName}
      </div>
      <div class="stack-trace-source-location">
        ${input.stackTraceRowItem.link ? html`
          <div class="text-ellipsis">\xA0@\xA0${input.stackTraceRowItem.link}</div>` :
          nothing}
        </div>
      </div>`, target);
  // clang-format on
};

export class StackTraceRow extends UI.Widget.Widget {
  constructor(element?: HTMLElement, view = ROW_DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow|null = null;
  #view: StackTraceRowView;

  override performUpdate(): void {
    this.#view(this, undefined, this.contentElement);
  }
}

interface StackTraceLinkViewInput {
  onShowAllClick: () => void;
  hiddenCallFramesCount: number|null;
  expandedView: boolean;
}

type StackTraceLinkView = (input: StackTraceLinkViewInput, output: undefined, target: HTMLElement) => void;
const LINK_DEFAULT_VIEW: StackTraceLinkView = (input, output, target) => {
  if (!input.hiddenCallFramesCount) {
    return;
  }
  const linkText = input.expandedView ? i18nString(UIStrings.showLess) :
                                        i18nString(UIStrings.showSMoreFrames, {n: input.hiddenCallFramesCount});
  // clang-format off
  render(html`
    <style>${stackTraceLinkButtonStyles}</style>
    <div class="stack-trace-row">
      <button class="link" @click=${() => input.onShowAllClick()}>
        ${linkText}
      </button>
    </div>`, target);
  // clang-format on
};

export class StackTraceLinkButton extends UI.Widget.Widget {
  onShowAllClick: () => void = () => {};
  hiddenCallFramesCount: number|null = null;
  expandedView = false;
  #view: StackTraceLinkView;

  constructor(element?: HTMLElement, view = LINK_DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  override performUpdate(): void {
    this.#view(this, undefined, this.contentElement);
  }
}

export class StackTrace extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #linkifier = new Components.Linkifier.Linkifier();
  #stackTraceRows:
      Array<Components.JSPresentationUtils.StackTraceRegularRow|Components.JSPresentationUtils.StackTraceAsyncRow> = [];
  #showHidden = false;

  set data(data: StackTraceData) {
    const {creationStackTrace, creationStackTraceTarget} = data.creationStackTraceData;
    if (creationStackTrace) {
      this.#stackTraceRows = data.buildStackTraceRows(
          creationStackTrace, creationStackTraceTarget, this.#linkifier, true,
          this.#onStackTraceRowsUpdated.bind(this));
    }
    this.#render();
  }

  #onStackTraceRowsUpdated(
      stackTraceRows:
          Array<Components.JSPresentationUtils.StackTraceRegularRow|Components.JSPresentationUtils.StackTraceAsyncRow>):
      void {
    this.#stackTraceRows = stackTraceRows;
    this.#render();
  }

  #onToggleShowAllClick(): void {
    this.#showHidden = !this.#showHidden;
    this.#render();
  }

  createRowTemplates(): TemplateResult[] {
    const expandableRows = [];
    let hiddenCallFramesCount = 0;
    for (const item of this.#stackTraceRows) {
      let ignoreListHide = false;
      // TODO(crbug.com/1183325): fix race condition with uiLocation still being null here
      // Note: This has always checked whether the call frame location *in the generated
      // code* is ignore-listed or not. This can change after the live location updates,
      // and is handled again in the linkifier live location update callback.
      if ('link' in item && item.link) {
        const uiLocation = Components.Linkifier.Linkifier.uiLocation(item.link);
        ignoreListHide = Boolean(uiLocation?.isIgnoreListed());
      }
      if (this.#showHidden || !ignoreListHide) {
        if ('functionName' in item) {
          expandableRows.push(html`
          <devtools-widget data-stack-trace-row .widgetConfig=${widgetConfig(StackTraceRow, {
            stackTraceRowItem: item
          })}></devtools-widget>`);
        }
        if ('asyncDescription' in item) {
          expandableRows.push(html`
            <div>${item.asyncDescription}</div>
          `);
        }
      }
      if ('functionName' in item && ignoreListHide) {
        hiddenCallFramesCount++;
      }
    }
    if (hiddenCallFramesCount) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      expandableRows.push(html`
        <devtools-widget data-stack-trace-row .widgetConfig=${widgetConfig(StackTraceLinkButton, {
          onShowAllClick: this.#onToggleShowAllClick.bind(this),
          hiddenCallFramesCount,
          expandedView: this.#showHidden})}>
        </devtools-widget>
      `);
      // clang-format on
    }

    return expandableRows;
  }

  #render(): void {
    if (!this.#stackTraceRows.length) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      render(
        html`
          <span>${i18nString(UIStrings.cannotRenderStackTrace)}</span>
        `,
        this.#shadow, {host: this});
      return;
    }

    const expandableRows = this.createRowTemplates();
    render(
      html`
        <devtools-expandable-list .data=${{rows: expandableRows, title: i18nString(UIStrings.creationStackTrace)}}
                                  jslog=${VisualLogging.tree()}>
        </devtools-expandable-list>
      `,
      this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-resources-stack-trace', StackTrace);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-stack-trace': StackTrace;
  }
}
