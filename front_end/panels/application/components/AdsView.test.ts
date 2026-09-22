// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {cleanTestDOM} from '../../../testing/DOMHooks.js';
import {createTarget, describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {setUpEnvironment} from '../../../testing/OverridesHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import type * as Components from '../../../ui/legacy/components/utils/utils.js';
import type * as UI from '../../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('AdsView', () => {
  let target: SDK.Target.Target;
  let connection: MockCDPConnection;
  let clock: sinon.SinonFakeTimers;

  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    // Stub ResizeObserver to prevent errors in tests caused by the data grid's internal
    // size monitoring, which relies on a functional ResizeObserver.
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = (class {
                                  observe(): void {
                                  }
                                  unobserve(): void {
                                  }
                                  disconnect(): void {
                                  }
                                }) as unknown as typeof ResizeObserver;

    clock = sinon.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout'],
    });
    connection = new MockCDPConnection();
    connection.setSuccessHandler('Ads.getAdMetrics', () => ({
                                                       metrics: {
                                                         viewportAdDensityByArea: 10,
                                                         averageViewportAdDensityByArea: 5,
                                                         viewportAdCount: 5,
                                                         averageViewportAdCount: 2,
                                                         totalAdCpuTime: 150,
                                                         totalAdNetworkBytes: 2048,
                                                         updateAdFrames: [],
                                                         removeAdFrames: [],
                                                       },
                                                     }));
    connection.setSuccessHandler('Ads.getAdScripts', () => ({
                                                       newScripts: [],
                                                     }));

    setUpEnvironment();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB, connection});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});

    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame').callsFake((frameId: string) => {
      return {
        id: frameId,
        resourceTreeModel: () => ({
          target: () => target,
        }),
        getOwnerDeferredDOMNode: async () => {
          return {
            resolvePromise: async () => {
              return {
                getAttribute: (attr: string) => attr === 'id' ? `ad-iframe-${frameId}` : null,
              } as unknown as SDK.DOMModel.DOMNode;
            },
          } as unknown as SDK.DOMModel.DeferredDOMNode;
        },
      } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    });
  });

  afterEach(async () => {
    cleanTestDOM();
    await raf();
    await RenderCoordinator.done();
    // Flush RenderCoordinator's DEADLOCK_TIMEOUT (1500ms).
    // RenderCoordinator sets a 1500ms timeout to detect deadlocks. When using fake timers,
    // this timeout is tracked by TrackAsyncOperations. If we don't advance the clock,
    // the test runner will fail, complaining about a dangling setTimeout promise.
    clock.tick(1500);
    sinon.restore();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('renders initial state correctly', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    await panel.updateComplete;
    await RenderCoordinator.done();
    assert.include(panel.contentElement.textContent, 'Viewport ad density');
    assert.include(panel.contentElement.textContent, '0%');
    assert.include(panel.contentElement.textContent, '0.00%');
    assert.include(panel.contentElement.textContent, '0');
    assert.include(panel.contentElement.textContent, '0.00');
    assert.include(panel.contentElement.textContent, '0\xa0B');
    assert.include(panel.contentElement.textContent, '0\xa0ms');
  });

  it('polls and renders ad metrics', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    // Wait for the initial poll to resolve
    await panel.updateComplete;
    await RenderCoordinator.done();

    assert.include(panel.contentElement.textContent, '10%');
    assert.include(panel.contentElement.textContent, '5.00%');
    assert.include(panel.contentElement.textContent, '5');
    assert.include(panel.contentElement.textContent, '2.00');
    assert.include(panel.contentElement.textContent, '2.0\xa0kB');
    assert.include(panel.contentElement.textContent, '150\xa0ms');

    panel.detach();
  });

  it('clears metrics on primary page changed', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    // Wait for the initial poll to resolve
    await panel.updateComplete;
    await RenderCoordinator.done();
    assert.include(panel.contentElement.textContent, '10%');  // verify data was loaded

    // Simulate primary page changed, but first update the mock to return 0
    connection.setHandler('Ads.getAdMetrics', null);
    connection.setSuccessHandler('Ads.getAdMetrics', () => ({
                                                       metrics: {
                                                         viewportAdDensityByArea: 0,
                                                         averageViewportAdDensityByArea: 0,
                                                         viewportAdCount: 0,
                                                         averageViewportAdCount: 0,
                                                         totalAdCpuTime: 0,
                                                         totalAdNetworkBytes: 0,
                                                         updateAdFrames: [],
                                                         removeAdFrames: [],
                                                       },
                                                     }));
    connection.setHandler('Ads.getAdScripts', null);
    connection.setSuccessHandler('Ads.getAdScripts', () => ({
                                                       newScripts: [],
                                                     }));

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: {} as SDK.ResourceTreeModel.ResourceTreeFrame,
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
    });

    await panel.updateComplete;
    await RenderCoordinator.done();
    // Should be reset to 0s
    assert.include(panel.contentElement.textContent, 'Viewport ad density');
    assert.include(panel.contentElement.textContent, '0%');
    assert.include(panel.contentElement.textContent, '0.00%');
    assert.include(panel.contentElement.textContent, '0');
    assert.include(panel.contentElement.textContent, '0.00');
    assert.include(panel.contentElement.textContent, '0\xa0B');
    assert.include(panel.contentElement.textContent, '0\xa0ms');

    panel.detach();
  });

  it('renders ad frames in data grid and handles updates/removals', async () => {
    let callCount = 0;
    connection.setHandler('Ads.getAdMetrics', null);
    connection.setSuccessHandler('Ads.getAdMetrics', () => {
      callCount++;
      if (callCount === 1) {
        return {
          metrics: {
            viewportAdDensityByArea: 0,
            averageViewportAdDensityByArea: 0,
            viewportAdCount: 0,
            averageViewportAdCount: 0,
            totalAdCpuTime: 0,
            totalAdNetworkBytes: 0,
            updateAdFrames: [
              {
                frameId: 'frame-1' as Protocol.Page.FrameId,
                initialOrigin: 'https://example.com',
                cpuTime: 100,
                networkBytes: 1024,
              },
              {
                frameId: 'frame-2' as Protocol.Page.FrameId,
                initialOrigin: 'https://example2.com',
                cpuTime: 50,
                networkBytes: 1024,
              },
            ],
            removeAdFrames: [],
          },
        };
      }
      return {
        metrics: {
          viewportAdDensityByArea: 0,
          averageViewportAdDensityByArea: 0,
          viewportAdCount: 0,
          averageViewportAdCount: 0,
          totalAdCpuTime: 0,
          totalAdNetworkBytes: 0,
          updateAdFrames: [],
          removeAdFrames: ['frame-1' as Protocol.Page.FrameId],
        },
      };
    });

    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    // Wait for the initial poll and subsequent async element ID fetches to resolve
    await panel.updateComplete;
    await RenderCoordinator.done();

    assert.include(panel.contentElement.textContent, 'Ad iframes (total 2)');
    assert.include(panel.contentElement.textContent, 'ad-iframe-frame-1');
    assert.include(panel.contentElement.textContent, 'https://example.com');
    assert.include(panel.contentElement.textContent, '100\xa0ms');
    assert.include(panel.contentElement.textContent, '1.0\xa0kB');
    assert.include(panel.contentElement.textContent, 'ad-iframe-frame-2');
    assert.include(panel.contentElement.textContent, 'https://example2.com');
    assert.include(panel.contentElement.textContent, '50\xa0ms');

    // Wait for the next poll
    await clock.tickAsync(600);
    await panel.updateComplete;
    await RenderCoordinator.done();

    assert.include(panel.contentElement.textContent, 'Ad iframes (total 1)');
    assert.notInclude(panel.contentElement.textContent, 'https://example.com');
    assert.include(panel.contentElement.textContent, 'https://example2.com');

    panel.detach();
  });

  it('sorts ad frames when data grid header is clicked', async () => {
    let callCount = 0;
    connection.setHandler('Ads.getAdMetrics', null);
    connection.setSuccessHandler('Ads.getAdMetrics', () => {
      callCount++;
      if (callCount === 1) {
        return {
          metrics: {
            viewportAdDensityByArea: 0,
            averageViewportAdDensityByArea: 0,
            viewportAdCount: 0,
            averageViewportAdCount: 0,
            totalAdCpuTime: 0,
            totalAdNetworkBytes: 0,
            updateAdFrames: [
              {
                frameId: 'frame-1' as Protocol.Page.FrameId,
                initialOrigin: 'https://example.com',
                cpuTime: 100,
                networkBytes: 1024,
              },
              {
                frameId: 'frame-2' as Protocol.Page.FrameId,
                initialOrigin: 'https://example2.com',
                cpuTime: 50,
                networkBytes: 2048,
              },
            ],
            removeAdFrames: [],
          },
        };
      }
      return {
        metrics: {
          viewportAdDensityByArea: 0,
          averageViewportAdDensityByArea: 0,
          viewportAdCount: 0,
          averageViewportAdCount: 0,
          totalAdCpuTime: 0,
          totalAdNetworkBytes: 0,
          updateAdFrames: [],
          removeAdFrames: [],
        },
      };
    });

    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    // Wait for the initial poll and subsequent async element ID fetches to resolve
    await panel.updateComplete;
    await RenderCoordinator.done();

    const dataGrid = panel.contentElement.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);

    // Initial order: frame-1, then frame-2 (based on data returned)
    assert.isNotNull(dataGrid.shadowRoot);
    const internalDataGrid = dataGrid.shadowRoot.querySelector('.data-grid');
    assert.isNotNull(internalDataGrid);
    let rows = Array.from(internalDataGrid.querySelectorAll('tbody tr.data-grid-data-grid-node'));
    assert.include(rows[0].textContent, 'frame-1');
    assert.include(rows[1].textContent, 'frame-2');

    const cpuTimeHeader = internalDataGrid.querySelector('th.cpuTime-column');
    assert.isNotNull(cpuTimeHeader);

    // First click sorts ascending by default (50, 100, meaning frame-2 then frame-1)
    cpuTimeHeader.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
    await panel.updateComplete;
    await RenderCoordinator.done({waitForWork: true});
    rows = Array.from(internalDataGrid.querySelectorAll('tbody tr.data-grid-data-grid-node'));
    assert.include(rows[0].textContent, 'frame-2');
    assert.include(rows[1].textContent, 'frame-1');

    // Second click sorts descending (100, 50, meaning frame-1 then frame-2)
    cpuTimeHeader.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
    await panel.updateComplete;
    await RenderCoordinator.done({waitForWork: true});
    rows = Array.from(internalDataGrid.querySelectorAll('tbody tr.data-grid-data-grid-node'));
    assert.include(rows[0].textContent, 'frame-1');
    assert.include(rows[1].textContent, 'frame-2');

    panel.detach();
  });

  it('toggles ad highlights when the checkbox is clicked', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);
    await panel.updateComplete;
    await RenderCoordinator.done();

    const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.showAdHighlightsSettingDescriptor);
    setting.set(false);
    await panel.updateComplete;
    await RenderCoordinator.done();

    const devtoolsCheckbox = panel.contentElement.querySelector('devtools-checkbox');
    assert.isNotNull(devtoolsCheckbox);
    assert.isFalse(devtoolsCheckbox.checked, 'Checkbox should initially be unchecked');

    // Click the checkbox
    devtoolsCheckbox.click();
    await panel.updateComplete;
    await RenderCoordinator.done();

    assert.isTrue(setting.get(), 'Setting should be true after checking the box');
    assert.isTrue(devtoolsCheckbox.checked, 'Checkbox should be checked after click');

    panel.detach();
  });

  it('reveals the frame when the element ID button is clicked', async () => {
    let callCount = 0;
    connection.setHandler('Ads.getAdMetrics', null);
    connection.setSuccessHandler('Ads.getAdMetrics', () => {
      callCount++;
      if (callCount === 1) {
        return {
          metrics: {
            viewportAdDensityByArea: 0,
            averageViewportAdDensityByArea: 0,
            viewportAdCount: 0,
            averageViewportAdCount: 0,
            totalAdCpuTime: 0,
            totalAdNetworkBytes: 0,
            updateAdFrames: [
              {
                frameId: 'frame-1' as Protocol.Page.FrameId,
                initialOrigin: 'https://example.com',
                cpuTime: 100,
                networkBytes: 1024,
              },
            ],
            removeAdFrames: [],
          },
        };
      }
      return {
        metrics: {
          viewportAdDensityByArea: 0,
          averageViewportAdDensityByArea: 0,
          viewportAdCount: 0,
          averageViewportAdCount: 0,
          totalAdCpuTime: 0,
          totalAdNetworkBytes: 0,
          updateAdFrames: [],
          removeAdFrames: [],
        },
      };
    });

    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    // Wait for the initial poll and subsequent async element ID fetches to resolve
    await panel.updateComplete;
    await RenderCoordinator.done();

    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

    const linkButton = panel.contentElement.querySelector('.devtools-link') as HTMLButtonElement;
    assert.isNotNull(linkButton);

    linkButton.click();
    sinon.assert.calledOnce(revealStub);

    const revealable = revealStub.firstCall.args[0] as SDK.ResourceTreeModel.ResourceTreeFrame;
    assert.strictEqual(revealable.id, 'frame-1');

    panel.detach();
  });

  it('renders ad scripts in data grid, dedupes by URL, and filters inline/anonymous/content scripts', async () => {
    let callCount = 0;
    connection.setHandler('Ads.getAdScripts', null);
    connection.setSuccessHandler('Ads.getAdScripts', () => {
      callCount++;
      if (callCount === 1) {
        return {
          newScripts: [
            {scriptId: 'script-1' as Protocol.Runtime.ScriptId},
            {scriptId: 'script-2' as Protocol.Runtime.ScriptId},
            {scriptId: 'script-3' as Protocol.Runtime.ScriptId},
            {scriptId: 'script-4' as Protocol.Runtime.ScriptId},
            {scriptId: 'script-5' as Protocol.Runtime.ScriptId},
          ] as Protocol.Ads.AdScript[],
        };
      }
      return {newScripts: []};
    });

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    sinon.stub(debuggerModel, 'scriptForId').callsFake((scriptId: string) => {
      const mockScript = {
        scriptId,
        sourceURL: '',
        isInlineScript: () => false,
        isContentScript: () => false,
      } as unknown as SDK.Script.Script;

      if (scriptId === 'script-1') {
        mockScript.sourceURL = urlString`https://example.com/ad.js`;
      } else if (scriptId === 'script-2') {
        mockScript.sourceURL = urlString`https://example.com/ad.js`;  // Duplicate URL
      } else if (scriptId === 'script-3') {
        mockScript.sourceURL = urlString`https://example.com/other-ad.js`;
      } else if (scriptId === 'script-4') {
        mockScript.sourceURL = urlString`https://example.com/index.html`;
        mockScript.isInlineScript = () => true;  // Inline script, should be filtered
      } else if (scriptId === 'script-5') {
        mockScript.sourceURL = urlString`https://example.com/content-script.js`;
        mockScript.isContentScript = () => true;  // Content script, should be filtered
      }
      return mockScript;
    });

    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    await panel.updateComplete;
    await RenderCoordinator.done();

    assert.include(panel.contentElement.textContent, 'Ad scripts (total 2)');
    assert.include(panel.contentElement.textContent, 'https://example.com/ad.js');
    assert.include(panel.contentElement.textContent, 'https://example.com/other-ad.js');
    assert.notInclude(panel.contentElement.textContent, 'https://example.com/index.html');
    assert.notInclude(panel.contentElement.textContent, 'https://example.com/content-script.js');

    panel.detach();
  });

  it('renders ad script provenance scenarios', async () => {
    let callCount = 0;
    connection.setHandler('Ads.getAdScripts', null);
    connection.setSuccessHandler('Ads.getAdScripts', () => {
      callCount++;
      if (callCount === 1) {
        return {
          newScripts: [
            {
              scriptId: 'script-4' as Protocol.Runtime.ScriptId,
              provenance: {
                adScriptAncestry: {
                  ancestryChain: [
                    {scriptId: 'script-2' as Protocol.Runtime.ScriptId},
                  ],
                },
              } as Protocol.Network.AdProvenance,
            },
            {
              scriptId: 'script-2' as Protocol.Runtime.ScriptId,
              provenance: {
                adScriptAncestry: {
                  ancestryChain: [
                    {scriptId: 'script-1' as Protocol.Runtime.ScriptId},
                  ],
                },
              } as Protocol.Network.AdProvenance,
            },
            {
              scriptId: 'script-3' as Protocol.Runtime.ScriptId,
            },
            {
              scriptId: 'script-1' as Protocol.Runtime.ScriptId,
              provenance: {
                filterlistRule: 'easylist-rule-1',
              } as Protocol.Network.AdProvenance,
            },
          ] as Protocol.Ads.AdScript[],
        };
      }
      return {newScripts: []};
    });

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    sinon.stub(debuggerModel, 'scriptForId').callsFake((scriptId: string) => {
      const mockScript = {
        scriptId,
        sourceURL: urlString`https://example.com/${scriptId}.js`,
        isInlineScript: () => false,
        isContentScript: () => false,
      } as unknown as SDK.Script.Script;
      return mockScript;
    });

    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    await panel.updateComplete;
    await RenderCoordinator.done({waitForWork: true});

    const dataGrid = panel.contentElement.querySelector('.ad-scripts-data-grid');
    assert.isNotNull(dataGrid);
    assert.isNotNull(dataGrid.shadowRoot);

    // Check that we have an aria-details element for each script
    const ariaDetailsDivs = panel.contentElement.querySelectorAll('div[aria-details]');
    assert.lengthOf(ariaDetailsDivs, 4, 'Should have one aria-details div per ad script');

    // Scenario 1: Filter list rule
    const script1Details = panel.contentElement.querySelector('div[aria-details="ad-tooltip-script-1"]');
    assert.isNotNull(script1Details);
    assert.include(script1Details.textContent, 'easylist-rule-1');

    // Scenario 2: Ad script ancestry and filter list rule
    const script2Details = panel.contentElement.querySelector('div[aria-details="ad-tooltip-script-2"]');
    assert.isNotNull(script2Details);
    assert.isDefined(script2Details.textContent);

    const script2Tooltip = panel.contentElement.querySelector('devtools-tooltip[id="ad-tooltip-script-2"]');
    assert.isNotNull(script2Tooltip);
    assert.include(script2Tooltip.textContent, 'Creator ad script ancestry');
    assert.include(script2Tooltip.textContent, 'Root script filter list rule');
    assert.include(script2Tooltip.textContent, 'easylist-rule-1');

    // The ancestry link should be rendered via the ScriptLocationLink widget (wrapped in devtools-widget).
    const widget = script2Details.querySelector<UI.Widget.WidgetElement<Components.Linkifier.ScriptLocationLink>>(
        'devtools-widget');
    assert.isNotNull(widget);
    const linkComponent = widget.getWidget();
    assert.exists(linkComponent);
    assert.strictEqual(linkComponent.scriptId, 'script-1');

    // Scenario 3: No provenance
    const script3Details = panel.contentElement.querySelector('div[aria-details="ad-tooltip-script-3"]');
    assert.isNotNull(script3Details);
    assert.include(script3Details.textContent, '<no provenance>');

    const script3Tooltip = panel.contentElement.querySelector('devtools-tooltip[id="ad-tooltip-script-3"]');
    assert.isNotNull(script3Tooltip);
    assert.include(script3Tooltip.textContent, 'No provenance data is available');

    // Scenario 4: Recursive Ad script ancestry and filter list rule
    const script4Details = panel.contentElement.querySelector('div[aria-details="ad-tooltip-script-4"]');
    assert.isNotNull(script4Details);

    const script4Tooltip = panel.contentElement.querySelector('devtools-tooltip[id="ad-tooltip-script-4"]');
    assert.isNotNull(script4Tooltip);
    assert.include(script4Tooltip.textContent, 'Creator ad script ancestry');
    assert.include(script4Tooltip.textContent, 'Root script filter list rule');
    assert.include(script4Tooltip.textContent, 'easylist-rule-1');

    // It should have two ancestors rendered in the tooltip
    const script4Widgets =
        script4Tooltip.querySelectorAll<UI.Widget.WidgetElement<Components.Linkifier.ScriptLocationLink>>(
            'devtools-widget');
    assert.lengthOf(script4Widgets, 2);
    const linkComponent1 = script4Widgets[0].getWidget();
    assert.exists(linkComponent1);
    assert.strictEqual(linkComponent1.scriptId, 'script-2');
    const linkComponent2 = script4Widgets[1].getWidget();
    assert.exists(linkComponent2);
    assert.strictEqual(linkComponent2.scriptId, 'script-1');

    // Verify clicking the ancestor script links inside the rendered DataGrid shadow DOM tooltip triggers the link action.
    await Promise.all([linkComponent1.updateComplete, linkComponent2.updateComplete]);
    await RenderCoordinator.done();

    const linkifierClass = linkComponent1.linkifier.constructor as typeof Components.Linkifier.Linkifier;
    const invokeFirstActionStub = sinon.stub(linkifierClass, 'invokeFirstAction').returns(true);
    const shadowTooltip = dataGrid.shadowRoot.querySelector('devtools-tooltip[id="ad-tooltip-script-4"]');
    assert.isNotNull(shadowTooltip);
    const tooltipLinks = shadowTooltip.querySelectorAll<HTMLElement>('.devtools-link');
    assert.lengthOf(tooltipLinks, 2);

    tooltipLinks[0].click();
    sinon.assert.calledOnce(invokeFirstActionStub);

    tooltipLinks[1].click();
    sinon.assert.calledTwice(invokeFirstActionStub);

    panel.detach();
  });

  it('verifies tooltip styles are in the datagrid shadow dom', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    await panel.updateComplete;
    await RenderCoordinator.done();

    const dataGrid = panel.contentElement.querySelector('.ad-scripts-data-grid');
    const styles = dataGrid!.shadowRoot!.querySelectorAll('style');

    let found = false;
    for (const style of styles) {
      if (style.textContent.includes('ad-provenance-tooltip-content')) {
        found = true;
      }
    }
    assert.isTrue(found, 'Style not found in DataGrid shadow root');
  });
});
