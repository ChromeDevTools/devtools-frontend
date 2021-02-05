// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../../../../front_end/render_coordinator/render_coordinator.js';
import * as Resources from '../../../../front_end/resources/resources.js';
import * as SDK from '../../../../front_end/sdk/sdk.js';
import * as Components from '../../../../front_end/ui/components/components.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

const makeFrame = (): SDK.ResourceTreeModel.ResourceTreeFrame => {
  const newFrame: SDK.ResourceTreeModel.ResourceTreeFrame = {
    url: 'https://www.example.com/path/page.html',
    securityOrigin: 'https://www.example.com',
    displayName: () => 'TestTitle',
    unreachableUrl: () => '',
    adFrameType: () => Protocol.Page.AdFrameType.None,
    resourceForURL: () => null,
    isSecureContext: () => true,
    isCrossOriginIsolated: () => true,
    getSecureContextType: () => Protocol.Page.SecureContextType.SecureLocalhost,
    getGatedAPIFeatures: () =>
        [Protocol.Page.GatedAPIFeatures.SharedArrayBuffers,
         Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed],
    getOwnerDOMNodeOrDocument: () => ({
      nodeName: () => 'iframe',
    }),
    resourceTreeModel: () => ({
      target: () => ({
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
  } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
  return newFrame;
};

function extractTextFromReportView(shadowRoot: ShadowRoot, selector: string) {
  const elements = Array.from(shadowRoot.querySelectorAll(selector));
  return elements.map(element => {
    return element.textContent ? element.textContent.trim().replace(/[ \n]+/g, ' ') : '';
  });
}

describe('FrameDetailsView', () => {
  it('renders with a title', async () => {
    const frame = makeFrame();
    const component = new Resources.FrameDetailsView.FrameDetailsReportView();
    renderElementIntoDOM(component);
    component.data = {
      frame: frame,
    };

    assertShadowRoot(component.shadowRoot);
    const report = getElementWithinComponent(component, 'devtools-report', Components.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, frame.displayName());
  });

  it('renders report keys and values', async () => {
    const frame = makeFrame();
    const component = new Resources.FrameDetailsView.FrameDetailsReportView();
    renderElementIntoDOM(component);
    component.data = {
      frame: frame,
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    await coordinator.done();  // 2nd call awaits async render

    const keys = extractTextFromReportView(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'URL',
      'Origin',
      'Owner Element',
      'Secure Context',
      'Cross-Origin Isolated',
      'Cross-Origin Embedder Policy',
      'Cross-Origin Opener Policy',
      'Shared Array Buffers',
      'Measure Memory',
    ]);

    const values = extractTextFromReportView(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://www.example.com/path/page.html',
      'https://www.example.com',
      '<iframe>',
      'Yes Localhost is always a secure context',
      'Yes',
      'None',
      'SameOrigin',
      'available, transferable',
      'available Learn more',
    ]);
  });
});
