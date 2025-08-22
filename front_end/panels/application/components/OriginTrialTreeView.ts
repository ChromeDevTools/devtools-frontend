// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/tree_outline/tree_outline.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Adorners from '../../../ui/components/adorners/adorners.js';
import type * as TreeOutline from '../../../ui/components/tree_outline/tree_outline.js';
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
}

export class Badge extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #adorner = new Adorners.Adorner.Adorner();

  set data(data: BadgeData) {
    this.#render(data);
  }

  #render(data: BadgeData): void {
    const adornerContent = document.createElement('span');
    adornerContent.textContent = data.badgeContent;
    this.#adorner.data = {
      name: 'badge',
      content: adornerContent,
    };
    this.#adorner.classList.add(`badge-${data.style}`);

    Lit.render(
        html`
      <style>${badgeStyles}</style>
      ${this.#adorner}
    `,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-resources-origin-trial-tree-view-badge', Badge);

type TreeNode<DataType> = TreeOutline.TreeOutlineUtils.TreeNode<DataType>;

// The Origin Trial Tree has 4 levels of content:
// - Origin Trial (has multiple Origin Trial tokens)
// - Origin Trial Token (has only 1 raw token text)
// - Fields in Origin Trial Token
// - Raw Origin Trial Token text (folded because the content is long)
export type OriginTrialTreeNodeData = Protocol.Page.OriginTrial|Protocol.Page.OriginTrialTokenWithStatus|string;

function constructOriginTrialTree(originTrial: Protocol.Page.OriginTrial): TreeNode<OriginTrialTreeNodeData> {
  return {
    treeNodeData: originTrial,
    id: 'OriginTrialTreeNode#' + originTrial.trialName,
    children: async () => originTrial.tokensWithStatus.length > 1 ?
        originTrial.tokensWithStatus.map(constructTokenNode) :
        constructTokenDetailsNodes(originTrial.tokensWithStatus[0]),
    renderer: (node: TreeNode<OriginTrialTreeNodeData>) => {
      const trial = node.treeNodeData as Protocol.Page.OriginTrial;
      const tokenCountBadge = html`
        <devtools-resources-origin-trial-tree-view-badge .data=${{
        badgeContent: i18nString(UIStrings.tokens, {PH1: trial.tokensWithStatus.length}),
        style: 'secondary',
      } as BadgeData}></devtools-resources-origin-trial-tree-view-badge>
      `;

      return html`
        ${trial.trialName}
        <devtools-resources-origin-trial-tree-view-badge .data=${{
        badgeContent: trial.status,
        style: trial.status === Protocol.Page.OriginTrialStatus.Enabled ? 'success' : 'error',
      } as BadgeData}></devtools-resources-origin-trial-tree-view-badge>
        ${trial.tokensWithStatus.length > 1 ? tokenCountBadge : Lit.nothing}
      `;
    },
  };
}

function constructTokenNode(token: Protocol.Page.OriginTrialTokenWithStatus): TreeNode<OriginTrialTreeNodeData> {
  return {
    treeNodeData: token.status,
    id: 'TokenNode#' + token.rawTokenText,
    children: async () => constructTokenDetailsNodes(token),
    renderer: (node: TreeNode<OriginTrialTreeNodeData>, state: {isExpanded: boolean}) => {
      const tokenStatus = node.treeNodeData as string;
      const statusBadge = html`
        <devtools-resources-origin-trial-tree-view-badge .data=${{
        badgeContent: tokenStatus,
        style: tokenStatus === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
      } as BadgeData}></devtools-resources-origin-trial-tree-view-badge>
      `;
      // Only display token status for convenience when the node is not expanded.
      return html`${i18nString(UIStrings.token)} ${state.isExpanded ? Lit.nothing : statusBadge}`;
    },
  };
}

interface TokenField {
  name: string;
  value: Lit.TemplateResult;
}

function renderTokenDetails(node: TreeNode<OriginTrialTreeNodeData>): Lit.TemplateResult {
  return html`
    <devtools-resources-origin-trial-token-rows .data=${{node} as OriginTrialTokenRowsData}>
    </devtools-resources-origin-trial-token-rows>
    `;
}

function constructTokenDetailsNodes(token: Protocol.Page.OriginTrialTokenWithStatus):
    Array<TreeNode<OriginTrialTreeNodeData>> {
  return [
    {
      treeNodeData: token,
      id: 'TokenDetailsNode#' + token.rawTokenText,
      renderer: renderTokenDetails,
    },
    constructRawTokenTextNode(token.rawTokenText),
  ];
}

function constructRawTokenTextNode(tokenText: string): TreeNode<OriginTrialTreeNodeData> {
  return {
    treeNodeData: i18nString(UIStrings.rawTokenText),
    id: 'TokenRawTextContainerNode#' + tokenText,
    children: async () => [{
      treeNodeData: tokenText,
      id: 'TokenRawTextNode#' + tokenText,
      renderer: (data: TreeNode<OriginTrialTreeNodeData>) => {
        const tokenText = data.treeNodeData as string;
        return html`
        <div style="overflow-wrap: break-word;">
          ${tokenText}
        </div>
        `;
      },
    }],
  };
}

function defaultRenderer(node: TreeNode<OriginTrialTreeNodeData>): Lit.TemplateResult {
  return html`${String(node.treeNodeData)}`;
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

  set data(data: OriginTrialTokenRowsData) {
    this.#tokenWithStatus = data.node.treeNodeData as Protocol.Page.OriginTrialTokenWithStatus;
    this.#setTokenFields();
  }

  connectedCallback(): void {
    this.#render();
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
          <devtools-resources-origin-trial-tree-view-badge .data=${{
          badgeContent: this.#tokenWithStatus.status,
          style: this.#tokenWithStatus.status === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
        } as BadgeData}></devtools-resources-origin-trial-tree-view-badge>`,
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
      <style>${originTrialTokenRowsStyles}</style>
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

export class OriginTrialTreeView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  set data(data: OriginTrialTreeViewData) {
    this.#render(data.trials);
  }

  #render(trials: Protocol.Page.OriginTrial[]): void {
    if (!trials.length) {
      Lit.render(
          html`
    <style>${originTrialTreeViewStyles}</style>
    <span class="status-badge">
      <devtools-icon class="medium" name="clear"></devtools-icon>
      <span>${i18nString(UIStrings.noTrialTokens)}</span>
    </span>`,
          this.#shadow, {host: this});
      return;
    }

    Lit.render(
        html`
      <style>${originTrialTreeViewStyles}</style>
      <devtools-tree-outline .data=${{
          tree: trials.map(constructOriginTrialTree),
          defaultRenderer,
        } as TreeOutline.TreeOutline.TreeOutlineData < OriginTrialTreeNodeData >}>
      </devtools-tree-outline>
    `,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-resources-origin-trial-tree-view', OriginTrialTreeView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-origin-trial-tree-view': OriginTrialTreeView;
    'devtools-resources-origin-trial-token-rows': OriginTrialTokenRows;
    'devtools-resources-origin-trial-tree-view-badge': Badge;
  }
}
