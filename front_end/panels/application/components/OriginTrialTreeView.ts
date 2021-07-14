// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/check_component_naming
import * as Protocol from '../../../generated/protocol.js';
import * as Adorners from '../../../ui/components/adorners/adorners.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as TreeOutline from '../../../ui/components/tree_outline/tree_outline.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

const UIStrings = {
  /**
  *@description Label for the 'origin' field in a parsed Origin Trial Token.
  */
  origin: 'Origin',
  /**
   *@description Label for `expiryTime` field in a parsed Origin Trial Token.
   */
  expiryTime: 'Expiry Time',
  /**
   *@description Label for `usageRestriction` field in a parsed Origin Trial Token.
   */
  usageRestriction: 'Usage Restriction',
  /**
   *@description Label for `isThirdParty` field in a parsed Origin Trial Token.
   */
  isThirdParty: 'Third Party',
  /**
   *@description Label for `matchSubDomains` field in a parsed Origin Trial Token.
   */
  matchSubDomains: 'Match Sub-Domains',
  /**
   *@description Label for `rawTokenText` field in an Origin Trial Token.
   */
  rawTokenText: 'Raw Token',
  /**
   *@description Label for `status` field in an Origin Trial Token.
   */
  status: 'Token Status',
  /**
   *@description Label for tokenWithStatus node.
   */
  token: 'Token',
  /**
   *@description suffix for tokenCountBadge.
   */
  tokens: 'tokens',
};

export interface BadgeData {
  badgeContent: string;
  style: 'error'|'success'|'secondary';
}

