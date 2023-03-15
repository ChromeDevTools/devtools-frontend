// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as Resources from '../../../../../../front_end/panels/application/application.js';
import * as DataGrid from '../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertShadowRoot,
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

function assertGridContents(gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  const headerGot = Array.from(getHeaderCells(grid.shadowRoot), cell => {
    assertNotNullOrUndefined(cell.textContent);
    return cell.textContent.trim();
  });
  const rowsGot = getValuesOfAllBodyRows(grid.shadowRoot);

  assert.deepEqual([headerGot, rowsGot], [headerExpected, rowsExpected]);
}

let seqLast = 0;

function dispatchEventsForNavigationWithSpeculationRules(target: SDK.Target.Target, speculationrules?: string) {
  const seq = ++seqLast;
  const frameId = `frameId:${seq}`;
  const loaderId = `loaderId:${seq}`;

  dispatchEvent(target, 'Page.frameNavigated', {
    frame: {
      id: frameId,
      loaderId,
      url: 'https://example.com/',
      domainAndRegistry: 'example.com',
      securityOrigin: 'https://example.com/',
      mimeType: 'text/html',
      secureContextType: Protocol.Page.SecureContextType.Secure,
      crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
      gatedAPIFeatures: [],
    },
  });

  if (speculationrules === undefined) {
    return;
  }

  let json;
  try {
    json = JSON.parse(speculationrules);
  } catch (_) {
  }

  if (json === undefined) {
    return;
  }

  // Currently, invalid rule set is not synced by `Preload.ruleSetUpdated`
  //
  // TODO(https://crbug.com/1384419): Include invalid ones.
  dispatchEvent(target, 'Preload.ruleSetUpdated', {
    ruleSet: {
      id: `ruleSetId:${seq}`,
      loaderId,
      sourceText: speculationrules,
    },
  });

  // For simplicity
  assert.strictEqual(json['prerender'].length, 1);
  assert.strictEqual(json['prerender'][0]['source'], 'list');
  assert.strictEqual(json['prerender'][0]['urls'].length, 1);

  const url = 'https://example.com' + json['prerender'][0]['urls'][0];

  dispatchEvent(target, 'Preload.prerenderStatusUpdated', {
    initiatingFrameId: frameId,
    prerenderingUrl: url,
    status: Protocol.Preload.PreloadingStatus.Running,
  });

  dispatchEvent(target, 'Target.targetInfoChanged', {
    targetInfo: {
      targetId: `targetId:prerendered:${seq}`,
      type: 'frame',
      subtype: 'prerender',
      url,
      title: '',
      attached: true,
      canAccessOpener: true,
    },
  });
}

function createView(target: SDK.Target.Target): Resources.PreloadingView.PreloadingView {
  const model = target.model(SDK.PreloadingModel.PreloadingModel);
  assertNotNullOrUndefined(model);
  const view = new Resources.PreloadingView.PreloadingView(model);
  const container = new UI.Widget.VBox();
  view.show(container.element);

  return view;
}

describeWithMockConnection('PreloadingView', async () => {
  it('renders grid and details', async () => {
    const TIMESTAMP = 42;
    sinon.stub(Date, 'now').returns(TIMESTAMP);

    const target = createTarget();
    const view = createView(target);

    dispatchEventsForNavigationWithSpeculationRules(target, `
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

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);
    const preloadingGridComponent = view.getPreloadingGridForTest();
    assertShadowRoot(preloadingGridComponent.shadowRoot);
    const preloadingDetailsComponent = view.getPreloadingDetailsForTest();
    assertShadowRoot(preloadingDetailsComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Validity'],
        [
          ['Valid'],
        ],
    );

    assertGridContents(
        preloadingGridComponent,
        ['URL', 'Action', 'Status'],
        [
          [
            'https://example.com/prerendered.html',
            'prerender',
            'Running',
          ],
        ],
    );

    const placeholder = preloadingDetailsComponent.shadowRoot.querySelector('div.preloading-noselected div p');

    assert.strictEqual(placeholder?.textContent, 'Select an element for more details');
  });

  // TODO(https://crbug.com/1384419): Check that preloading attempts for
  // the previous page vanish once loaderId is added to events
  // prefetch/prerenderAttemptUpdated.
  it('clears SpeculationRules for previous pages', async () => {
    const target = createTarget();
    const view = createView(target);

    dispatchEventsForNavigationWithSpeculationRules(target, `
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

    dispatchEventsForNavigationWithSpeculationRules(target);

    await coordinator.done();

    const ruleSetGridComponent = view.getRuleSetGridForTest();
    assertShadowRoot(ruleSetGridComponent.shadowRoot);

    assertGridContents(
        ruleSetGridComponent,
        ['Validity'],
        [],
    );
  });

  it('shows no warnings if holdback flags are disabled', async () => {
    const featureFlags = {
      'PreloadingHoldback': false,
      'PrerenderHoldback': false,
    };

    const target = createTarget();

    sinon.stub(target.systemInfo(), 'invoke_getFeatureState').callsFake(async x => {
      const featureEnabled = featureFlags[x.featureState as keyof typeof featureFlags];
      return {featureEnabled} as Protocol.SystemInfo.GetFeatureStateResponse;
    });

    const view = createView(target);

    await view.getFeatureFlagWarningsPromiseForTest();
    await coordinator.done();

    const infobarContainer = view.getInfobarContainerForTest();
    assert.strictEqual(infobarContainer.children.length, 0);
  });

  it('shows an warning if PreloadingHoldback enabled', async () => {
    const featureFlags = {
      'PreloadingHoldback': true,
      'PrerenderHoldback': false,
    };

    const target = createTarget();

    sinon.stub(target.systemInfo(), 'invoke_getFeatureState').callsFake(async x => {
      const featureEnabled = featureFlags[x.featureState as keyof typeof featureFlags];
      return {featureEnabled} as Protocol.SystemInfo.GetFeatureStateResponse;
    });

    const view = createView(target);

    await view.getFeatureFlagWarningsPromiseForTest();
    await coordinator.done();

    const infobarContainer = view.getInfobarContainerForTest();
    const infoTexts = Array.from(infobarContainer.children).map(infobarElement => {
      assertShadowRoot(infobarElement.shadowRoot);
      const infoText = infobarElement.shadowRoot.querySelector('.infobar-info-text');
      assertNotNullOrUndefined(infoText);
      return infoText.textContent;
    });
    assert.deepEqual(infoTexts, ['Preloading was disabled, but is force-enabled now']);
  });

  it('shows two warnings if PreloadingHoldback and Prerender2Holdback enabled', async () => {
    const featureFlags = {
      'PreloadingHoldback': true,
      'PrerenderHoldback': true,
    };

    const target = createTarget();

    sinon.stub(target.systemInfo(), 'invoke_getFeatureState').callsFake(async x => {
      const featureEnabled = featureFlags[x.featureState as keyof typeof featureFlags];
      return {featureEnabled} as Protocol.SystemInfo.GetFeatureStateResponse;
    });

    const view = createView(target);

    await view.getFeatureFlagWarningsPromiseForTest();
    await coordinator.done();

    const infobarContainer = view.getInfobarContainerForTest();
    const infoTexts = Array.from(infobarContainer.children).map(infobarElement => {
      assertShadowRoot(infobarElement.shadowRoot);
      const infoText = infobarElement.shadowRoot.querySelector('.infobar-info-text');
      assertNotNullOrUndefined(infoText);
      return infoText.textContent;
    });
    assert.deepEqual(
        infoTexts,
        ['Preloading was disabled, but is force-enabled now', 'Prerendering was disabled, but is force-enabled now']);
  });
});
