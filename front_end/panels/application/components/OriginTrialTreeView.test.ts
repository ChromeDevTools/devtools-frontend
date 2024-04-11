// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import {
  getElementWithinComponent,
  renderElementIntoDOM,
  stripLitHtmlCommentNodes,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as TreeOutline from '../../../ui/components/tree_outline/tree_outline.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderOriginTrialTreeView(
    data: ApplicationComponents.OriginTrialTreeView.OriginTrialTreeViewData,
    ): Promise<{
  component: ApplicationComponents.OriginTrialTreeView.OriginTrialTreeView,
  shadowRoot: ShadowRoot,
}> {
  const component = new ApplicationComponents.OriginTrialTreeView.OriginTrialTreeView();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();
  return {
    component,
    shadowRoot: component.shadowRoot,
  };
}

type OriginTrialTreeOutline =
    TreeOutline.TreeOutline.TreeOutline<ApplicationComponents.OriginTrialTreeView.OriginTrialTreeNodeData>;

/**
 * Extract `TreeOutline` component from `OriginTrialTreeView` for inspection.
 */
async function renderOriginTrialTreeViewTreeOutline(
    data: ApplicationComponents.OriginTrialTreeView.OriginTrialTreeViewData,
    ): Promise<{
  component: OriginTrialTreeOutline,
  shadowRoot: ShadowRoot,
}> {
  const {component} = await renderOriginTrialTreeView(data);
  const treeOutline: OriginTrialTreeOutline =
      getElementWithinComponent<ApplicationComponents.OriginTrialTreeView.OriginTrialTreeView, OriginTrialTreeOutline>(
          component, 'devtools-tree-outline', TreeOutline.TreeOutline.TreeOutline);
  assert.isNotNull(treeOutline.shadowRoot);
  return {
    component: treeOutline,
    shadowRoot: treeOutline.shadowRoot,
  };
}

const tokenPlaceHolder = 'Origin Trial Token Placeholder';
const trialWithMultipleTokens: Protocol.Page.OriginTrial = {
  trialName: 'AppCache',
  status: Protocol.Page.OriginTrialStatus.Enabled,
  tokensWithStatus: [
    {
      status: Protocol.Page.OriginTrialTokenStatus.Success,
      rawTokenText: tokenPlaceHolder,
      parsedToken: {
        trialName: 'AppCache',
        origin: 'https://foo.com',
        expiryTime: 1000,
        usageRestriction: Protocol.Page.OriginTrialUsageRestriction.None,
        isThirdParty: false,
        matchSubDomains: false,
      },
    },
    {
      status: Protocol.Page.OriginTrialTokenStatus.Expired,
      rawTokenText: tokenPlaceHolder,
      parsedToken: {
        trialName: 'AppCache',
        origin: 'https://foo.com',
        expiryTime: 1000,
        usageRestriction: Protocol.Page.OriginTrialUsageRestriction.None,
        isThirdParty: false,
        matchSubDomains: false,
      },
    },
    {
      status: Protocol.Page.OriginTrialTokenStatus.WrongOrigin,
      rawTokenText: tokenPlaceHolder,
      parsedToken: {
        trialName: 'AppCache',
        origin: 'https://bar.com',
        expiryTime: 1000,
        usageRestriction: Protocol.Page.OriginTrialUsageRestriction.None,
        isThirdParty: false,
        matchSubDomains: false,
      },
    },
  ],
};

const trialWithSingleToken: Protocol.Page.OriginTrial = {
  trialName: 'AutoPictureInPicture',
  status: Protocol.Page.OriginTrialStatus.ValidTokenNotProvided,
  tokensWithStatus: [
    {
      status: Protocol.Page.OriginTrialTokenStatus.NotSupported,
      rawTokenText: tokenPlaceHolder,
      parsedToken: {
        trialName: 'AutoPictureInPicture',
        origin: 'https://foo.com',
        expiryTime: 1000,
        usageRestriction: Protocol.Page.OriginTrialUsageRestriction.None,
        isThirdParty: false,
        matchSubDomains: false,
      },
    },
  ],
};

