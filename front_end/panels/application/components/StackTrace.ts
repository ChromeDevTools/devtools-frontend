// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import type * as Protocol from '../../../generated/protocol.js';

import stackTraceRowStyles from './stackTraceRow.css.js';
import stackTraceLinkButtonStyles from './stackTraceLinkButton.css.js';

const UIStrings = {
  /**
   *@description Error message stating that something went wrong when tring to render stack trace
   */
  cannotRenderStackTrace: 'Cannot render stack trace',
  /**
   *@description A link to show more frames in the stack trace if more are available. Never 0.
   */
  showSMoreFrames: '{n, plural, =1 {Show # more frame} other {Show # more frames}}',
  /**
   *@description A link to rehide frames that are by default hidden.
   */
  showLess: 'Show less',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/StackTrace.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface StackTraceData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  buildStackTraceRows: (
      stackTrace: Protocol.Runtime.StackTrace,
      target: SDK.Target.Target|null,
      linkifier: Components.Linkifier.Linkifier,
      tabStops: boolean|undefined,
      updateCallback?: (arg0: (Components.JSPresentationUtils.StackTraceRegularRow|
                               Components.JSPresentationUtils.StackTraceAsyncRow)[]) => void,
      ) => (Components.JSPresentationUtils.StackTraceRegularRow | Components.JSPresentationUtils.StackTraceAsyncRow)[];
}

interface StackTraceRowData {
  stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow;
}

export class StackTraceRow extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-stack-trace-row`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow|null = null;

  set data(data: StackTraceRowData) {
    this.#stackTraceRowItem = data.stackTraceRowItem;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [stackTraceRowStyles];
  }

  #render(): void {
    if (!this.#stackTraceRowItem) {
      return;
    }
    LitHtml.render(
        LitHtml.html`
      <div class="stack-trace-row">
              <div class="stack-trace-function-name text-ellipsis" title=${this.#stackTraceRowItem.functionName}>
                ${this.#stackTraceRowItem.functionName}
              </div>
              <div class="stack-trace-source-location">
                ${
            this.#stackTraceRowItem.link ?
                LitHtml.html`<div class="text-ellipsis">\xA0@\xA0${this.#stackTraceRowItem.link}</div>` :
                LitHtml.nothing}
              </div>
            </div>
    `,
        this.#shadow, {host: this});
  }
}

interface StackTraceLinkButtonData {
  onShowAllClick: () => void;
  hiddenCallFramesCount: number;
  expandedView: boolean;
}

export class StackTraceLinkButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-stack-trace-link-button`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #onShowAllClick: () => void = () => {};
  #hiddenCallFramesCount: number|null = null;
  #expandedView: boolean = false;

  set data(data: StackTraceLinkButtonData) {
    this.#onShowAllClick = data.onShowAllClick;
    this.#hiddenCallFramesCount = data.hiddenCallFramesCount;
    this.#expandedView = data.expandedView;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [stackTraceLinkButtonStyles];
  }

  #render(): void {
    if (!this.#hiddenCallFramesCount) {
      return;
    }
    const linkText = this.#expandedView ? i18nString(UIStrings.showLess) :
                                          i18nString(UIStrings.showSMoreFrames, {n: this.#hiddenCallFramesCount});
    LitHtml.render(
        LitHtml.html`
      <div class="stack-trace-row">
          <button class="link" @click=${(): void => this.#onShowAllClick()}>
            ${linkText}
          </button>
        </div>
    `,
        this.#shadow, {host: this});
  }
}

export class StackTrace extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-resources-stack-trace`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #linkifier = new Components.Linkifier.Linkifier();
  #stackTraceRows: (Components.JSPresentationUtils.StackTraceRegularRow|
                    Components.JSPresentationUtils.StackTraceAsyncRow)[] = [];
  #showHidden = false;

  set data(data: StackTraceData) {
    const frame = data.frame;
    const {creationStackTrace, creationStackTraceTarget} = frame.getCreationStackTraceData();
    if (creationStackTrace) {
      this.#stackTraceRows = data.buildStackTraceRows(
          creationStackTrace, creationStackTraceTarget, this.#linkifier, true,
          this.#onStackTraceRowsUpdated.bind(this));
    }
    this.#render();
  }

  #onStackTraceRowsUpdated(stackTraceRows: (Components.JSPresentationUtils.StackTraceRegularRow|
                                            Components.JSPresentationUtils.StackTraceAsyncRow)[]): void {
    this.#stackTraceRows = stackTraceRows;
    this.#render();
  }

  #onToggleShowAllClick(): void {
    this.#showHidden = !this.#showHidden;
    this.#render();
  }

  createRowTemplates(): LitHtml.TemplateResult[] {
    const expandableRows = [];
    let hiddenCallFramesCount = 0;
    for (const item of this.#stackTraceRows) {
      if (this.#showHidden || !item.ignoreListHide) {
        if ('functionName' in item) {
          expandableRows.push(LitHtml.html`
          <${StackTraceRow.litTagName} data-stack-trace-row .data=${{
            stackTraceRowItem: item,
          } as StackTraceRowData}></${StackTraceRow.litTagName}>`);
        }
        if ('asyncDescription' in item) {
          expandableRows.push(LitHtml.html`
            <div>${item.asyncDescription}</div>
          `);
        }
      }
      if ('functionName' in item && item.ignoreListHide) {
        hiddenCallFramesCount++;
      }
    }
    if (hiddenCallFramesCount) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      expandableRows.push(LitHtml.html`
      <${StackTraceLinkButton.litTagName} data-stack-trace-row .data=${{onShowAllClick: this.#onToggleShowAllClick.bind(this), hiddenCallFramesCount, expandedView: this.#showHidden} as StackTraceLinkButtonData}></${StackTraceLinkButton.litTagName}>
      `);
      // clang-format on
    }

    return expandableRows;
  }

  #render(): void {
    if (!this.#stackTraceRows.length) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(
        LitHtml.html`
          <span>${i18nString(UIStrings.cannotRenderStackTrace)}</span>
        `,
        this.#shadow, {host: this});
      return;
    }
    const expandableRows = this.createRowTemplates();
    LitHtml.render(
      LitHtml.html`
        <${ExpandableList.ExpandableList.ExpandableList.litTagName} .data=${{
          rows: expandableRows,
        } as ExpandableList.ExpandableList.ExpandableListData}>
        </${ExpandableList.ExpandableList.ExpandableList.litTagName}>
      `,
      this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-stack-trace-row', StackTraceRow);
ComponentHelpers.CustomElements.defineComponent('devtools-stack-trace-link-button', StackTraceLinkButton);
ComponentHelpers.CustomElements.defineComponent('devtools-resources-stack-trace', StackTrace);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-stack-trace-row': StackTraceRow;
    'devtools-stack-trace-link-button': StackTraceLinkButton;
    'devtools-resources-stack-trace': StackTrace;
  }
}
