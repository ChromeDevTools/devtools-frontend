// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';
import '../../ui/legacy/legacy.js';
import '../../ui/components/adorners/adorners.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';

import originTrialTokenRowsStyles from './originTrialTokenRows.css.js';
import originTrialTreeViewStyles from './originTrialTreeView.css.js';

const {classMap} = Directives;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Label for the 'origin' field in a parsed Origin Trial Token.
   */
  origin: 'Origin',
  /**
   * @description Label for `trialName` field in a parsed Origin Trial Token.
   * This field is only shown when token has unknown trial name as the token
   * will be put into 'UNKNOWN' group.
   */
  trialName: 'Trial Name',
  /**
   * @description Label for `expiryTime` field in a parsed Origin Trial Token.
   */
  expiryTime: 'Expiry Time',
  /**
   * @description Label for `usageRestriction` field in a parsed Origin Trial Token.
   */
  usageRestriction: 'Usage Restriction',
  /**
   * @description Label for `isThirdParty` field in a parsed Origin Trial Token.
   */
  isThirdParty: 'Third Party',
  /**
   * @description Label for a field containing info about an Origin Trial Token's `matchSubDomains` field.
   *An Origin Trial Token contains an origin URL. The `matchSubDomains` field describes whether the token
   *only applies to the origin URL or to all subdomains of the origin URL as well.
   *The field contains either 'true' or 'false'.
   */
  matchSubDomains: 'Subdomain Matching',
  /**
   * @description Label for the raw(= encoded / not human-readable) Origin Trial Token.
   */
  rawTokenText: 'Raw Token',
  /**
   * @description Label for `status` field in an Origin Trial Token.
   */
  status: 'Token Status',
  /**
   * @description Label for tokenWithStatus node.
   */
  token: 'Token',
  /**
   * @description Label for a badge showing the number of Origin Trial Tokens. This number is always greater than 1.
   * @example {2} PH1
   */
  tokens: '{PH1} tokens',
  /**
   * @description Label shown when there are no Origin Trial Tokens in the Frame view of the Application panel.
   */
  noTrialTokens: 'No trial tokens',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/OriginTrialTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type TreeNode<DataType> = TreeOutline.TreeOutlineUtils.TreeNode<DataType>;

/**
 * The Origin Trial Tree has 4 levels of content:
 * - Origin Trial (has multiple Origin Trial tokens)
 * - Origin Trial Token (has only 1 raw token text)
 * - Fields in Origin Trial Token
 * - Raw Origin Trial Token text (folded because the content is long)
 **/
export type OriginTrialTreeNodeData = Protocol.Page.OriginTrial|Protocol.Page.OriginTrialTokenWithStatus|string;

function renderOriginTrialTree(originTrial: Protocol.Page.OriginTrial): LitTemplate {
  const success = originTrial.status === Protocol.Page.OriginTrialStatus.Enabled;
  // clang-format off
  return html`
    <li role="treeitem">
      ${originTrial.trialName}
      <devtools-adorner class="badge-${success ? 'success' : 'error'}">
        ${originTrial.status}
      </devtools-adorner>
      ${originTrial.tokensWithStatus.length > 1 ?  html`
        <devtools-adorner class="badge-secondary">
          ${i18nString(UIStrings.tokens, {PH1: originTrial.tokensWithStatus.length})}
        </devtools-adorner>`
        : nothing}
      <ul role="group" hidden>
        ${originTrial.tokensWithStatus.length > 1 ?
          originTrial.tokensWithStatus.map(renderTokenNode) :
          renderTokenDetailsNodes(originTrial.tokensWithStatus[0])}
      </ul>
    </li>`;
  // clang-format on
}

function renderTokenNode(token: Protocol.Page.OriginTrialTokenWithStatus): LitTemplate {
  const success = token.status === Protocol.Page.OriginTrialTokenStatus.Success;
  // Only display token status for convenience when the node is not expanded.
  // clang-format off
  return html`
    <li role="treeitem">
      ${i18nString(UIStrings.token)}
      <devtools-adorner class="token-status-badge badge-${success ? 'success' : 'error'}">
        ${token.status}
      </devtools-adorner>
      <ul role="group" hidden>
        ${renderTokenDetailsNodes(token)}
      </ul>
    </li>`;
}

interface TokenField {
  name: string;
  value: {text: string, hasError?: boolean};
}

function renderTokenDetails(token: Protocol.Page.OriginTrialTokenWithStatus): TemplateResult {
  return html`
    <li role="treeitem">
      <devtools-widget .widgetConfig=${widgetConfig(OriginTrialTokenRows, {data: token})}>
      </devtools-widget>
    </li>`;
}

function renderTokenDetailsNodes(token: Protocol.Page.OriginTrialTokenWithStatus):
    TemplateResult {
  // clang-format off
  return html`
    ${renderTokenDetails(token)}
    ${renderRawTokenTextNode(token.rawTokenText)}
  `;
  // clang-format on
}

