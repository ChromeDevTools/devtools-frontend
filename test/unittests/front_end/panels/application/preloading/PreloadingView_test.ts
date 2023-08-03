// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as Resources from '../../../../../../front_end/panels/application/application.js';
import * as DataGrid from '../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../front_end/ui/components/report_view/report_view.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
} from '../../../helpers/DOMHelpers.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../../helpers/MockConnection.js';
import {getHeaderCells, getValuesOfAllBodyRows} from '../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const zip2 = <T, S>(xs: T[], ys: S[]): [T, S][] => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

function assertGridContents(gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  const headerGot = Array.from(getHeaderCells(grid.shadowRoot), cell => {
    assertNotNullOrUndefined(cell.textContent);
    return cell.textContent.trim();
  });
  const rowsGot = getValuesOfAllBodyRows(grid.shadowRoot).map(row => row.map(cell => cell.trim()));

  assert.deepEqual([headerGot, rowsGot], [headerExpected, rowsExpected]);
}

async function testWarnings(event: Protocol.Preload.PreloadEnabledStateUpdatedEvent, infoTextsExpected: string[]) {
  const target = createTarget();

  const warningsUpdatedPromise: Promise<void> = new Promise(resolve => {
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    model.addEventListener(SDK.PreloadingModel.Events.WarningsUpdated, _ => resolve());
  });

  const view = createRuleSetView(target);

  dispatchEvent(target, 'Preload.preloadEnabledStateUpdated', event);

  await warningsUpdatedPromise;
  await coordinator.done();

  const infobarContainer = view.getInfobarContainerForTest();
  const infoTextsGot = Array.from(infobarContainer.children).map(infobarElement => {
    assertShadowRoot(infobarElement.shadowRoot);
    const infoText = infobarElement.shadowRoot.querySelector('.infobar-info-text');
    assertNotNullOrUndefined(infoText);
    return infoText.textContent;
  });
  assert.deepEqual(infoTextsGot, infoTextsExpected);
}

// Holds targets and ids, and emits events.
class NavigationEmulator {
  private seq: number = 0;
  private tabTarget: SDK.Target.Target;
  primaryTarget: SDK.Target.Target;
  private frameId: Protocol.Page.FrameId;
  private loaderId: Protocol.Network.LoaderId;
  private prerenderTarget: SDK.Target.Target|null = null;
  private prerenderStatusUpdatedEvent: Protocol.Preload.PrerenderStatusUpdatedEvent|null = null;

  constructor() {
    this.tabTarget = createTarget({type: SDK.Target.Type.Tab});
    // Fill fake ones here and fill real ones in async part.
    this.primaryTarget = createTarget();
    this.frameId = 'fakeFrameId' as Protocol.Page.FrameId;
    this.loaderId = 'fakeLoaderId' as Protocol.Network.LoaderId;
  }

