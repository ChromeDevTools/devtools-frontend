// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {
  getCleanTextContentFromElements,
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../../testing/MockConnection.js';
import * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';

import * as ApplicationComponents from './components.js';

const makeFrame = (target: SDK.Target.Target) => {
  const newFrame: SDK.ResourceTreeModel.ResourceTreeFrame = {
    url: 'https://www.example.com/path/page.html',
    securityOrigin: 'https://www.example.com',
    displayName: () => 'TestTitle',
    unreachableUrl: () => '',
    adFrameType: () => Protocol.Page.AdFrameType.None,
    adFrameStatus: () => undefined,
    getAdScriptAncestry: () => null,
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
    resourceTreeModel: () => target.model(SDK.ResourceTreeModel.ResourceTreeModel),
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
    parentFrame: () => null,
  } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
  return newFrame;
};

describeWithMockConnection('FrameDetailsView', () => {
  it('renders with a title', async () => {
    const frame = makeFrame(createTarget());
    const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(frame);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    void component.render();
    await RenderCoordinator.done({waitForWork: true});
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const titleElement = report.shadowRoot!.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, frame.displayName());
  });

  it('renders report keys and values', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping: new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace),
      targetManager,
      ignoreListManager,
    });

    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    sinon.stub(SDK.DebuggerModel.DebuggerModel, 'modelForDebuggerId').resolves(debuggerModel);

    const scriptParsedEvent1: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: '123' as Protocol.Runtime.ScriptId,
      url: 'https://www.google.com/ad-script1.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId: 1234 as Protocol.Runtime.ExecutionContextId,
      hash: '',
      buildId: '',
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent1);

    const scriptParsedEvent2: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: '456' as Protocol.Runtime.ScriptId,
      url: 'https://www.google.com/ad-script2.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId: 1234 as Protocol.Runtime.ExecutionContextId,
      hash: '',
      buildId: '',
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent2);

    const frame = makeFrame(target);
    frame.adFrameType = () => Protocol.Page.AdFrameType.Root;
    frame.parentFrame = () => ({
      getAdScriptAncestry: () => ({
        ancestryChain: [
          {
            scriptId: '123' as Protocol.Runtime.ScriptId,
            debuggerId: '42' as Protocol.Runtime.UniqueDebuggerId,
          },
          {
            scriptId: '456' as Protocol.Runtime.ScriptId,
            debuggerId: '42' as Protocol.Runtime.UniqueDebuggerId,
          }
        ],
        rootScriptFilterlistRule: '/ad-script2.$script',
      }),
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    sinon.stub(networkManager, 'getSecurityIsolationStatus').resolves({
      coep: {
        value: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
        reportOnlyValue: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
      },
      coop: {
        value: Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin,
        reportOnlyValue: Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin,
      },
      csp: [{
        source: Protocol.Network.ContentSecurityPolicySource.HTTP,
        isEnforced: true,
        effectiveDirectives:
            'base-uri \'self\'; object-src \'none\'; script-src \'strict-dynamic\' \'unsafe-inline\' https: http: \'nonce-GsVjHiIoejpPhMPOHDQZ90yc9eJn1s\' \'unsafe-eval\'; report-uri https://www.example.com/csp',
      }],
    });

    const component = new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(frame);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await component.render();
    await RenderCoordinator.done({waitForWork: true});

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'URL',
      'Origin',
      'Owner Element',
      'Frame Creation Stack Trace',
      'Ad Status',
      'Creator Ad Script Ancestry',
      'Root Script Filterlist Rule',
      'Secure Context',
      'Cross-Origin Isolated',
      'Cross-Origin Embedder Policy (COEP)',
      'Cross-Origin Opener Policy (COOP)',
      'Content-Security-Policy',
      'SharedArrayBuffers',
      'Measure Memory',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://www.example.com/path/page.html',
      'https://www.example.com',
      '<iframe>',
      '',
      '',
      '',
      '/ad-script2.$script',
      'Yes\xA0Localhost is always a secure context',
      'Yes',
      'none',
      'same-origin',
      `HTTP header
base-uri: 'self'
object-src: 'none'
script-src: 'strict-dynamic', 'unsafe-inline', https:, http:, 'nonce-GsVjHiIoejpPhMPOHDQZ90yc9eJn1s', 'unsafe-eval'
report-uri: https://www.example.com/csp`,
      'available, transferable',
      'available\xA0Learn more',
    ]);

    const stackTrace = getElementWithinComponent(
        component, 'devtools-resources-stack-trace', ApplicationComponents.StackTrace.StackTrace);
    assert.isNotNull(stackTrace.shadowRoot);
    const expandableList =
        getElementWithinComponent(stackTrace, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    assert.isNotNull(expandableList.shadowRoot);

    const stackTraceRows = getElementsWithinComponent(
        expandableList, 'devtools-stack-trace-row', ApplicationComponents.StackTrace.StackTraceRow);
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assert.isNotNull(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText[0], 'function1\n\xA0@\xA0www.example.com/script.js:16');

    const adStatusList =
        component.shadowRoot.querySelector('devtools-report-value.ad-status-list devtools-expandable-list');
    assert.exists(adStatusList);
    const adStatusExpandableButton = adStatusList.shadowRoot!.querySelector('button');
    assert.notExists(adStatusExpandableButton);
    const adStatusItem = adStatusList.shadowRoot!.querySelector('.expandable-list-items');
    assert.exists(adStatusItem);
    assert.strictEqual(adStatusItem.textContent?.trim(), 'root');

    const adScriptAncestryList = component.shadowRoot.querySelector(
        'devtools-report-value.creator-ad-script-ancestry-list devtools-expandable-list');
    assert.exists(adScriptAncestryList);
    const adScriptAncestryExpandableButton = adScriptAncestryList.shadowRoot!.querySelector('button');
    assert.exists(adScriptAncestryExpandableButton);
    adScriptAncestryExpandableButton!.click();

    const adScriptAncestryItems =
        adScriptAncestryList!.shadowRoot!.querySelectorAll('.expandable-list-items .devtools-link');
    const adScriptsText = Array.from(adScriptAncestryItems).map(adScript => adScript.textContent?.trim());

    assert.deepEqual(adScriptsText, ['ad-script1.js:1', 'ad-script2.js:1']);
  });
});