function renderRawTokenTextNode(tokenText: string): LitTemplate {
  // clang-format off
  return html`
    <li role="treeitem">
      ${i18nString(UIStrings.rawTokenText)}
      <ul role="group" hidden>
        <li role="treeitem">
          <div style="overflow-wrap: break-word;">
            ${tokenText}
          </div>
        </li>
      </ul>
    </li>`;
  // clang-format on
}

export interface OriginTrialTokenRowsData {
  node: TreeNode<OriginTrialTreeNodeData>;
}

interface RowsViewInput {
  tokenWithStatus: Protocol.Page.OriginTrialTokenWithStatus;
  parsedTokenDetails: TokenField[];
}

type RowsView = (input: RowsViewInput, output: undefined, target: HTMLElement) => void;

const ROWS_DEFAULT_VIEW: RowsView = (input, _output, target) => {
  const success = input.tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.Success;
  // clang-format off
  render(html`
    <style>
      ${originTrialTokenRowsStyles}
      ${originTrialTreeViewStyles}
    </style>
    <div class="content">
      <div class="key">${i18nString(UIStrings.status)}</div>
      <div class="value">
        <devtools-adorner class="badge-${success ? 'success' : 'error'}">
          ${input.tokenWithStatus.status}
        </devtools-adorner>
      </div>
      ${input.parsedTokenDetails.map((field: TokenField) => html`
        <div class="key">${field.name}</div>
        <div class="value">
          <div class=${classMap({'error-text': Boolean(field.value.hasError)})}>
            ${field.value.text}
          </div>
        </div>
      `)}
    </div>`, target);
  // clang-format on
};

export class OriginTrialTokenRows extends UI.Widget.Widget {
  #view: RowsView;
  #tokenWithStatus: Protocol.Page.OriginTrialTokenWithStatus|null = null;
  #parsedTokenDetails: TokenField[] = [];
  #dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
      i18n.DevToolsLocale.DevToolsLocale.instance().locale,
      {dateStyle: 'long', timeStyle: 'long'},
  );

  constructor(element?: HTMLElement, view: RowsView = ROWS_DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set data(data: Protocol.Page.OriginTrialTokenWithStatus) {
    this.#tokenWithStatus = data;
    this.#setTokenFields();
  }

  connectedCallback(): void {
    this.requestUpdate();
  }

  #setTokenFields(): void {
    if (!this.#tokenWithStatus?.parsedToken) {
      return;
    }
    this.#parsedTokenDetails = [
      {
        name: i18nString(UIStrings.origin),
        value: {
          text: this.#tokenWithStatus.parsedToken.origin,
          hasError: this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.WrongOrigin,
        },
      },
      {
        name: i18nString(UIStrings.expiryTime),
        value: {
          text: this.#dateFormatter.format(this.#tokenWithStatus.parsedToken.expiryTime * 1000),
          hasError: this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.Expired
        },
      },
      {
        name: i18nString(UIStrings.usageRestriction),
        value: {text: this.#tokenWithStatus.parsedToken.usageRestriction},
      },
      {
        name: i18nString(UIStrings.isThirdParty),
        value: {text: this.#tokenWithStatus.parsedToken.isThirdParty.toString()},
      },
      {
        name: i18nString(UIStrings.matchSubDomains),
        value: {text: this.#tokenWithStatus.parsedToken.matchSubDomains.toString()},
      },
    ];

    if (this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.UnknownTrial) {
      this.#parsedTokenDetails = [
        {
          name: i18nString(UIStrings.trialName),
          value: {text: this.#tokenWithStatus.parsedToken.trialName},
        },
        ...this.#parsedTokenDetails,
      ];
    }
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#tokenWithStatus) {
      return;
    }

    const viewInput: RowsViewInput = {
      tokenWithStatus: this.#tokenWithStatus,
      parsedTokenDetails: this.#parsedTokenDetails,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}

export interface OriginTrialTreeViewData {
  trials: Protocol.Page.OriginTrial[];
}

type View = (input: OriginTrialTreeViewData, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input.trials.length) {
    // clang-format off
    render(html`
      <span class="status-badge">
        <devtools-icon class="medium" name="clear"></devtools-icon>
        <span>${i18nString(UIStrings.noTrialTokens)}</span>
      </span>`, target);
    // clang-format on
    return;
  }

  // clang-format off
  render(html`
    <style>${originTrialTreeViewStyles}</style>
    <devtools-tree .template=${html`
      <style>${originTrialTreeViewStyles}</style>
      <ul role="tree">
        ${input.trials.map(renderOriginTrialTree)}
      </ul>
    `}>
    </devtools-tree>
  `, target);
  // clang-format on
};

export class OriginTrialTreeView extends UI.Widget.Widget {
  #data: OriginTrialTreeViewData = {trials: []};
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set data(data: OriginTrialTreeViewData) {
    this.#data = data;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(this.#data, undefined, this.contentElement);
  }
}
