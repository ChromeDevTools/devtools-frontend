// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Adorners from '../../../ui/components/adorners/adorners.js';
import type * as TreeOutline from '../../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import badgeStyles from './badge.css.js';
import originTrialTokenRowsStyles from './originTrialTokenRows.css.js';
import originTrialTreeViewStyles from './originTrialTreeView.css.js';

const {html, Directives: {ifDefined}} = Lit;

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
const str_ = i18n.i18n.registerUIStrings('panels/application/components/OriginTrialTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface BadgeData {
  badgeContent: string;
  style: 'error'|'success'|'secondary';
  additionalClass?: string;
}

function createBadge(data: BadgeData): Adorners.Adorner.Adorner {
  const adorner = new Adorners.Adorner.Adorner();
  const adornerContent = document.createElement('span');
  adornerContent.textContent = data.badgeContent;
  adorner.data = {
    name: 'badge',
    content: adornerContent,
  };
  adorner.classList.add(`badge-${data.style}`);
  if (data.additionalClass) {
    adorner.classList.add(data.additionalClass);
  }
  return adorner;
}

type TreeNode<DataType> = TreeOutline.TreeOutlineUtils.TreeNode<DataType>;

/**
 * The Origin Trial Tree has 4 levels of content:
 * - Origin Trial (has multiple Origin Trial tokens)
 * - Origin Trial Token (has only 1 raw token text)
 * - Fields in Origin Trial Token
 * - Raw Origin Trial Token text (folded because the content is long)
 **/
export type OriginTrialTreeNodeData = Protocol.Page.OriginTrial|Protocol.Page.OriginTrialTokenWithStatus|string;

function constructOriginTrialTree(originTrial: Protocol.Page.OriginTrial): Lit.LitTemplate {
  const tokenCountBadge = createBadge({
    badgeContent: i18nString(UIStrings.tokens, {PH1: originTrial.tokensWithStatus.length}),
    style: 'secondary',
  });

  // clang-format off
  return html`
    <li role="treeitem">
      ${originTrial.trialName}
      <style>${badgeStyles}</style>
      ${createBadge({
        badgeContent: originTrial.status,
        style: originTrial.status === Protocol.Page.OriginTrialStatus.Enabled ? 'success' : 'error',
      })}
      ${originTrial.tokensWithStatus.length > 1 ? tokenCountBadge : Lit.nothing}
      <ul role="group" hidden>
        ${originTrial.tokensWithStatus.length > 1 ?
          originTrial.tokensWithStatus.map(constructTokenNode) :
          constructTokenDetailsNodes(originTrial.tokensWithStatus[0])}
      </ul>
    </li>`;
  // clang-format on
}

function constructTokenNode(token: Protocol.Page.OriginTrialTokenWithStatus): Lit.LitTemplate {
  const statusBadge = createBadge({
    badgeContent: token.status,
    style: token.status === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
    additionalClass: 'token-status-badge',
  });
  // Only display token status for convenience when the node is not expanded.
  // clang-format off
  return html`
    <li role="treeitem">
      ${i18nString(UIStrings.token)} ${statusBadge}
      <ul role="group" hidden>
        ${constructTokenDetailsNodes(token)}
      </ul>
    </li>`;
}

interface TokenField {
  name: string;
  value: Lit.TemplateResult;
}

function renderTokenDetails(token: Protocol.Page.OriginTrialTokenWithStatus): Lit.TemplateResult {
  return html`
    <li role="treeitem">
      <devtools-resources-origin-trial-token-rows .data=${token}>
      </devtools-resources-origin-trial-token-rows>
    </li>`;
}

function constructTokenDetailsNodes(token: Protocol.Page.OriginTrialTokenWithStatus):
    Lit.LitTemplate {
  // clang-format off
  return html`
    ${renderTokenDetails(token)}
    ${constructRawTokenTextNode(token.rawTokenText)}
  `;
  // clang-format on
}