export class Badge extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-resources-origin-trial-tree-view-badge`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private adorner = new Adorners.Adorner.Adorner();

  set data(data: BadgeData) {
    this.render(data);
  }

  private render(data: BadgeData): void {
    const adornerContent = document.createElement('span');
    adornerContent.textContent = data.badgeContent;
    this.adorner.data = {
      name: 'badge',
      content: adornerContent,
    };
    this.adorner.classList.add(`badge-${data.style}`);


    LitHtml.render(
        // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
        LitHtml.html`
      <style>
        :host .badge-error {
          --override-adorner-text-color: var(--color-red);
          --override-adorner-border-color: var(--color-red);
        }

        :host .badge-success {
          --override-adorner-text-color: var(--color-accent-green);
          --override-adorner-border-color: var(--color-accent-green);
        }

        :host .badge-secondary {
          --override-adorner-text-color: var(--color-text-secondary);
          --override-adorner-border-color: var(--color-text-secondary);
        }

        /* Use mono-space source code font to assist reading of adorner content */
        :host {
          font-family: var(--source-code-font-family);
        }
      </style>
      ${this.adorner}
    `,
        this.shadow);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-resources-origin-trial-tree-view-badge', Badge);

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
    children: async(): Promise<TreeNode<OriginTrialTreeNodeData>[]> => originTrial.tokensWithStatus.length > 1 ?
        originTrial.tokensWithStatus.map(constructTokenNode) :
        constructTokenDetailsNodes(originTrial.tokensWithStatus[0]),
    renderer: (node: TreeNode<OriginTrialTreeNodeData>): LitHtml.TemplateResult => {
      const trial = node.treeNodeData as Protocol.Page.OriginTrial;
      const tokenCountBadge = LitHtml.html`
        <${Badge.litTagName} .data=${{
        badgeContent: `${trial.tokensWithStatus.length} ${UIStrings.tokens}`,
        style: 'secondary',
      } as BadgeData}></${Badge.litTagName}>
      `;

      return LitHtml.html`
        ${trial.trialName}
        <${Badge.litTagName} .data=${{
        badgeContent: trial.status,
        style: trial.status === Protocol.Page.OriginTrialStatus.Enabled ? 'success' : 'error',
      } as BadgeData}></${Badge.litTagName}>
        ${trial.tokensWithStatus.length > 1 ? tokenCountBadge : LitHtml.nothing}
      `;
    },
  };
}

function constructTokenNode(token: Protocol.Page.OriginTrialTokenWithStatus): TreeNode<OriginTrialTreeNodeData> {
  return {
    treeNodeData: token.status,
    children: async(): Promise<TreeNode<OriginTrialTreeNodeData>[]> => constructTokenDetailsNodes(token),
    renderer: (node: TreeNode<OriginTrialTreeNodeData>, state: {isExpanded: boolean}): LitHtml.TemplateResult => {
      const tokenStatus = node.treeNodeData as string;
      const statusBadge = LitHtml.html`
        <${Badge.litTagName} .data=${{
        badgeContent: tokenStatus,
        style: tokenStatus === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
      } as BadgeData}></${Badge.litTagName}>
      `;
      // Only display token status for convenience when the node is not expanded.
      return LitHtml.html`${UIStrings.token} ${state.isExpanded ? LitHtml.nothing : statusBadge}`;
    },
  };
}

interface TokenField {
  name: string;
  value: LitHtml.TemplateResult;
}

function renderTokenDetails(node: TreeNode<OriginTrialTreeNodeData>): LitHtml.TemplateResult {
  const tokenWithStatus = node.treeNodeData as Protocol.Page.OriginTrialTokenWithStatus;
  const status = tokenWithStatus.status;

  const renderTokenField = (fieldValue: string, hasError?: boolean): LitHtml.TemplateResult => LitHtml.html`
        <div class="${LitHtml.Directives.ifDefined(hasError ? 'error-text' : undefined)}">
          ${fieldValue}
        </div>`;

  const parsedToken = tokenWithStatus.parsedToken;
  const parsedTokenDetails: TokenField[] = parsedToken ?
      [
        {
          name: UIStrings.origin,
          value: renderTokenField(parsedToken.origin, status === Protocol.Page.OriginTrialTokenStatus.WrongOrigin),
        },
        {
          name: UIStrings.expiryTime,
          value: renderTokenField(
              new Date(parsedToken.expiryTime * 1000).toLocaleString(),
              status === Protocol.Page.OriginTrialTokenStatus.Expired),
        },
        {name: UIStrings.usageRestriction, value: renderTokenField(parsedToken.usageRestriction)},
        {name: UIStrings.isThirdParty, value: renderTokenField(parsedToken.isThirdParty.toString())},
        {name: UIStrings.matchSubDomains, value: renderTokenField(parsedToken.matchSubDomains.toString())},
      ] :
      [];

  const tokenDetails: TokenField[] = [
    {
      name: UIStrings.status,
      value: LitHtml.html`
        <${Badge.litTagName} .data=${{
        badgeContent: status,
        style: status === Protocol.Page.OriginTrialTokenStatus.Success ? 'success' : 'error',
      } as BadgeData}></${Badge.litTagName}>`,
    },
    ...parsedTokenDetails,
  ];

  const tokenDetailRows = tokenDetails.map((field: TokenField): LitHtml.TemplateResult => {
    return LitHtml.html`
        <div class="key">${field.name}</div>
        <div class="value">${field.value}</div>
        `;
  });
  // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
  return LitHtml.html`
      <style>
        .content {
          display: grid;
          grid-template-columns: min-content 1fr;
        }

        .key {
          color: var(--color-text-secondary);
          padding: 0 6px;
          text-align: right;
          white-space: pre;
        }

        .value {
          color: var(--color-text-primary);
          margin-inline-start: 0;
          padding: 0 6px;
        }

        .error-text {
          color: var(--color-red);
          font-weight: bold;
        }
      </style>
      <div class="content">
        ${tokenDetailRows}
      </div>
    `;
}

function constructTokenDetailsNodes(token: Protocol.Page.OriginTrialTokenWithStatus):
    TreeNode<OriginTrialTreeNodeData>[] {
  return [
    {
      treeNodeData: token,
      renderer: renderTokenDetails,
    },
    constructRawTokenTextNode(token.rawTokenText),
  ];
}

function constructRawTokenTextNode(tokenText: string): TreeNode<OriginTrialTreeNodeData> {
  return {
    treeNodeData: UIStrings.rawTokenText,
    children: async(): Promise<TreeNode<OriginTrialTreeNodeData>[]> => [{
      treeNodeData: tokenText,
      renderer: (data: TreeNode<OriginTrialTreeNodeData>): LitHtml.TemplateResult => {
        const tokenText = data.treeNodeData as string;
        return LitHtml.html`
        <div style="overflow-wrap: break-word;">
          ${tokenText}
        </div>
        `;
      },
    }],
  };
}

function defaultRenderer(node: TreeNode<OriginTrialTreeNodeData>): LitHtml.TemplateResult {
  return LitHtml.html`${String(node.treeNodeData)}`;
}

export interface OriginTrialTreeViewData {
  trials: Protocol.Page.OriginTrial[];
}

export class OriginTrialTreeView extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-resources-origin-trial-tree-view`;
  private readonly shadow = this.attachShadow({mode: 'open'});

  set data(data: OriginTrialTreeViewData) {
    this.render(data.trials);
  }

  private render(trials: Protocol.Page.OriginTrial[]): void {
    if (!trials.length) {
      return;
    }

    LitHtml.render(
        // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
        LitHtml.html`
      <style>
        :host {
          /* Disable default blue background on origin trial tree */
          --legacy-selection-bg-color: transparent;
        }
      </style>
      <${TreeOutline.TreeOutline.TreeOutline.litTagName} .data="${{
          tree: trials.map(constructOriginTrialTree),
          defaultRenderer,
        } as TreeOutline.TreeOutline.TreeOutlineData<OriginTrialTreeNodeData>}">
      </${TreeOutline.TreeOutline.TreeOutline.litTagName}>
    `,
        this.shadow);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-resources-origin-trial-tree-view', OriginTrialTreeView);
