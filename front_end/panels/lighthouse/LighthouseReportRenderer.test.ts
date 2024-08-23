// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithMockConnection('LighthouseReportRenderer', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let target: SDK.Target.Target;
  let sourceElement: HTMLElement;
  let linkElement: HTMLElement;
  const PATH = 'TEST_PATH';
  const NODE_ID = 42 as Protocol.DOM.NodeId;
  const NODE = {id: NODE_ID} as SDK.DOMModel.DOMNode;
  const SNIPPET = 'SNIPPET';
  const LH_NODE_HTML = (path: string, snippet: string) =>
      `<div class="lh-node" data-path="${path}" data-snippet="${snippet}"></div>`;
  beforeEach(async () => {
    Lighthouse = await import('./lighthouse.js');
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    linkElement = document.createElement('div');
    linkElement.textContent = 'link';
    sourceElement = document.createElement('div');
  });

  it('resolves node and calls linkifier', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').withArgs(PATH).returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').withArgs(NODE_ID).returns(NODE);
    sinon.stub(Common.Linkifier.Linkifier, 'linkify')
        .withArgs(NODE, {tooltip: SNIPPET, preventKeyboardFocus: undefined})
        .returns(Promise.resolve(linkElement));

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.include([...sourceElement.firstChild?.childNodes || []], linkElement);
  });

  it('handles multiple nodes', async () => {
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const pushNodeByPathToFrontend = sinon.stub(domModel, 'pushNodeByPathToFrontend');
    const nodeForId = sinon.stub(domModel, 'nodeForId');
    const linkify = sinon.stub(Common.Linkifier.Linkifier, 'linkify');
    const NUM_NODES = 3;
    for (let i = 1; i <= NUM_NODES; ++i) {
      sourceElement.innerHTML += LH_NODE_HTML(PATH + i, SNIPPET + i);

      const nodeId = i as Protocol.DOM.NodeId;
      const node = {id: nodeId} as SDK.DOMModel.DOMNode;
      pushNodeByPathToFrontend.withArgs(PATH + i).returns(Promise.resolve(nodeId));
      nodeForId.withArgs(nodeId).returns(node);
      linkify.withArgs(node, {tooltip: SNIPPET + i, preventKeyboardFocus: undefined})
          .returns(Promise.resolve(document.createTextNode(`link${i}`)));
    }

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.strictEqual(sourceElement.childNodes.length, NUM_NODES);
    assert.deepStrictEqual([...sourceElement.childNodes].map(n => n.textContent), ['link1', 'link2', 'link3']);
  });

  it('resets tooltip', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').returns(NODE);
    sinon.stub(Common.Linkifier.Linkifier, 'linkify').returns(Promise.resolve(linkElement));
    const installTooltip = sinon.spy(UI.Tooltip.Tooltip, 'install');

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.isTrue(installTooltip.calledOnceWith(sourceElement.firstChild as HTMLElement, ''));
  });

  it('only keeps link and screenshot', async () => {
    sourceElement.innerHTML = LH_NODE_HTML(PATH, SNIPPET);
    assert.exists(sourceElement.firstElementChild);
    sourceElement.firstElementChild.innerHTML = 'foo<div class="lh-element-screenshot"></div>bar';

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').returns(Promise.resolve(NODE_ID));
    sinon.stub(domModel, 'nodeForId').returns(NODE);
    sinon.stub(Common.Linkifier.Linkifier, 'linkify').returns(Promise.resolve(linkElement));

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.strictEqual(
        sourceElement.firstElementChild.innerHTML, '<div class="lh-element-screenshot"></div><div>link</div>');
  });

  it('skips malformed nodes', async () => {
    const originalHtml = [
      LH_NODE_HTML('', SNIPPET),
      LH_NODE_HTML('UNKNOWN_PATH', SNIPPET),
      LH_NODE_HTML('PATH_WIHTOUT_NODE', SNIPPET),
    ].join('');
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    sinon.stub(domModel, 'pushNodeByPathToFrontend').withArgs('PATH_WIHTOUT_NODE').returns(Promise.resolve(NODE_ID));
    sourceElement.innerHTML = originalHtml;

    await Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.linkifyNodeDetails(sourceElement);

    assert.strictEqual(sourceElement.innerHTML, originalHtml);
  });
});