function constructRawTokenTextNode(tokenText: string): Lit.LitTemplate {
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

export class OriginTrialTokenRows extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #tokenWithStatus: Protocol.Page.OriginTrialTokenWithStatus|null = null;
  #parsedTokenDetails: TokenField[] = [];
  #dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
      i18n.DevToolsLocale.DevToolsLocale.instance().locale,
      {dateStyle: 'long', timeStyle: 'long'},
  );

  set data(data: Protocol.Page.OriginTrialTokenWithStatus) {
    this.#tokenWithStatus = data;
    this.#setTokenFields();
  }

  connectedCallback(): void {
    this.#render();
  }

  override cloneNode(): HTMLElement {
    const clone = UI.UIUtils.cloneCustomElement(this);
    if (this.#tokenWithStatus) {
      clone.data = this.#tokenWithStatus;
    }
    return clone;
  }

  #renderTokenField = (fieldValue: string, hasError?: boolean): Lit.TemplateResult => html`
        <div class=${ifDefined(hasError ? 'error-text' : undefined)}>
          ${fieldValue}
        </div>`;

  #setTokenFields(): void {
    if (!this.#tokenWithStatus?.parsedToken) {
      return;
    }
    this.#parsedTokenDetails = [
      {
        name: i18nString(UIStrings.origin),
        value: this.#renderTokenField(
            this.#tokenWithStatus.parsedToken.origin,
            this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.WrongOrigin),
      },
      {
        name: i18nString(UIStrings.expiryTime),
        value: this.#renderTokenField(
            this.#dateFormatter.format(this.#tokenWithStatus.parsedToken.expiryTime * 1000),
            this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.Expired),
      },
      {
        name: i18nString(UIStrings.usageRestriction),
        value: this.#renderTokenField(this.#tokenWithStatus.parsedToken.usageRestriction),
      },
      {
        name: i18nString(UIStrings.isThirdParty),
        value: this.#renderTokenField(this.#tokenWithStatus.parsedToken.isThirdParty.toString()),
      },
      {
        name: i18nString(UIStrings.matchSubDomains),
        value: this.#renderTokenField(this.#tokenWithStatus.parsedToken.matchSubDomains.toString()),
      },
    ];

    if (this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.UnknownTrial) {
      this.#parsedTokenDetails = [
        {
          name: i18nString(UIStrings.trialName),
          value: this.#renderTokenField(this.#tokenWithStatus.parsedToken.trialName),
        },
        ...this.#parsedTokenDetails,
      ];
    }
  }

  #render(): void {
    if (!this.#tokenWithStatus) {
      return;
    }

    const tokenDetails: TokenField[] = [
      {
        name: i18nString(UIStrings.status),
        value: html`
          <style>${badgeStyles}</style>
          ${createBadge({
          badgeContent: this.#tokenWithStatus.status,
          style: this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
        })}`,
      },
      ...this.#parsedTokenDetails,
    ];

    const tokenDetailRows = tokenDetails.map((field: TokenField) => {
      return html`
          <div class="key">${field.name}</div>
          <div class="value">${field.value}</div>
          `;
    });

    Lit.render(
        html`
      <style>
        ${originTrialTokenRowsStyles}
      </style>
      <div class="content">
        ${tokenDetailRows}
      </div>
    `,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-resources-origin-trial-token-rows', OriginTrialTokenRows);

export interface OriginTrialTreeViewData {
  trials: Protocol.Page.OriginTrial[];
}

type View = (input: OriginTrialTreeViewData, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input.trials.length) {
    // clang-format off
    Lit.render(html`
      <style>${originTrialTreeViewStyles}</style>
      <span class="status-badge">
        <devtools-icon class="medium" name="clear"></devtools-icon>
        <span>${i18nString(UIStrings.noTrialTokens)}</span>
      </span>`, target);
    // clang-format on
    return;
  }

  // clang-format off
  Lit.render(html`
    <style>
      ${originTrialTreeViewStyles}
    </style>
    <devtools-tree .template=${html`
      <ul role="tree">
        ${input.trials.map(constructOriginTrialTree)}
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

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-origin-trial-token-rows': OriginTrialTokenRows;
  }
}
