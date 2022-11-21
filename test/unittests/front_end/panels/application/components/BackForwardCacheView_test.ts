// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as TreeOutline from '../../../../../../front_end/ui/components/tree_outline/tree_outline.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../../helpers/MockConnection.js';

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';

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

describeWithMockConnection('BackForwardCacheViewWrapper', () => {
  const updatesBFCacheView = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
    let wrapper: ApplicationComponents.BackForwardCacheView.BackForwardCacheViewWrapper;
    let view: ApplicationComponents.BackForwardCacheView.BackForwardCacheView;
    const FRAME = {
      id: 'main',
      loaderId: 'test',
      url: 'http://example.com',
      securityOrigin: 'http://example.com',
      mimeType: 'text/html',
    };

    beforeEach(() => {
      target = targetFactory();
      resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      dispatchEvent(target, 'Page.frameNavigated', {frame: FRAME});
      view = new ApplicationComponents.BackForwardCacheView.BackForwardCacheView();
      wrapper = new ApplicationComponents.BackForwardCacheView.BackForwardCacheViewWrapper(view);
      wrapper.markAsRoot();
      wrapper.show(document.body);
    });

    afterEach(() => {
      wrapper.detach();
    });

    it('updates BFCacheView on main frame navigation', async () => {
      assertNotNullOrUndefined(resourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel.mainFrame);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, resourceTreeModel.mainFrame);

      const data = await new Promise(resolve => sinon.stub(view, 'data').set(resolve));
      assert.deepStrictEqual(data, {frame: resourceTreeModel.mainFrame});
    });

    it('updates BFCacheView on BFCache detail update', async () => {
      assertNotNullOrUndefined(resourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel.mainFrame);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, resourceTreeModel.mainFrame);

      const data = await new Promise(resolve => sinon.stub(view, 'data').set(resolve));
      assert.deepStrictEqual(data, {frame: resourceTreeModel.mainFrame});
    });
  };

  describe('without tab target', () => updatesBFCacheView(() => createTarget()));
  describe('with tab target', () => updatesBFCacheView(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});

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

const testBFCacheWorkflow = (targetFactory: () => SDK.Target.Target) => {
  it('can handle delayed navigation history when testing for BFcache availability', async () => {
    const mainTarget = targetFactory();
    const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);

    const entries = [
      {
        id: 5,
        url: 'about:blank',
        userTypedURL: 'about:blank',
        title: '',
        transitionType: Protocol.Page.TransitionType.Typed,
      },
      {
        id: 8,
        url: 'chrome://terms/',
        userTypedURL: '',
        title: '',
        transitionType: Protocol.Page.TransitionType.Typed,
      },
    ];
    const stub = sinon.stub();
    stub.onCall(0).returns({entries, currentIndex: 0});
    stub.onCall(1).returns({entries, currentIndex: 0});
    stub.onCall(2).returns({entries, currentIndex: 0});
    stub.onCall(3).returns({entries, currentIndex: 0});
    stub.onCall(4).returns({entries, currentIndex: 1});
    resourceTreeModel.navigationHistory = stub;

    resourceTreeModel.navigate = (url: Platform.DevToolsPath.UrlString): Promise<void> => {
      resourceTreeModel.frameNavigated({url} as unknown as Protocol.Page.Frame, undefined);
      return Promise.resolve();
    };
    resourceTreeModel.navigateToHistoryEntry = (entry: Protocol.Page.NavigationEntry): void => {
      resourceTreeModel.frameNavigated({url: entry.url} as unknown as Protocol.Page.Frame, undefined);
    };
    const navigateToHistoryEntrySpy = sinon.spy(resourceTreeModel, 'navigateToHistoryEntry');
    resourceTreeModel.storageKeyForFrame = () => Promise.resolve(null);

    const frame = {
      url: 'about:blank',
      backForwardCacheDetails: {
        restoredFromCache: true,
        explanations: [],
      },
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    const component = await renderBackForwardCacheView(frame);
    assertShadowRoot(component.shadowRoot);
    const button = component.shadowRoot.querySelector('[aria-label="Test back/forward cache"]');
    assertElement(button, HTMLElement);
    dispatchClickEvent(button);

    await new Promise<void>(resolve => {
      let eventCounter = 0;
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, () => {
        if (++eventCounter === 2) {
          resolve();
        }
      });
    });
    assert.isTrue(navigateToHistoryEntrySpy.calledOnceWithExactly(entries[0]));
  });
};

describeWithMockConnection('BackForwardCacheView', () => {
  describe('test BFCache workflow without tab taget', () => testBFCacheWorkflow(() => createTarget()));
  describe('test BFCache workflow with tab taget', () => testBFCacheWorkflow(() => {
                                                     const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                                     createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                                     return createTarget({parentTarget: tabTarget});
                                                   }));
});
