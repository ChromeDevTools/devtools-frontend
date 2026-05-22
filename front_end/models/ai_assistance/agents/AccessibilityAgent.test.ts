// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithMockConnection('AccessibilityAgent', () => {
  const mockReport = {
    lighthouseVersion: '1.0.0',
    userAgent: 'test user agent',
    fetchTime: '2026-03-12',
    timing: {total: 100},
    finalDisplayedUrl: 'https://example.com',
    artifacts: {Trace: {traceEvents: []}},
    audits: {
      'first-audit': {
        id: 'first-audit',
        title: 'First Audit',
        description: 'Description of first audit',
        score: 0.8,
        displayValue: '1.2s',
      },
      'accessibility-audit': {
        id: 'accessibility-audit',
        title: 'Accessibility Audit',
        description: 'Description of accessibility audit',
        score: 0.5,
        displayValue: 'Fail',
      },
    },
    categories: {
      performance: {
        title: 'Performance',
        score: 0.8,
        auditRefs: [{id: 'first-audit', score: 0.8, weight: 1}],
      },
      accessibility: {
        title: 'Accessibility',
        score: 0.5,
        auditRefs: [{id: 'accessibility-audit', score: 0.5, weight: 1}],
      },
    },
    categoryGroups: {},
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  it('generates an answer', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: 'This is the answer',
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });

    await Array.fromAsync(
        agent.run('test', {selected: new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport)}));

    const call = aidaClient.doConversation.getCall(0);
    assert.exists(call);
    const request = call.args[0];
    const text = (request.current_message.parts[0] as {text: string}).text;
    assert.include(text, '# Lighthouse Report');
    assert.include(text, '# Audits for Accessibility');
    assert.include(text, '**Accessibility Audit**: 50 (Fail)');
  });

  it('can call the getLighthouseAudits method', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: '',
      functionCalls: [{name: 'getLighthouseAudits', args: {categoryId: 'accessibility'}}],
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);
    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const titleResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.TITLE);
    assert.exists(titleResponse);
    assert.strictEqual(titleResponse.title, 'Getting Lighthouse audits for accessibility');

    const actionResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.exists(actionResponse);
    assert.exists(actionResponse.widgets);
    assert.lengthOf(actionResponse.widgets, 1);
    assert.strictEqual(actionResponse.widgets[0].name, 'LIGHTHOUSE_REPORT');
    assert.deepEqual(actionResponse.widgets[0].data, {report: mockReport});
  });

  it('can call the getStyles method', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: '',
      functionCalls:
          [{name: 'getStyles', args: {path: '1,HTML,1,BODY', styleProperties: ['color'], explanation: 'testing'}}],
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);
    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const titleResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.TITLE);
    assert.exists(titleResponse);
    assert.strictEqual(titleResponse.title, 'Reading computed styles');
  });

  it('can call the getElementAccessibilityDetails method', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: '',
      functionCalls: [{name: 'getElementAccessibilityDetails', args: {path: '1,HTML,1,BODY', explanation: 'testing'}}],
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);
    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const titleResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.TITLE);
    assert.exists(titleResponse);
    assert.strictEqual(titleResponse.title, 'Reading accessibility details');
  });

  it('getElementAccessibilityDetails yields a ComputedStyleAiWidget if styles and matched styles are found',
     async () => {
       const target = createTarget();
       const aidaClient = mockAidaClient([[{
         explanation: '',
         functionCalls:
             [{name: 'getElementAccessibilityDetails', args: {path: '1,HTML,1,BODY', explanation: 'testing'}}],
         metadata: {
           rpcGlobalId: 123,
         },
       }]]);
       const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
         aidaClient,
       });
       const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);

       const domModel = target.model(SDK.DOMModel.DOMModel)!;
       const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel)!;
       const cssModel = domModel.cssModel();
       const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;

       const mockNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
       mockNode.domModel.returns(domModel);
       mockNode.id = 42 as Protocol.DOM.NodeId;
       mockNode.backendNodeId.returns(100 as Protocol.DOM.BackendNodeId);
       mockNode.attributes.returns([]);
       mockNode.frameId.returns('main' as Protocol.Page.FrameId);

       sinon.stub(domModel, 'pushNodeByPathToFrontend').resolves(42 as Protocol.DOM.NodeId);
       sinon.stub(domModel, 'nodeForId').withArgs(42 as Protocol.DOM.NodeId).returns(mockNode);
       resourceTreeModel.mainFrame = {id: 'main' as Protocol.Page.FrameId} as SDK.ResourceTreeModel.ResourceTreeFrame;

       const styles = new Map<string, string>([
         ['color', 'rgb(0, 0, 0)'],
         ['background-color', 'rgb(255, 255, 255)'],
       ]);
       sinon.stub(cssModel, 'getComputedStyle').resolves(styles);
       const matchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles);
       sinon.stub(cssModel, 'getMatchedStyles').resolves(matchedStyles);

       sinon.stub(accessibilityModel, 'requestAndLoadSubTreeToNode').resolves();
       const mockAxNode = sinon.createStubInstance(SDK.AccessibilityModel.AccessibilityNode);
       mockAxNode.role.returns({value: 'button', type: 'role' as Protocol.Accessibility.AXValueType});
       mockAxNode.name.returns({
         value: 'Click me',
         type: 'string' as Protocol.Accessibility.AXValueType,
         sources: [{type: 'attribute' as Protocol.Accessibility.AXValueSourceType}],
       });
       mockAxNode.ignored.returns(false);
       mockAxNode.ignoredReasons.returns([]);
       sinon.stub(accessibilityModel, 'axNodeForDOMNode').withArgs(mockNode).returns(mockAxNode);

       const responses = await Array.fromAsync(agent.run('test', {selected: context}));
       const actions = responses.filter(r => r.type === AiAssistance.AiAgent.ResponseType.ACTION);
       assert.lengthOf(actions, 1);
       assert.exists(actions[0].widgets);
       const widget =
           actions[0].widgets?.find(w => w.name === 'COMPUTED_STYLES') as AiAssistance.AiAgent.ComputedStyleAiWidget;
       assert.exists(widget);
       assert.strictEqual(widget.data.backendNodeId, 100 as Protocol.DOM.BackendNodeId);
       assert.strictEqual(widget.data.computedStyles, styles);
       assert.strictEqual(widget.data.matchedCascade, matchedStyles);
       assert.deepEqual(widget.data.properties, [
         'color',
         'background-color',
         'display',
         'visibility',
         'opacity',
         'clip',
         'clip-path',
         'font-size',
         'font-weight',
         'line-height',
         'letter-spacing',
         'text-transform',
       ]);
     });

  it('getElementAccessibilityDetails returns an error if the node is in a different frame', async () => {
    const target = createTarget();
    const aidaClient = mockAidaClient([[{
      explanation: '',
      functionCalls: [{name: 'getElementAccessibilityDetails', args: {path: '1,HTML,1,BODY', explanation: 'testing'}}],
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);

    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;

    const mockNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    mockNode.domModel.returns(domModel);
    mockNode.id = 42 as Protocol.DOM.NodeId;
    mockNode.frameId.returns('different-frame' as Protocol.Page.FrameId);

    sinon.stub(domModel, 'pushNodeByPathToFrontend').resolves(42 as Protocol.DOM.NodeId);
    sinon.stub(domModel, 'nodeForId').withArgs(42 as Protocol.DOM.NodeId).returns(mockNode);
    resourceTreeModel.mainFrame = {id: 'main' as Protocol.Page.FrameId} as SDK.ResourceTreeModel.ResourceTreeFrame;

    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const actionResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.exists(actionResponse);
    assert.strictEqual(actionResponse.output, 'Could not find the element with path: 1,HTML,1,BODY');
  });

  it('can call the runAccessibilityAudits method and yields widget with snapshotReport: true', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: '',
      functionCalls: [{name: 'runAccessibilityAudits', args: {explanation: 'testing'}}],
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const lighthouseRecording = sinon.stub().resolves(mockReport);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
      lighthouseRecording,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);
    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const titleResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.TITLE);
    assert.exists(titleResponse);
    assert.strictEqual(titleResponse.title, 'Running accessibility audits');
    assert.isTrue(lighthouseRecording.calledOnceWith({
      mode: 'snapshot',
      categoryIds: ['accessibility'],
      isAIControlled: true,
    }));

    const actionResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.exists(actionResponse);
    assert.exists(actionResponse.widgets);
    assert.lengthOf(actionResponse.widgets, 1);
    assert.strictEqual(actionResponse.widgets[0].name, 'LIGHTHOUSE_REPORT');
    assert.deepEqual(actionResponse.widgets[0].data, {report: mockReport, snapshotReport: true});
  });

  function createExtensionScope() {
    return {
      async install() {},
      async uninstall() {},
    };
  }

  it('can call the executeJavaScript method', async () => {
    const target = createTarget();
    const aidaClient = mockAidaClient([
      [{
        explanation: 'thought',
        functionCalls: [{
          name: 'executeJavaScript',
          args: {code: 'document.body.id', explanation: 'explaining', title: 'titling'},
        }],
      }],
      [{
        explanation: 'answer',
      }]
    ]);

    const execJs = sinon.stub().resolves('test data');
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
      execJs,
      createExtensionScope,
    });
    const context = new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport);

    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    const documentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    documentNode.domModel.returns(domModel);
    const document = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    document.body = documentNode;
    sinon.stub(domModel, 'existingDocument').returns(document);

    const responses = await Array.fromAsync(agent.run('test', {selected: context}));
    const actionResponse = responses.find(response => response.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.exists(actionResponse);
    assert.strictEqual(actionResponse.output, 'test data');
    sinon.assert.calledOnce(execJs);
  });
});
