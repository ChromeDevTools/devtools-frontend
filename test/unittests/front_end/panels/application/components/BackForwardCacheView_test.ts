// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import * as TreeOutline from '../../../../../../front_end/ui/components/tree_outline/tree_outline.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

interface NodeData {
  text: string;
  iconName?: string;
}

interface Node {
  treeNodeData: NodeData;
  children?: Node[];
}

async function renderBackForwardCacheView(frame: SDK.ResourceTreeModel.ResourceTreeFrame):
    Promise<ApplicationComponents.BackForwardCacheView.BackForwardCacheView> {
  const component = new ApplicationComponents.BackForwardCacheView.BackForwardCacheView();
  renderElementIntoDOM(component);
  component.data = {frame};
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();
  return component;
}

async function unpromisify(node: TreeOutline.TreeOutlineUtils.TreeNode<NodeData>): Promise<Node> {
  const result: Node = {treeNodeData: node.treeNodeData};
  if (node.children) {
    const children = await node.children();
    result.children = await Promise.all(children.map(child => unpromisify(child)));
  }
  return result;
}

describeWithEnvironment('BackForwardCacheView', () => {
  it('renders status if restored from BFCache', async () => {
    const frame = {
      url: 'https://www.example.com/',
      backForwardCacheDetails: {
        restoredFromCache: true,
        explanations: [],
      },
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    const component = await renderBackForwardCacheView(frame);
    assertShadowRoot(component.shadowRoot);
    const renderedStatus = component.shadowRoot.querySelector('devtools-report-section');
    assert.strictEqual(renderedStatus?.textContent?.trim(), 'Successfully served from back/forward cache.');
  });

  it('renders explanations if not restorable from BFCache', async () => {
    const frame = {
      url: 'https://www.example.com/',
      backForwardCacheDetails: {
        restoredFromCache: false,
        explanations: [
          {
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.WebLocks,
          },
          {
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.PageSupportNeeded,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.ServiceWorkerUnregistration,
          },
          {
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.MainResourceHasCacheControlNoStore,
          },
        ],
      },
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    const component = await renderBackForwardCacheView(frame);
    assertShadowRoot(component.shadowRoot);

    const sectionHeaders = component.shadowRoot.querySelectorAll('devtools-report-section-header');
    const sectionHeadersText = Array.from(sectionHeaders).map(sectionHeader => sectionHeader.textContent?.trim());
    assert.deepStrictEqual(sectionHeadersText, ['Actionable', 'Pending Support', 'Not Actionable']);

    const sections = component.shadowRoot.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Not served from back/forward cache: to trigger back/forward cache, use Chrome\'s back/forward buttons, or use the test button below to automatically navigate away and back.',
      'Test back/forward cache',
      'ServiceWorker was unregistered while a page was in back/forward cache.',
      'Pages that use WebLocks are not currently eligible for back/forward cache.',
      'Pages whose main resource has cache-control:no-store cannot enter back/forward cache.',
      'Learn more: back/forward cache eligibility',
    ];
    assert.deepStrictEqual(sectionsText, expected);
  });

  it('renders explanation tree', async () => {
    Root.Runtime.experiments.enableForTest('bfcacheDisplayTree');
    const frame = {
      url: 'https://www.example.com/',
      backForwardCacheDetails: {
        restoredFromCache: false,
        explanationsTree: {
          url: 'https://www.example.com',
          explanations: [{
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.WebLocks,
          }],
          children: [{
            url: 'https://www.example.com/frame.html',
            explanations: [{
              type: Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial,
              reason: Protocol.Page.BackForwardCacheNotRestoredReason.MainResourceHasCacheControlNoStore,
            }],
            children: [],
          }],
        },
        explanations: [
          {
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.WebLocks,
          },
          {
            type: Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial,
            reason: Protocol.Page.BackForwardCacheNotRestoredReason.MainResourceHasCacheControlNoStore,
          },
        ],
      },
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    const component = await renderBackForwardCacheView(frame);
    assertShadowRoot(component.shadowRoot);

    const treeOutline = component.shadowRoot.querySelector('devtools-tree-outline');
    assertElement(treeOutline, TreeOutline.TreeOutline.TreeOutline);
    assertShadowRoot(treeOutline.shadowRoot);

    const treeData = await Promise.all(
        treeOutline.data.tree.map(node => unpromisify(node as TreeOutline.TreeOutlineUtils.TreeNode<NodeData>)));

    const expected = [
      {
        treeNodeData: {
          text: '2 issues found in 2 frames.',
        },
        children: [
          {
            treeNodeData: {
              text: '(2) https://www.example.com',
              iconName: 'frame-icon',
            },
            children: [
              {
                treeNodeData: {
                  text: 'WebLocks',
                },
              },
              {
                treeNodeData: {
                  text: '(1) https://www.example.com/frame.html',
                  iconName: 'frame-embedded-icon',
                },
                children: [
                  {
                    treeNodeData: {
                      text: 'MainResourceHasCacheControlNoStore',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    assert.deepStrictEqual(treeData, expected);
  });
});