const trialWithUnparsableToken: Protocol.Page.OriginTrial = {
  trialName: 'UNKNOWN',
  status: Protocol.Page.OriginTrialStatus.ValidTokenNotProvided,
  tokensWithStatus: [
    {
      status: Protocol.Page.OriginTrialTokenStatus.InvalidSignature,
      rawTokenText: tokenPlaceHolder,
    },
  ],
};

function extractBadgeTextFromTreeNode(node: HTMLLIElement): string[] {
  return [...node.querySelectorAll('devtools-resources-origin-trial-tree-view-badge')].map(badgeElement => {
    const adornerElement = badgeElement.shadowRoot!.querySelector('devtools-adorner');
    assert.isNotNull(adornerElement);
    if (adornerElement === null) {
      return '';
    }
    const contentElement = adornerElement.querySelector('[slot="content"]');
    assert.isNotNull(contentElement);
    if (contentElement === null) {
      return '';
    }
    return contentElement.innerHTML;
  });
}

function nodeKeyInnerHTML(node: HTMLLIElement|ShadowRoot) {
  const keyNode = node.querySelector('[data-node-key]');
  if (!keyNode) {
    throw new Error('Found tree node without a key within it.');
  }
  return stripLitHtmlCommentNodes(keyNode.innerHTML);
}

interface VisibleTreeNodeFromDOM {
  nodeElement: HTMLLIElement;
  children?: VisibleTreeNodeFromDOM[];
}

/**
 * Converts the nodes into a tree structure that we can assert against.
 */
function visibleNodesToTree(shadowRoot: ShadowRoot): VisibleTreeNodeFromDOM[] {
  const tree: VisibleTreeNodeFromDOM[] = [];

  function buildTreeNode(node: HTMLLIElement): VisibleTreeNodeFromDOM {
    const item: VisibleTreeNodeFromDOM = {
      nodeElement: node,
    };

    if (node.getAttribute('aria-expanded') && node.getAttribute('aria-expanded') === 'true') {
      item.children = [];
      const childNodes = node.querySelectorAll<HTMLLIElement>(':scope > ul[role="group"]>li');
      for (const child of childNodes) {
        item.children.push(buildTreeNode(child));
      }
    }

    return item;
  }
  const rootNodes = shadowRoot.querySelectorAll<HTMLLIElement>('ul[role="tree"]>li');
  for (const root of rootNodes) {
    tree.push(buildTreeNode(root));
  }
  return tree;
}

/**
 * Wait until a certain number of children are rendered. We need this as the
 * component uses LitHtml's until directive, which is async and not within the
 * render coordinator's control.
 */
async function waitForRenderedTreeNodeCount(shadowRoot: ShadowRoot, expectedNodeCount: number): Promise<void> {
  const actualNodeCount = shadowRoot.querySelectorAll('li[role="treeitem"]').length;
  if (actualNodeCount === expectedNodeCount) {
    return;
  }

  await new Promise<void>(resolve => {
    requestAnimationFrame(async () => {
      await waitForRenderedTreeNodeCount(shadowRoot, expectedNodeCount);
      resolve();
    });
  });
}