  private async createTarget(targetInfo: Protocol.Target.TargetInfo, sessionId: Protocol.Target.SessionID):
      Promise<SDK.Target.Target> {
    const childTargetManager = this.tabTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assertNotNullOrUndefined(childTargetManager);

    dispatchEvent(this.tabTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager.attachedToTarget({
      sessionId,
      targetInfo,
      waitingForDebugger: false,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById(targetInfo.targetId);
    assertNotNullOrUndefined(target);

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

    assert.isFalse(url === this.prerenderTarget?.targetInfo()?.url);

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

    assertNotNullOrUndefined(this.prerenderTarget);
    assert.isTrue(url === this.prerenderTarget.targetInfo()?.url);
    assertNotNullOrUndefined(this.prerenderStatusUpdatedEvent);

    this.seq++;
    this.loaderId = this.prerenderStatusUpdatedEvent.key.loaderId;

    const targetInfo = this.prerenderTarget.targetInfo();
    assertNotNullOrUndefined(targetInfo);

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
      status: SDK.PreloadingModel.PreloadingStatus.Success,
    });
  }

  async addSpecRules(specrules: string): Promise<void> {
    this.seq++;

    // For simplicity, we only emit errors if parse failed.
    let json;
    try {
      json = JSON.parse(specrules);
    } catch (_) {
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
      assert.strictEqual(prefetchAttempt['urls'].length, 1);

      const url = 'https://example.com' + prefetchAttempt['urls'][0];

      dispatchEvent(this.primaryTarget, 'Preload.prefetchStatusUpdated', {
        key: {
          loaderId: this.loaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url,
        },
        initiatingFrameId: this.frameId,
        prefetchUrl: url,
        status: SDK.PreloadingModel.PreloadingStatus.Running,
      });
    }

    if (json['prerender'] === undefined) {
      return;
    }

    // For simplicity
    assert.strictEqual(json['prerender'].length, 1);
    assert.strictEqual(json['prerender'][0]['source'], 'list');
    assert.strictEqual(json['prerender'][0]['urls'].length, 1);

    const prerenderUrl = 'https://example.com' + json['prerender'][0]['urls'][0];

    this.prerenderStatusUpdatedEvent = {
      key: {
        loaderId: this.loaderId,
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: prerenderUrl,
      },
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
  assertNotNullOrUndefined(model);
  const view = new Resources.PreloadingView.PreloadingRuleSetView(model);
  const container = new UI.Widget.VBox();
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

function createAttemptView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingAttemptView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assertNotNullOrUndefined(model);
  const view = new Resources.PreloadingView.PreloadingAttemptView(model);
  const container = new UI.Widget.VBox();
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

function createResultView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingResultView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assertNotNullOrUndefined(model);
  const view = new Resources.PreloadingView.PreloadingResultView(model);
  const container = new UI.Widget.VBox();
  view.show(container.element);
  // Ensure PreloadingModelProxy.initialize to be called.
  view.wasShown();

  return view;
}

describeWithMockConnection('PreloadingRuleSetView', async () => {
  it('renders grid and details', async () => {
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

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['#', 'Validity', 'Location', 'Preloads'],
        [
          ['2', 'Valid', '<script>', '1 Running'],
        ],
    );
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

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);
    const ruleSetDetailsComponent = view.getRuleSetDetailsForTest();
    assertShadowRoot(ruleSetDetailsComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['#', 'Validity', 'Location', 'Preloads'],
        [
          ['2', 'Invalid', '<script>', ''],
        ],
    );

    const cells = [
      {columnId: 'id', value: 'ruleSetId:0.2'},
      {columnId: 'Validity', value: 'Invalid'},
    ];
    ruleSetGridComponent.dispatchEvent(
        new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'Validity', value: 'Invalid'}, {cells}));

    await coordinator.done();

    const report = getElementWithinComponent(ruleSetDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['Validity', 'Invalid; source is not a JSON object'],
      ['Error', 'fake error message'],
      ['Location', '<script>'],
      ['Source', '{"prerender":[{"source": "list",'],
    ]);
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

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['#', 'Validity', 'Location', 'Preloads'],
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

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['#', 'Validity', 'Location', 'Preloads'],
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
    assertNotNullOrUndefined(childTargetManager);

    dispatchEvent(emulator.primaryTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager.attachedToTarget({
      sessionId: 'sessionId' as Protocol.Target.SessionID,
      targetInfo,
      waitingForDebugger: false,
    });

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['#', 'Validity', 'Location', 'Preloads'],
        [
          ['2', 'Valid', '<script>', ''],
        ],
    );
  });

  it('shows no warnings if nothing disabled', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        []);
  });

  it('shows an warning if prefetch is disabled by holdback', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Prefetch was disabled, but is force-enabled now']);
  });

  it('shows two warnings if prefetch and prerender are disabled by holdback', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: true,
        },
        ['Prefetch was disabled, but is force-enabled now', 'Prerendering was disabled, but is force-enabled now']);
  });

  it('shows an warning if preloading is disabled by preference', async () => {
    await testWarnings(
        {
          disabledByPreference: true,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });

  it('shows an warning if preloading is disabled by DataSaver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: true,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });

  it('shows an warning if preloading is disabled by BatterySaver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: true,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });
});

describeWithMockConnection('PreloadingAttemptView', async () => {
  it('renders grid and details', async () => {
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

    await coordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'prerender',
            '',
            'Running',
          ],
        ],
    );

    const placeholder = preloadingDetailsComponent.shadowRoot.querySelector('div.preloading-noselected div p');

    assert.strictEqual(placeholder?.textContent, 'Select an element for more details');
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
    assertNotNullOrUndefined(childTargetManager);

    dispatchEvent(emulator.primaryTarget, 'Target.targetCreated', {targetInfo});

    await childTargetManager.attachedToTarget({
      sessionId: 'sessionId' as Protocol.Target.SessionID,
      targetInfo,
      waitingForDebugger: false,
    });

    await coordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'prerender',
            '',
            'Running',
          ],
        ],
    );

    const placeholder = preloadingDetailsComponent.shadowRoot.querySelector('div.preloading-noselected div p');

    assert.strictEqual(placeholder?.textContent, 'Select an element for more details');
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

    await coordinator.done();

    const ruleSetSelectorToolbarItem = view.getRuleSetSelectorToolbarItemForTest();
    const preloadingGridComponent = view.getPreloadingGridForTest();
    assertShadowRoot(preloadingGridComponent.shadowRoot);

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'All rule sets');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'prefetch',
            'Main_Page',
            'Running',
          ],
          [
            '/prerendered3.html',
            'prerender',
            'Main_Page',
            'Running',
          ],
        ],
    );

    // Turn on filtering.
    view.selectRuleSetOnFilterForTest('ruleSetId:0.2' as Protocol.Preload.RuleSetId);

    await coordinator.done();

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'Rule set: 2');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'prefetch',
            'Main_Page',
            'Running',
          ],
        ],
    );

    // Turn off filtering.
    view.selectRuleSetOnFilterForTest(null);

    await coordinator.done();

    assert.strictEqual(ruleSetSelectorToolbarItem.element.querySelector('span')?.textContent, 'All rule sets');

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/subresource2.js',
            'prefetch',
            'Main_Page',
            'Running',
          ],
          [
            '/prerendered3.html',
            'prerender',
            'Main_Page',
            'Running',
          ],
        ],
    );
  });

  it('shows prerender details with Investigate and Activate (disabled) buttons for Running', async () => {
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

    await coordinator.done();

    const preloadingGridComponent = view.getPreloadingGridForTest();
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'prerender',
            '',
            'Running',
          ],
        ],
    );

    const cells = [
      {columnId: 'id', value: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'},
      // Omit other columns.
    ];
    preloadingGridComponent.dispatchEvent(
        new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'URL', value: '/prerendered.html'}, {cells}));

    await coordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'prerenderInspectActivate'],
      ['Status', 'Preloading is running.'],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.strictEqual(buttons[0].getAttribute('disabled'), null);
    assert.strictEqual(buttons[1].textContent?.trim(), 'Activate');
    assert.strictEqual(buttons[1].getAttribute('disabled'), '');
  });

  it('shows prerender details with Investigate and Activate buttons for Ready', async () => {
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
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    await coordinator.done();

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'prerender',
            '',
            'Ready',
          ],
        ],
    );

    const cells = [
      {columnId: 'id', value: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'},
      // Omit other columns.
    ];
    preloadingGridComponent.dispatchEvent(
        new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'URL', value: '/prerendered.html'}, {cells}));

    await coordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'prerenderInspectActivate'],
      ['Status', 'Preloading finished and the result is ready for the next navigation.'],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.strictEqual(buttons[0].getAttribute('disabled'), null);
    assert.strictEqual(buttons[1].textContent?.trim(), 'Activate');
    assert.strictEqual(buttons[1].getAttribute('disabled'), null);
  });

  it('shows prerender details with Investigate (disabled) and Activate (disabled) buttons for Failure', async () => {
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
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    await coordinator.done();

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'prerender',
            '',
            'Failure - The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
          ],
        ],
    );

    const cells = [
      {columnId: 'id', value: 'loaderId:1:Prerender:https://example.com/prerendered.html:undefined'},
      // Omit other columns.
    ];
    preloadingGridComponent.dispatchEvent(
        new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'URL', value: '/prerendered.html'}, {cells}));

    await coordinator.done();

    const report =
        getElementWithinComponent(preloadingDetailsComponent, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', 'https://example.com/prerendered.html'],
      ['Action', 'prerenderInspectActivate'],
      ['Status', 'Preloading failed.'],
      [
        'Failure reason',
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
      ],
    ]);

    const buttons = report.querySelectorAll('devtools-report-value:nth-of-type(2) devtools-button');
    assert.strictEqual(buttons[0].textContent?.trim(), 'Inspect');
    assert.strictEqual(buttons[0].getAttribute('disabled'), '');
    assert.strictEqual(buttons[1].textContent?.trim(), 'Activate');
    assert.strictEqual(buttons[1].getAttribute('disabled'), '');
  });
});

