// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import {assertGridContents} from '../../../testing/DataGridHelpers.js';
import {
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../../testing/MockConnection.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Resources from '../application.js';

const zip2 = <T, S>(xs: T[], ys: S[]) => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

// Holds targets and ids, and emits events.
class NavigationEmulator {
  private seq = 0;
  private tabTarget: SDK.Target.Target;
  primaryTarget: SDK.Target.Target;
  private frameId: Protocol.Page.FrameId;
  private loaderId: Protocol.Network.LoaderId;
  private prerenderTarget: SDK.Target.Target|null = null;
  private prerenderStatusUpdatedEvent: Protocol.Preload.PrerenderStatusUpdatedEvent|null = null;

  constructor() {
    this.tabTarget = createTarget({type: SDK.Target.Type.TAB});
    // Fill fake ones here and fill real ones in async part.
    this.primaryTarget = createTarget();
    this.frameId = 'fakeFrameId' as Protocol.Page.FrameId;
    this.loaderId = 'fakeLoaderId' as Protocol.Network.LoaderId;
  }

  private async createTarget(targetInfo: Protocol.Target.TargetInfo, sessionId: Protocol.Target.SessionID):
      Promise<SDK.Target.Target> {
    const childTargetManager = this.tabTarget.model(SDK.ChildTargetManager.ChildTargetManager);

    dispatchEvent(this.tabTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager!.attachedToTarget({
      sessionId,
      targetInfo,
      waitingForDebugger: false,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById(targetInfo.targetId);
    assert.exists(target);

    return target;
  }

  async openDevTools(): Promise<void> {
    const url = 'https://example.com/';

    const targetId = `targetId:${this.seq}` as Protocol.Target.TargetID;
    const sessionId = `sessionId:${this.seq}` as Protocol.Target.SessionID;
    const targetInfo = {
      targetId,
      type: 'page',
      title: 'title',
      url,
      attached: true,
      canAccessOpener: false,
    };
    this.primaryTarget = await this.createTarget(targetInfo, sessionId);
    this.frameId = 'frameId' as Protocol.Page.FrameId;
    this.loaderId = 'loaderId' as Protocol.Network.LoaderId;
    SDK.TargetManager.TargetManager.instance().setScopeTarget(this.primaryTarget);
  }

  async navigateAndDispatchEvents(path: string): Promise<void> {
    const url = 'https://example.com/' + path;
    this.seq++;
    this.loaderId = `loaderId:${this.seq}` as Protocol.Network.LoaderId;

    assert.notStrictEqual(url, this.prerenderTarget?.targetInfo()?.url);

    dispatchEvent(this.primaryTarget, 'Page.frameNavigated', {
      frame: {
        id: this.frameId,
        loaderId: this.loaderId,
        url,
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
  }

  async activateAndDispatchEvents(path: string): Promise<void> {
    const url = 'https://example.com/' + path;

    assert.exists(this.prerenderTarget);
    assert.strictEqual(url, this.prerenderTarget.targetInfo()?.url);
    assert.exists(this.prerenderStatusUpdatedEvent);

    this.seq++;
    this.loaderId = this.prerenderStatusUpdatedEvent.key.loaderId;

    const targetInfo = this.prerenderTarget.targetInfo();
    assert.exists(targetInfo);

    // This also emits ResourceTreeModel.Events.PrimaryPageChanged.
    dispatchEvent(this.tabTarget, 'Target.targetInfoChanged', {
      targetInfo: {
        ...targetInfo,
        subtype: undefined,
      },
    });

    // Notify a new model to PreloadingModelProxy.
    this.primaryTarget = this.prerenderTarget;
    this.prerenderTarget = null;
    SDK.TargetManager.TargetManager.instance().setScopeTarget(this.primaryTarget);

    // Strictly speaking, we have to emit an event for SDK.PreloadingModel.PreloadingStatus.Ready earlier.
    // It's not so important and omitted.
    dispatchEvent(this.primaryTarget, 'Preload.prerenderStatusUpdated', {
      ...this.prerenderStatusUpdatedEvent,
      status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
    });
  }

  async addSpecRules(specrules: string): Promise<void> {
    this.seq++;

    // For simplicity, we only emit errors if parse failed.
    let json;
    try {
      json = JSON.parse(specrules);
    } catch {
      dispatchEvent(this.primaryTarget, 'Preload.ruleSetUpdated', {
        ruleSet: {
          id: `ruleSetId:0.${this.seq}`,
          loaderId: this.loaderId,
          sourceText: specrules,
          backendNodeId: this.seq,
          errorType: Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject,
          errorMessage: 'fake error message',
        },
      });
      return;
    }

    dispatchEvent(this.primaryTarget, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: `ruleSetId:0.${this.seq}`,
        loaderId: this.loaderId,
        sourceText: specrules,
        backendNodeId: this.seq,
      },
    });

    for (const prefetchAttempt of json['prefetch'] || []) {
      // For simplicity
      assert.strictEqual(prefetchAttempt['source'], 'list');
      assert.lengthOf(prefetchAttempt['urls'], 1);

      const url = 'https://example.com' + prefetchAttempt['urls'][0];

      dispatchEvent(this.primaryTarget, 'Preload.prefetchStatusUpdated', {
        key: {
          loaderId: this.loaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url,
        },
        initiatingFrameId: this.frameId,
        prefetchUrl: url,
        status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
      });
    }

    if (json['prerender'] === undefined) {
      return;
    }

    // For simplicity
    assert.lengthOf(json['prerender'], 1);
    assert.strictEqual(json['prerender'][0]['source'], 'list');
    assert.lengthOf(json['prerender'][0]['urls'], 1);

    const prerenderUrl = 'https://example.com' + json['prerender'][0]['urls'][0];

    this.prerenderStatusUpdatedEvent = {
      key: {
        loaderId: this.loaderId,
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: prerenderUrl,
      },
      pipelineId: `pipelineId:0.${this.seq}` as Protocol.Preload.PreloadPipelineId,
      status: Protocol.Preload.PreloadingStatus.Running,
    };
    dispatchEvent(this.primaryTarget, 'Preload.prerenderStatusUpdated', this.prerenderStatusUpdatedEvent);

    const sessionId = `sessionId:prerender:${this.seq}` as Protocol.Target.SessionID;
    const targetInfo = {
      targetId: `targetId:prerender:${this.seq}` as Protocol.Target.TargetID,
      type: 'page',
      subtype: 'prerender',
      url: prerenderUrl,
      title: '',
      attached: true,
      canAccessOpener: true,
    };
    this.prerenderTarget = await this.createTarget(targetInfo, sessionId);

    // Note that Page.frameNavigated is emitted here.
    // See also https://crbug.com/1317959 and ResourceTreeModel.Events.PrimaryPageChanged.
    dispatchEvent(this.prerenderTarget, 'Page.frameNavigated', {
      frame: {
        id: `frameId:prerender:${this.seq}` as Protocol.Page.FrameId,
        loaderId: `loaderId:prerender:${this.seq}` as Protocol.Network.LoaderId,
        url: prerenderUrl,
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
  }
}

function createRuleSetView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingRuleSetView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assert.exists(model);
  const view = new Resources.PreloadingView.PreloadingRuleSetView(model);
  const container = new UI.Widget.VBox();
  const div = document.createElement('div');
  view.contentElement.style.width = '640px';
  view.contentElement.style.height = '480px';

  renderElementIntoDOM(div);
  container.markAsRoot();
  container.show(div);
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

function createAttemptView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingAttemptView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assert.exists(model);
  const view = new Resources.PreloadingView.PreloadingAttemptView(model);
  const container = new UI.Widget.VBox();
  const div = document.createElement('div');
  view.contentElement.style.width = '640px';
  view.contentElement.style.height = '480px';
  renderElementIntoDOM(div);
  container.markAsRoot();
  container.show(div);
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

function createSummaryView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingSummaryView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assert.exists(model);
  const view = new Resources.PreloadingView.PreloadingSummaryView(model);
  const container = new UI.Widget.VBox();
  const div = document.createElement('div');
  renderElementIntoDOM(div);
  container.markAsRoot();
  container.show(div);
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

describeWithMockConnection('PreloadingRuleSetView', () => {
  beforeEach(() => {
    SDK.ChildTargetManager.ChildTargetManager.install();
  });

  it('renders placeholder', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);
    await RenderCoordinator.done();

    const placeholder = view.contentElement.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(window.getComputedStyle(placeholder).display, 'flex');

    const header = placeholder.querySelector('.empty-state-header')?.textContent;
    const description = placeholder.querySelector('.empty-state-description > span')?.textContent;

    assert.deepEqual(header, 'No rules detected');
    assert.deepEqual(
        description,
        'On this page you will see the speculation rules used to prefetch and prerender page navigations.');

    const rules = view.contentElement.querySelector('devtools-split-view');
    assert.exists(rules);
    assert.deepEqual(window.getComputedStyle(rules).display, 'none');
  });

  it('renders grid and details and hides placeholder', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);
    dispatchEvent(emulator.primaryTarget, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/prerendered.html',
          },
          ruleSetIds: ['ruleSetId:0.2'],
          nodeIds: [],
        },
      ],
    });

    await RenderCoordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assert.isNotNull(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Rule set', 'Status'],
        [
          ['example.com/', '1 running'],
        ],
    );

    const placeholder = view.contentElement.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(window.getComputedStyle(placeholder).display, 'none');
  });

  it('shows error of rule set', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
`);

    await RenderCoordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assert.isNotNull(ruleSetGridComponent.shadowRoot);
    const ruleSetDetailsComponent = view.getRuleSetDetailsForTest();
    assert.isNotNull(ruleSetDetailsComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Rule set', 'Status'],
        [
          ['example.com/', '1 error'],
        ],

    );

    ruleSetGridComponent.dispatchEvent(new CustomEvent('select', {detail: 'ruleSetId:0.2'}));

    await RenderCoordinator.done();

    assert.deepEqual(
        ruleSetDetailsComponent.shadowRoot?.getElementById('ruleset-url')?.textContent, 'https://example.com/');
    assert.deepEqual(
        ruleSetDetailsComponent.shadowRoot?.getElementById('error-message-text')?.textContent, 'fake error message');
  });

  // TODO(https://crbug.com/1384419): Check that preloading attempts for
  // the previous page vanish once loaderId is added to events
  // prefetch/prerenderAttemptUpdated.
  it('clears SpeculationRules for previous pages', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);
    await emulator.navigateAndDispatchEvents('notprerendered.html');

    await RenderCoordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assert.isNotNull(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Rule set', 'Status'],
        [],
    );
  });

  it('clears SpeculationRules for previous pages when prerendered page activated', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);
    await emulator.activateAndDispatchEvents('prerendered.html');

    await RenderCoordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assert.isNotNull(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Rule set', 'Status'],
        [],
    );
  });

  // See https://crbug.com/1432880
  it('preserves information even if iframe loaded', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createRuleSetView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    const targetInfo = {
      targetId: 'targetId' as Protocol.Target.TargetID,
      type: 'iframe',
      title: 'title',
      url: 'https://example.com/iframe.html',
      attached: true,
      canAccessOpener: false,
    };
    const childTargetManager = emulator.primaryTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assert.exists(childTargetManager);

    dispatchEvent(emulator.primaryTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager.attachedToTarget({
      sessionId: 'sessionId' as Protocol.Target.SessionID,
      targetInfo,
      waitingForDebugger: false,
    });

    await RenderCoordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assert.isNotNull(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Rule set', 'Status'],
        [
          ['example.com/', ''],
        ],
    );
  });
});

describeWithMockConnection('PreloadingAttemptView', () => {
  beforeEach(() => {
    SDK.ChildTargetManager.ChildTargetManager.install();
  });

  it('renders placeholder', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);
    await RenderCoordinator.done();

    const placeholder = view.contentElement.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(window.getComputedStyle(placeholder).display, 'flex');

    const header = placeholder.querySelector('.empty-state-header')?.textContent;
    const description = placeholder.querySelector('.empty-state-description > span')?.textContent;

    assert.deepEqual(header, 'No speculation detected');
    assert.deepEqual(description, 'On this page you will see details on speculative loads.');

    const rules = view.contentElement.querySelector('devtools-split-view');
    assert.exists(rules);
    assert.deepEqual(window.getComputedStyle(rules).display, 'none');
  });

  it('renders grid and details and hides placeholder', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    await RenderCoordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assert.isNotNull(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            '',
            'Running',
          ],
        ],
    );

    const placeholder = view.contentElement.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(window.getComputedStyle(placeholder).display, 'none');
  });

  // See https://crbug.com/1432880
  it('preserves information even if iframe loaded', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    const targetInfo = {
      targetId: 'targetId' as Protocol.Target.TargetID,
      type: 'iframe',
      title: 'title',
      url: 'https://example.com/iframe.html',
      attached: true,
      canAccessOpener: false,
    };
    const childTargetManager = emulator.primaryTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assert.exists(childTargetManager);

    dispatchEvent(emulator.primaryTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager.attachedToTarget({
      sessionId: 'sessionId' as Protocol.Target.SessionID,
      targetInfo,
      waitingForDebugger: false,
    });

    await RenderCoordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assert.isNotNull(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            '',
            'Running',
          ],
        ],
    );

    const placeholderHeader = preloadingDetailsComponent.shadowRoot.querySelector('.empty-state-header');
    assert.strictEqual(placeholderHeader?.textContent?.trim(), 'No element selected');

    const placeholderDescription = preloadingDetailsComponent.shadowRoot.querySelector('.empty-state-description');
    assert.strictEqual(placeholderDescription?.textContent, 'Select an element for more details');
  });

  it('filters preloading attempts by selected rule set', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    // ruleSetId:0.2
    await emulator.addSpecRules(`
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource2.js"]
    }
  ]
}
`);
    await emulator.addSpecRules(`
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/prerendered3.html"]
    }
  ]
}
`);
    dispatchEvent(emulator.primaryTarget, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js',
          },
          ruleSetIds: ['ruleSetId:0.2'],
          nodeIds: [2, 3],
        },
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/prerendered3.html',
          },
          ruleSetIds: ['ruleSetId:0.3'],
          nodeIds: [3],
        },
      ],
    });

    await RenderCoordinator.done();

    const ruleSetSelectorToolbarItem = view.getRuleSetSelectorToolbarItemForTest();
    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'All speculative loads');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'Prefetch',
            'example.com/',
            'Running',
          ],
          [
            '/prerendered3.html',
            'Prerender',
            'example.com/',
            'Running',
          ],
        ],
    );

    // Turn on filtering.
    view.selectRuleSetOnFilterForTest('ruleSetId:0.2' as Protocol.Preload.RuleSetId);

    await RenderCoordinator.done();

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'example.com/');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'Prefetch',
            'example.com/',
            'Running',
          ],
        ],
    );

    // Turn off filtering.
    view.selectRuleSetOnFilterForTest(null);

    await RenderCoordinator.done();

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'All speculative loads');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'Prefetch',
            'example.com/',
            'Running',
          ],
          [
            '/prerendered3.html',
            'Prerender',
            'example.com/',
            'Running',
          ],
        ],
    );
  });

  it('shows prerender details with Investigate button for Running', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    await RenderCoordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assert.isNotNull(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            '',
            'Running',
          ],
        ],
    );

    preloadingGridComponent.dispatchEvent(
        new CustomEvent('select', {detail: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'}));

    await RenderCoordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'Prerender Inspect'],
      ['Status', 'Speculative load is running.'],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.isNull(buttons[0].getAttribute('disabled'));
  });

  it('shows prerender details with Investigate button for Ready', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    dispatchEvent(emulator.primaryTarget, 'Preload.prerenderStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: 'https://example.com/prerendered.html',
      },
      status: Protocol.Preload.PreloadingStatus.Ready,
    });

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assert.isNotNull(preloadingDetailsComponent.shadowRoot);

    await RenderCoordinator.done();

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            '',
            'Ready',
          ],
        ],
    );

    preloadingGridComponent.dispatchEvent(
        new CustomEvent('select', {detail: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'}));

    await RenderCoordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'Prerender Inspect'],
      ['Status', 'Speculative load finished and the result is ready for the next navigation.'],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.isNull(buttons[0].getAttribute('disabled'));
  });

  it('shows prerender details with Investigate (disabled) button for Failure', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createAttemptView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);

    dispatchEvent(emulator.primaryTarget, 'Preload.prerenderStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: 'https://example.com/prerendered.html',
      },
      status: Protocol.Preload.PreloadingStatus.Failure,
      prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
      disallowedMojoInterface: 'device.mojom.GamepadMonitor',
    });
    // Note that `TargetManager.removeTarget` is not called on `Target.targetDestroyed`.
    // Here, we manually remove the target for prerendered page from `TargetManager`.
    const prerenderTarget = SDK.TargetManager.TargetManager.instance().targets().find(
        child => child.targetInfo()?.subtype === 'prerender' &&
            child.inspectedURL() === 'https://example.com/prerendered.html');
    prerenderTarget?.dispose('test');

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assert.isNotNull(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assert.isNotNull(preloadingDetailsComponent.shadowRoot);

    await RenderCoordinator.done();

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            '',
            'Failure - The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
          ],
        ],
    );

    preloadingGridComponent.dispatchEvent(
        new CustomEvent('select', {detail: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'}));

    await RenderCoordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'Prerender Inspect'],
      ['Status', 'Speculative load failed.'],
      [
        'Failure reason',
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
      ],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.strictEqual(buttons[0].shadowRoot?.querySelector('button')?.getAttribute('disabled'), '');
  });
});

describeWithMockConnection('PreloadingSummaryView', () => {
  beforeEach(() => {
    SDK.ChildTargetManager.ChildTargetManager.install();
  });

  it('shows information of preloading of the last page', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createSummaryView(emulator.primaryTarget);

    await emulator.navigateAndDispatchEvents('');
    await emulator.addSpecRules(`
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`);
    await emulator.activateAndDispatchEvents('prerendered.html');

    await RenderCoordinator.done();

    const usedPreloadingComponent = view.getUsedPreloadingForTest();
    assert.isNotNull(usedPreloadingComponent.shadowRoot);

    assert.include(usedPreloadingComponent.shadowRoot.textContent, 'This page was successfully prerendered.');
  });
});

async function testWarnings(
    event: Protocol.Preload.PreloadEnabledStateUpdatedEvent, headerExpected: string|null,
    sectionsExpected: Array<[string, string]>): Promise<void> {
  const target = createTarget();

  const warningsUpdatedPromise = new Promise<void>(resolve => {
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assert.exists(model);
    model.addEventListener(SDK.PreloadingModel.Events.WARNINGS_UPDATED, _ => resolve());
  });

  const view = createRuleSetView(target);
  view.wasShown();

  dispatchEvent(target, 'Preload.preloadEnabledStateUpdated', event);

  await warningsUpdatedPromise;
  await RenderCoordinator.done();

  const infobarContainer = view.getInfobarContainerForTest();
  const infobar = infobarContainer.querySelector('devtools-resources-preloading-disabled-infobar');
  assert.exists(infobar);
  assert.isNotNull(infobar.shadowRoot);
  const headerGot = infobar.shadowRoot.querySelector('#header');
  assert.strictEqual(headerGot?.textContent?.trim() || null, headerExpected);

  if (headerExpected === null) {
    return;
  }

  const headers =
      [...infobar.shadowRoot.querySelectorAll('#contents div.key')].map(header => header.textContent?.trim());
  const sections =
      [...infobar.shadowRoot.querySelectorAll('#contents div.value')].map(section => section.textContent?.trim());
  assert.deepEqual(zip2(headers, sections), sectionsExpected);
}

describeWithMockConnection('PreloadingWarningsView', () => {
  beforeEach(() => {
    SDK.ChildTargetManager.ChildTargetManager.install();
  });

  it('shows no warnings if holdback flags are disabled', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        null,
        [],
    );
  });

  it('shows an warning if disabled by user settings', async () => {
    await testWarnings(
        {
          disabledByPreference: true,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        'Speculative loading is disabled', [
          [
            'User settings or extensions',
            'Speculative loading is disabled because of user settings or an extension. Go to Preload pages settings to update your preference. Go to Extensions settings to disable any extension that blocks speculative loading.',
          ],
        ]);
  });

  it('shows an warning if disabled disabled by Data Saver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: true,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        'Speculative loading is disabled', [
          ['Data Saver', 'Speculative loading is disabled because of the operating system\'s Data Saver mode.'],
        ]);
  });

  it('shows an warning if disabled by Battery Saver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: true,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        'Speculative loading is disabled', [
          ['Battery Saver', 'Speculative loading is disabled because of the operating system\'s Battery Saver mode.'],
        ]);
  });

  it('shows an warning if disabled by prefetch holdback', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        'Speculative loading is force-enabled', [
          [
            'Prefetch was disabled, but is force-enabled now',
            'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
          ],
        ]);
  });

  it('shows an warning if disabled by prerender holdback', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: true,
        },
        'Speculative loading is force-enabled', [
          [
            'Prerendering was disabled, but is force-enabled now',
            'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
          ],
        ]);
  });

  it('shows multiple warnings per reason', async () => {
    await testWarnings(
        {
          disabledByPreference: true,
          disabledByDataSaver: true,
          disabledByBatterySaver: true,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: true,
        },
        'Speculative loading is disabled', [
          [
            'User settings or extensions',
            'Speculative loading is disabled because of user settings or an extension. Go to Preload pages settings to update your preference. Go to Extensions settings to disable any extension that blocks speculative loading.',
          ],
          ['Data Saver', 'Speculative loading is disabled because of the operating system\'s Data Saver mode.'],
          ['Battery Saver', 'Speculative loading is disabled because of the operating system\'s Battery Saver mode.'],
          [
            'Prefetch was disabled, but is force-enabled now',
            'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
          ],
          [
            'Prerendering was disabled, but is force-enabled now',
            'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
          ],
        ]);
  });
});