describeWithLocale('OriginTrialTreeView', () => {
  it('renders trial names as root tree nodes', async () => {
    const {shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,
        trialWithSingleToken,
        trialWithUnparsableToken,
      ],
    });
    const visibleItems = shadowRoot.querySelectorAll<HTMLLIElement>('li[role="treeitem"]');
    assert.lengthOf(visibleItems, 3);
    assert.include(nodeKeyInnerHTML(visibleItems[0]), trialWithMultipleTokens.trialName);
    assert.include(nodeKeyInnerHTML(visibleItems[1]), trialWithSingleToken.trialName);
    assert.include(nodeKeyInnerHTML(visibleItems[2]), trialWithUnparsableToken.trialName);
  });

  it('renders token with status when there are more than 1 tokens', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,  // Node counts by level: 1/3/6/3
      ],
    });

    await component.expandRecursively(/* maxDepth= */ 0);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    const visibleTree = visibleNodesToTree(shadowRoot);

    // When there are more than 1 tokens in a trial, second level nodes
    // should show token status.
    const tokenWithStatusNodes = visibleTree[0].children;
    assert.exists(tokenWithStatusNodes);
    if (tokenWithStatusNodes === undefined) {
      return;
    }
    assert.lengthOf(tokenWithStatusNodes, 3);
    for (let i = 0; i < tokenWithStatusNodes.length; i++) {
      assert.include(
          extractBadgeTextFromTreeNode(tokenWithStatusNodes[i].nodeElement),
          trialWithMultipleTokens.tokensWithStatus[i].status,
      );
    }
  });

  it('skips token with status when there is only 1 token', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithSingleToken,  // Node counts by level: 1/2/1
      ],
    });
    await component.expandRecursively(/* maxDepth= */ 1);
    await waitForRenderedTreeNodeCount(shadowRoot, 3);
    const visibleTree = visibleNodesToTree(shadowRoot);

    // When there is only 1 token, token with status level should be skipped.
    const tokenDetailNodes = visibleTree[0].children;
    assert.exists(tokenDetailNodes);
    if (tokenDetailNodes === undefined) {
      return;
    }
    assert.lengthOf(tokenDetailNodes, 2);
  });

  it('renders token fields', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithSingleToken,  // Node counts by level: 1/2/1
      ],
    });
    await component.expandRecursively(/* maxDepth= */ 1);
    await waitForRenderedTreeNodeCount(shadowRoot, 3);
    const visibleTree = visibleNodesToTree(shadowRoot);

    const tokenDetailNodes = visibleTree[0].children;
    assert.exists(tokenDetailNodes);
    if (tokenDetailNodes === undefined) {
      return;
    }
    assert.lengthOf(tokenDetailNodes, 2);
    const tokenFieldsNode = tokenDetailNodes[0];
    const rowsComponent = tokenFieldsNode.nodeElement.querySelector('devtools-resources-origin-trial-token-rows');
    const {innerHTML} = rowsComponent!.shadowRoot!;
    const parsedToken = trialWithSingleToken.tokensWithStatus[0].parsedToken;
    assert.exists(parsedToken);
    if (parsedToken === undefined) {
      return;
    }

    // Note: only origin and usageRestriction field are tested, as other fields
    // are not directly rendered:
    // - expiryTime: rendered as time format
    // - isThirdParty, MatchesSubDomain: boolean flags
    assert.include(innerHTML, parsedToken.origin);
    assert.include(innerHTML, parsedToken.usageRestriction);
  });

  it('renders raw token text', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithSingleToken,  // Node counts by level: 1/2/1
      ],
    });
    await component.expandRecursively(/* maxDepth= */ 2);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    const visibleTree = visibleNodesToTree(shadowRoot);

    const tokenDetailNodes = visibleTree[0].children;
    assert.exists(tokenDetailNodes);
    if (tokenDetailNodes === undefined) {
      return;
    }
    assert.lengthOf(tokenDetailNodes, 2);
    const rawTokenNode = tokenDetailNodes[1];
    assert.exists(rawTokenNode.children);
    if (rawTokenNode.children === undefined) {
      return;
    }
    assert.lengthOf(rawTokenNode.children, 1);
    const innerHTML = nodeKeyInnerHTML(rawTokenNode.children[0].nodeElement);
    assert.include(innerHTML, trialWithSingleToken.tokensWithStatus[0].rawTokenText);
  });

  it('shows token count when there are more than 1 tokens in a trial', async () => {
    const {shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,
      ],
    });
    await waitForRenderedTreeNodeCount(shadowRoot, 1);
    const visibleTree = visibleNodesToTree(shadowRoot);

    const trialNameNode = visibleTree[0];
    const badges = extractBadgeTextFromTreeNode(trialNameNode.nodeElement);
    assert.lengthOf(badges, 2);
    assert.include(badges, `${trialWithMultipleTokens.tokensWithStatus.length} tokens`);
  });

  it('shows trial status', async () => {
    const {shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,
      ],
    });
    await waitForRenderedTreeNodeCount(shadowRoot, 1);
    const visibleTree = visibleNodesToTree(shadowRoot);

    const trialNameNode = visibleTree[0];
    const badges = extractBadgeTextFromTreeNode(trialNameNode.nodeElement);
    assert.lengthOf(badges, 2);
    assert.include(badges, trialWithMultipleTokens.status);
  });

  it('shows token status, when token with status node not expanded', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,  // Node counts by level: 1/3/6/3
      ],
    });
    await component.expandRecursively(/* maxDepth= */ 0);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);

    const visibleTree = visibleNodesToTree(shadowRoot);
    const trialNameNode = visibleTree[0];
    assert.exists(trialNameNode.children);
    if (trialNameNode.children === undefined) {
      return;
    }
    assert.lengthOf(trialNameNode.children, 3);
    for (let i = 0; i < trialNameNode.children.length; i++) {
      const tokenWithStatusNode = trialNameNode.children[i];
      assert.isUndefined(tokenWithStatusNode.children);
      const badges = extractBadgeTextFromTreeNode(tokenWithStatusNode.nodeElement);
      assert.lengthOf(badges, 1);
      assert.strictEqual(badges[0], trialWithMultipleTokens.tokensWithStatus[i].status);
    }
  });
  it('hide token status, when token with status node is expanded', async () => {
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        trialWithMultipleTokens,  // Node counts by level: 1/3/6/3
      ],
    });
    await component.expandRecursively(/* maxDepth= */ 1);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);

    const visibleTree = visibleNodesToTree(shadowRoot);
    const trialNameNode = visibleTree[0];
    assert.exists(trialNameNode.children);
    for (const tokenWithStatusNode of trialNameNode.children) {
      assert.exists(tokenWithStatusNode.children);
      const badges = extractBadgeTextFromTreeNode(tokenWithStatusNode.nodeElement);
      assert.lengthOf(badges, 0);
    }
  });

  it('shows trial name for token with status UnknownTrial', async () => {
    const unknownTrialName = 'UnkownTrialName';
    const {component, shadowRoot} = await renderOriginTrialTreeViewTreeOutline({
      trials: [
        {
          trialName: 'UNKNOWN',
          status: Protocol.Page.OriginTrialStatus.ValidTokenNotProvided,
          tokensWithStatus: [
            {
              status: Protocol.Page.OriginTrialTokenStatus.UnknownTrial,
              parsedToken: {
                trialName: unknownTrialName,
                origin: 'https://foo.com',
                expiryTime: 1000,
                usageRestriction: Protocol.Page.OriginTrialUsageRestriction.None,
                isThirdParty: false,
                matchSubDomains: false,
              },
              rawTokenText: tokenPlaceHolder,
            },
          ],
        },
      ],
    });  // Node counts by level: 1/2/1

    await component.expandRecursively(/* maxDepth= */ 1);
    await waitForRenderedTreeNodeCount(shadowRoot, 3);
    const visibleTree = visibleNodesToTree(shadowRoot);

    const tokenDetailNodes = visibleTree[0].children;
    assert.exists(tokenDetailNodes);
    if (tokenDetailNodes === undefined) {
      return;
    }
    assert.lengthOf(tokenDetailNodes, 2);
    const tokenFieldsNode = tokenDetailNodes[0];
    const rowsComponent = tokenFieldsNode.nodeElement.querySelector('devtools-resources-origin-trial-token-rows');
    const {innerHTML} = rowsComponent!.shadowRoot!;

    assert.include(innerHTML, unknownTrialName);
  });
});