describeWithMockConnection('PreloadingResultView', async () => {
  it('shows information of preloading of the last page', async () => {
    const emulator = new NavigationEmulator();
    await emulator.openDevTools();
    const view = createResultView(emulator.primaryTarget);

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

    await coordinator.done();

    const usedPreloadingComponent = view.getUsedPreloadingForTest();
    assertShadowRoot(usedPreloadingComponent.shadowRoot);

    assert.include(usedPreloadingComponent.shadowRoot.textContent, 'This page was successfully prerendered.');
  });
});

describeWithMockConnection('PreloadingWarningsView', async () => {
  it('shows no warnings if holdback flags are disabled', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        []);
  });

  it('shows an warning if PreloadingHoldback enabled', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Prefetch was disabled, but is force-enabled now']);
  });

  it('shows two warnings if PreloadingHoldback and Prerender2Holdback enabled', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: true,
          disabledByHoldbackPrerenderSpeculationRules: true,
        },
        ['Prefetch was disabled, but is force-enabled now', 'Prerendering was disabled, but is force-enabled now']);
  });

  it('shows an warning if PreloadEnabledState DisabledByPreference', async () => {
    await testWarnings(
        {
          disabledByPreference: true,
          disabledByDataSaver: false,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });

  it('shows an warning if Preloading is disabled by DataSaver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: true,
          disabledByBatterySaver: false,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });

  it('shows an warning if Preloading is disabled by BatterySaver', async () => {
    await testWarnings(
        {
          disabledByPreference: false,
          disabledByDataSaver: false,
          disabledByBatterySaver: true,
          disabledByHoldbackPrefetchSpeculationRules: false,
          disabledByHoldbackPrerenderSpeculationRules: false,
        },
        ['Preloading is disabled']);
  });

  it('shows warnings only once even if multiple events received', async () => {
    const event = {
      disabledByPreference: false,
      disabledByDataSaver: false,
      disabledByBatterySaver: false,
      disabledByHoldbackPrefetchSpeculationRules: true,
      disabledByHoldbackPrerenderSpeculationRules: false,
    };
    const infoTextsExpected = ['Prefetch was disabled, but is force-enabled now'];

    const target = createTarget();
    const view = createRuleSetView(target);

    const warningsUpdatedPromise: Promise<void> = new Promise(resolve => {
      const model = target.model(SDK.PreloadingModel.PreloadingModel);
      assertNotNullOrUndefined(model);
      model.addEventListener(SDK.PreloadingModel.Events.WarningsUpdated, _ => resolve());
    });

    dispatchEvent(target, 'Preload.preloadEnabledStateUpdated', event);

    await warningsUpdatedPromise;
    await coordinator.done();

    const warningsUpdatedPromise2: Promise<void> = new Promise(resolve => {
      const model = target.model(SDK.PreloadingModel.PreloadingModel);
      assertNotNullOrUndefined(model);
      model.addEventListener(SDK.PreloadingModel.Events.WarningsUpdated, _ => resolve());
    });

    dispatchEvent(target, 'Preload.preloadEnabledStateUpdated', event);

    await warningsUpdatedPromise2;
    await coordinator.done();

    const infobarContainer = view.getInfobarContainerForTest();
    const infoTextsGot = Array.from(infobarContainer.children).map(infobarElement => {
      assertShadowRoot(infobarElement.shadowRoot);
      const infoText = infobarElement.shadowRoot.querySelector('.infobar-info-text');
      assertNotNullOrUndefined(infoText);
      return infoText.textContent;
    });
    assert.deepEqual(infoTextsGot, infoTextsExpected);
  });
});
