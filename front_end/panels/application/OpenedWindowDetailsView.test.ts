// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import {html, render} from '../../ui/lit/lit.js';

import * as Application from './application.js';

describeWithEnvironment('OpenedWindowDetailsView', () => {
  const targetInfo: Protocol.Target.TargetInfo = {
    targetId: 'target-id' as Protocol.Target.TargetID,
    type: 'page',
    title: 'Example Window',
    url: 'https://example.com/popup.html',
    attached: true,
    canAccessOpener: true,
    openerFrameId: 'opener-frame-id' as Protocol.Page.FrameId,
  };

  it('passes window details and opener element to the view', async () => {
    const domNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    domNode.nodeName.returns('IFRAME');
    const openerFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    openerFrame.getOwnerDOMNodeOrDocument.resolves(domNode);
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame')
        .withArgs(targetInfo.openerFrameId!)
        .returns(openerFrame);

    const view = createViewFunctionStub(Application.OpenedWindowDetailsView.OpenedWindowDetailsView);
    const widget = new Application.OpenedWindowDetailsView.OpenedWindowDetailsView(targetInfo, false, view);
    renderElementIntoDOM(widget);

    const input = await view.nextInput;
    assert.strictEqual(input.title, 'Example Window');
    assert.strictEqual(input.url, 'https://example.com/popup.html');
    assert.isTrue(input.canAccessOpener);
    assert.isNotNull(input.openerElement);
  });

  it('reveals opener DOM node in Elements panel on click', async () => {
    const domNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    domNode.nodeName.returns('IFRAME');
    const openerFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    openerFrame.getOwnerDOMNodeOrDocument.resolves(domNode);
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame')
        .withArgs(targetInfo.openerFrameId!)
        .returns(openerFrame);
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

    const view = createViewFunctionStub(Application.OpenedWindowDetailsView.OpenedWindowDetailsView);
    const widget = new Application.OpenedWindowDetailsView.OpenedWindowDetailsView(targetInfo, false, view);
    renderElementIntoDOM(widget);

    const input = await view.nextInput;
    widget.detach();
    assert.exists(input.openerElement);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(input.openerElement, container);

    const button = container.querySelector('button');
    assert.exists(button);
    button.click();
    sinon.assert.calledOnceWithExactly(revealStub, domNode, false);
  });

  it('highlights and clears overlay highlight on opener hover', async () => {
    const domNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    domNode.nodeName.returns('IFRAME');
    const openerFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    openerFrame.getOwnerDOMNodeOrDocument.resolves(domNode);
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame')
        .withArgs(targetInfo.openerFrameId!)
        .returns(openerFrame);
    const hideHighlightStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const view = createViewFunctionStub(Application.OpenedWindowDetailsView.OpenedWindowDetailsView);
    const widget = new Application.OpenedWindowDetailsView.OpenedWindowDetailsView(targetInfo, false, view);
    renderElementIntoDOM(widget);

    const input = await view.nextInput;
    widget.detach();
    assert.exists(input.openerElement);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(input.openerElement, container);

    const openerSpan = container.querySelector('span');
    assert.exists(openerSpan);
    openerSpan.dispatchEvent(new MouseEvent('mouseenter'));
    sinon.assert.calledOnce(openerFrame.highlight);

    openerSpan.dispatchEvent(new MouseEvent('mouseleave'));
    sinon.assert.calledOnceWithExactly(hideHighlightStub, SDK.TargetManager.TargetManager.instance());
  });

  it('updates title when window is closed', async () => {
    const view = createViewFunctionStub(Application.OpenedWindowDetailsView.OpenedWindowDetailsView);
    const widget = new Application.OpenedWindowDetailsView.OpenedWindowDetailsView(targetInfo, false, view);
    renderElementIntoDOM(widget);
    await view.nextInput;

    widget.setIsWindowClosed(true);
    const closedInput = await view.nextInput;
    assert.strictEqual(closedInput.title, 'Example Window (closed)');
  });

  it('renders report content in DEFAULT_OPENED_WINDOW_VIEW', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    Application.OpenedWindowDetailsView.DEFAULT_OPENED_WINDOW_VIEW({
      title: 'Example Window (closed)',
      url: 'https://example.com/popup.html',
      canAccessOpener: false,
      openerElement: html`<span>${'<#document>'}</span>`,
    },
                                                                   undefined, container);

    const headers = getCleanTextContentFromElements(container, 'devtools-report-section-header');
    assert.deepEqual(headers, ['Document', 'Security']);

    const keys = getCleanTextContentFromElements(container, 'devtools-report-key');
    assert.deepEqual(keys, ['URL', 'Opener frame', 'Access to opener']);

    const values = getCleanTextContentFromElements(container, 'devtools-report-value');
    assert.deepEqual(values, ['https://example.com/popup.html', '<#document>', 'No']);
  });
});

describeWithEnvironment('WorkerDetailsView', () => {
  it('passes worker details and COEP status to the view', async () => {
    const target = createTarget({id: 'worker-id' as Protocol.Target.TargetID});
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const coepStatus: Protocol.Network.CrossOriginEmbedderPolicyStatus = {
      value: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
      reportOnlyValue: Protocol.Network.CrossOriginEmbedderPolicyValue.RequireCorp,
      reportingEndpoint: '',
      reportOnlyReportingEndpoint: 'https://example.com/rep',
    };
    sinon.stub(networkManager, 'getSecurityIsolationStatus').resolves({
      coep: coepStatus,
      coop: {
        value: Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone,
        reportOnlyValue: Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone,
      },
      csp: [],
    });

    const targetInfo: Protocol.Target.TargetInfo = {
      targetId: target.id() as Protocol.Target.TargetID,
      type: 'worker',
      title: '',
      url: 'https://example.com/worker.js',
      attached: true,
      canAccessOpener: false,
    };

    const view = createViewFunctionStub(Application.OpenedWindowDetailsView.WorkerDetailsView);
    const widget = new Application.OpenedWindowDetailsView.WorkerDetailsView(targetInfo, view);
    renderElementIntoDOM(widget);

    const input = await view.nextInput;
    assert.strictEqual(input.title, 'https://example.com/worker.js');
    assert.strictEqual(input.url, 'https://example.com/worker.js');
    assert.strictEqual(input.workerType, 'Web Worker');
    assert.deepEqual(input.coepPolicy, coepStatus);
  });

  it('renders report content in DEFAULT_WORKER_VIEW', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    Application.OpenedWindowDetailsView.DEFAULT_WORKER_VIEW({
      title: 'https://example.com/worker.js',
      url: 'https://example.com/worker.js',
      workerType: 'Service Worker',
      coepPolicy: {
        value: Protocol.Network.CrossOriginEmbedderPolicyValue.None,
        reportOnlyValue: Protocol.Network.CrossOriginEmbedderPolicyValue.RequireCorp,
        reportOnlyReportingEndpoint: 'https://example.com/rep',
      },
    },
                                                            undefined, container);

    const keys = getCleanTextContentFromElements(container, 'devtools-report-key');
    assert.deepEqual(keys, ['URL', 'Type', 'Cross-Origin Embedder Policy']);

    const values = getCleanTextContentFromElements(container, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com/worker.js',
      'Service Worker',
      'RequireCorpreport-onlyreporting tohttps://example.com/rep',
    ]);
  });
});
