// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as ExpandableList from '../../../../../../front_end/ui/components/expandable_list/expandable_list.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../front_end/ui/components/report_view/report_view.js';
import {
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithRealConnection} from '../../../helpers/RealConnection.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

const makeFrame = (): SDK.ResourceTreeModel.ResourceTreeFrame => {
  const newFrame: SDK.ResourceTreeModel.ResourceTreeFrame = {
    url: 'https://www.example.com/path/page.html',
    securityOrigin: 'https://www.example.com',
    displayName: () => 'TestTitle',
    unreachableUrl: () => '',
    adFrameType: () => Protocol.Page.AdFrameType.None,
    adFrameStatus: () => undefined,
    getAdScriptId: () => '1' as Protocol.Runtime.ScriptId,
    resourceForURL: () => null,
    isSecureContext: () => true,
    isCrossOriginIsolated: () => true,
    getCrossOriginIsolatedContextType: () => Protocol.Page.CrossOriginIsolatedContextType.NotIsolatedFeatureDisabled,
    getSecureContextType: () => Protocol.Page.SecureContextType.SecureLocalhost,
    getGatedAPIFeatures: () =>
        [Protocol.Page.GatedAPIFeatures.SharedArrayBuffers,
         Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed],
    getOwnerDOMNodeOrDocument: () => ({
      nodeName: () => 'iframe',
    }),
    resourceTreeModel: () => ({
      target: () => ({
        // set to true so that Linkifier.maybeLinkifyScriptLocation() exits
        // early and does not run into other problems with this mock
        isDisposed: () => true,
        model: () => ({
          getSecurityIsolationStatus: () => ({
            coep: {
              value: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
              reportOnlyValue: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
            },
            coop: {
              value: Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin,
              reportOnlyValue: Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin,
            },
          }),
        }),
      }),
    }),
    getCreationStackTraceData: () => ({
      creationStackTrace: {
        callFrames: [{
          functionName: 'function1',
          url: 'http://www.example.com/script.js',
          lineNumber: 15,
          columnNumber: 10,
          scriptId: 'someScriptId',
        }],
      },
      creationStackTraceTarget: null,
    }),
    getOriginTrials: async () => ([
      {
        trialName: 'AppCache',
        status: 'Enabled',
        tokensWithStatus: [{
          status: 'Success',
          rawTokenText: 'Text',
          parsedToken: {
            trialName: 'AppCache',
            origin: 'https://foo.com',
            expiryTime: 1000,
            usageRestriction: 'None',
            isThirdParty: false,
            matchSubDomains: false,
          },
        }],
      },
    ]),
    getPermissionsPolicyState: () => null,
    prerenderFinalStatus: Protocol.Page.PrerenderFinalStatus.MojoBinderPolicy,
    prerenderDisallowedApiMethod: 'device.mojom.GamepadMonitor',
  } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
  return newFrame;
};

describeWithRealConnection('FrameDetailsView', () => {
  it('renders with a title', async () => {
    const frame = makeFrame();
    const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView();
    renderElementIntoDOM(component);
    component.data = {
      frame: frame,
      adScriptId: null,
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, frame.displayName());
  });

  it('renders report keys and values', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.mainTarget();
    assertNotNullOrUndefined(target);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);
    const debuggerId = debuggerModel.debuggerId();

    const frame = makeFrame();
    frame.adFrameType = () => Protocol.Page.AdFrameType.Root;

    const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView();
    renderElementIntoDOM(component);
    component.data = {
      frame,
      target,
      adScriptId: {
        scriptId: 'scriptId' as Protocol.Runtime.ScriptId,
        debuggerId: debuggerId as Protocol.Runtime.UniqueDebuggerId,
      },
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    await coordinator.done();  // 2nd call awaits async render

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'URL',
      'Origin',
      'Owner Element',
      'Frame Creation Stack Trace',
      'Ad Status',
      'Creator Ad Script',
      'Secure Context',
      'Cross-Origin Isolated',
      'Cross-Origin Embedder Policy (COEP)',
      'Cross-Origin Opener Policy (COOP)',
      'SharedArrayBuffers',
      'Measure Memory',
      'Prerendering Status',
      'Disallowed API method',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://www.example.com/path/page.html',
      'https://www.example.com',
      '<iframe>',
      '',
      '',
      '',
      'Yes\xA0Localhost is always a secure context',
      'Yes',
      'None',
      'SameOrigin',
      'available, transferable',
      'available\xA0Learn more',
      'A disallowed API was used by the prerendered page',
      'device.mojom.GamepadMonitor',
    ]);

    const stackTrace = getElementWithinComponent(
        component, 'devtools-resources-stack-trace', ApplicationComponents.StackTrace.StackTrace);
    assertShadowRoot(stackTrace.shadowRoot);
    const expandableList =
        getElementWithinComponent(stackTrace, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    assertShadowRoot(expandableList.shadowRoot);

    const stackTraceRows = getElementsWithinComponent(
        expandableList, 'devtools-stack-trace-row', ApplicationComponents.StackTrace.StackTraceRow);
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assertShadowRoot(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText[0], 'function1\xA0@\xA0http://www.example.com/script.js:16');

    const adScriptLink = component.shadowRoot.querySelector('devtools-report-value.ad-script-link');
    assertNotNullOrUndefined(adScriptLink);
    assert.strictEqual(adScriptLink.textContent, '');
  });

  it('renders report keys and values with on-going prerendering', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.mainTarget();
    assertNotNullOrUndefined(target);

    const frame = makeFrame();

    const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView();
    renderElementIntoDOM(component);
    component.data = {
      frame,
      target,
      adScriptId: null,
      prerenderedUrl: 'https://example.test/',
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    await coordinator.done();  // 2nd call awaits async render

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'URL',
      'Origin',
      'Owner Element',
      'Frame Creation Stack Trace',
      'Secure Context',
      'Cross-Origin Isolated',
      'Cross-Origin Embedder Policy (COEP)',
      'Cross-Origin Opener Policy (COOP)',
      'SharedArrayBuffers',
      'Measure Memory',
      'Prerendering Status',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://www.example.com/path/page.html',
      'https://www.example.com',
      '<iframe>',
      '',
      'Yes\xA0Localhost is always a secure context',
      'Yes',
      'None',
      'SameOrigin',
      'available, transferable',
      'available\xA0Learn more',
      'Prerendering ongoing https://example.test/',
    ]);
  });
});
