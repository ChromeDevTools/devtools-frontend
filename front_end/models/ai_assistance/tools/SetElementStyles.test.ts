// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {getMatchedStyles, ruleMatch} from '../../../testing/StyleHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('SetElementStylesTool', () => {
  setupLocaleHooks();
  const frameId = 'main-frame' as Protocol.Page.FrameId;
  let target: sinon.SinonStubbedInstance<SDK.Target.Target>;
  let domModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;
  let cssModel: sinon.SinonStubbedInstance<SDK.CSSModel.CSSModel>;

  function createStubNode(options: {
    backendNodeId?: number,
    nodeId?: number,
    localName?: string,
    origin?: string|null,
    classAttr?: string,
    styleAttr?: string,
    isInShadowTree?: boolean,
  } = {}): sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode> {
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.id = (options.nodeId ?? 1) as Protocol.DOM.NodeId;
    node.backendNodeId.returns((options.backendNodeId ?? 42) as Protocol.DOM.BackendNodeId);
    node.domModel.returns(domModel);
    node.frameId.returns(frameId);
    node.nodeType.returns(1);
    node.localName.returns(options.localName ?? 'button');
    node.nodeName.returns((options.localName ?? 'button').toUpperCase());
    node.simpleSelector.callThrough();
    node.isInShadowTree.returns(options.isInShadowTree ?? false);
    node.setAttributeValuePromise.resolves(null);
    node.getAttribute.callsFake((attr: string) => {
      if (attr === 'class') {
        return options.classAttr;
      }
      if (attr === 'style') {
        return options.styleAttr;
      }
      return undefined;
    });
    const origin = options.origin === undefined ? 'https://example.com' : options.origin;
    node.securityOrigin.returns(origin ? SDK.SecurityOrigin.SecurityOrigin.create(origin) : null);
    return node;
  }

  function createMockContext(options: {
    target?: SDK.Target.Target|null,
    originLock?: AiAssistance.Tool.OriginLockState,
    changeManager?: AiAssistance.ChangeManager.ChangeManager,
  } = {}): AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.TargetCapability&
      AiAssistance.Tool.OriginLockCapability&AiAssistance.Tool.StyleMutationCapability {
    const resolvedTarget = options.target === undefined ? target : options.target;
    const originLock: AiAssistance.Tool.OriginLockState = options.originLock ?? {
      status: 'ESTABLISHED_ORIGIN',
      origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
    };
    const changeManager = options.changeManager ?? sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    return {
      getTarget: () => resolvedTarget,
      getOriginLock: () => originLock,
      changeManager,
      createExtensionScope: sinon.stub(),
    };
  }

  beforeEach(() => {
    target = sinon.createStubInstance(SDK.Target.Target);
    target.model.returns(null);

    cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
    cssModel.getMatchedStyles.resolves(null);

    domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    domModel.target.returns(target);
    domModel.cssModel.returns(cssModel);
  });

  it('formats displayInfoFromArgs with element uids and style record', () => {
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const displayInfo = tool.displayInfoFromArgs({
      explanation: 'Set flex container',
      elements: [42],
      styleProperties: [
        {name: 'display', value: 'flex'},
        {name: 'justify-content', value: 'center'},
      ],
    });

    assert.strictEqual(displayInfo.title, 'Applying style changes');
    assert.strictEqual(displayInfo.thought, 'Set flex container');
    assert.strictEqual(
        displayInfo.action,
        'setElementStyles([42], {"display":"flex","justify-content":"center"})',
    );
  });

  it('applies styles to resolved elements via DOM/CSS SDK models and ChangeManager', async () => {
    const resolvedNode1 = createStubNode({backendNodeId: 42, localName: 'button'});
    const resolvedNode2 = createStubNode({backendNodeId: 43, localName: 'div'});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise')
        .onFirstCall()
        .resolves(resolvedNode1)
        .onSecondCall()
        .resolves(resolvedNode2);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.resolves('');

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Make elements red flex containers',
      elements: [42, 43],
      styleProperties: [
        {name: 'color', value: 'red'},
        {name: 'display', value: 'flex'},
      ],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    assert.strictEqual(response.result, 'Successfully updated styles.');
    sinon.assert.calledOnceWithExactly(resolvedNode1.setAttributeValuePromise, 'class', 'ai-style-change-42');
    sinon.assert.calledOnceWithExactly(resolvedNode2.setAttributeValuePromise, 'class', 'ai-style-change-43');
    sinon.assert.calledTwice(changeManager.addChange);
    sinon.assert.calledWithExactly(changeManager.addChange.firstCall, cssModel, frameId, {
      selector: 'button',
      className: 'ai-style-change-42',
      styles: {color: 'red', display: 'flex'},
    });
    sinon.assert.calledWithExactly(changeManager.addChange.secondCall, cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-43',
      styles: {color: 'red', display: 'flex'},
    });
    sinon.assert.notCalled(resolvedNode1.resolveToObject);
    sinon.assert.notCalled(resolvedNode2.resolveToObject);
  });

  it('preserves existing classes and reuses an existing ai-style-change class', async () => {
    const nodeWithClasses = createStubNode({backendNodeId: 42, classAttr: 'btn primary'});
    const nodeWithAiClass = createStubNode({backendNodeId: 43, classAttr: 'btn ai-style-change-7'});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise')
        .onFirstCall()
        .resolves(nodeWithClasses)
        .onSecondCall()
        .resolves(nodeWithAiClass);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.resolves('');

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update button color',
      elements: [42, 43],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    sinon.assert.calledOnceWithExactly(
        nodeWithClasses.setAttributeValuePromise,
        'class',
        'btn primary ai-style-change-42',
    );
    sinon.assert.notCalled(nodeWithAiClass.setAttributeValuePromise);
    sinon.assert.calledWithExactly(changeManager.addChange.firstCall, cssModel, frameId, {
      selector: 'button.btn.primary',
      className: 'ai-style-change-42',
      styles: {color: 'red'},
    });
    sinon.assert.calledWithExactly(changeManager.addChange.secondCall, cssModel, frameId, {
      selector: 'button.btn',
      className: 'ai-style-change-7',
      styles: {color: 'red'},
    });
  });

  it('removes overridden inline style properties while keeping unrelated inline styles', async () => {
    const resolvedNode = createStubNode({
      backendNodeId: 42,
      styleAttr: 'color: blue; font-size: 14px;',
    });
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.resolves('');

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Override inline color',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    sinon.assert.calledWithExactly(resolvedNode.setAttributeValuePromise, 'style', 'font-size: 14px;');
  });

  it('uses matched CSS rule selector when available', async () => {
    const resolvedNode = createStubNode({backendNodeId: 42, localName: 'div'});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const connection = new MockCDPConnection();
    const matchedStyles = await getMatchedStyles({
      node: resolvedNode,
      connection,
      matchedPayload: [ruleMatch('.card-header', [{name: 'padding', value: '8px'}])],
    });
    cssModel.getMatchedStyles.resolves(matchedStyles);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.resolves('');

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update card header color',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    sinon.assert.calledOnceWithExactly(changeManager.addChange, cssModel, frameId, {
      selector: '.card-header',
      className: 'ai-style-change-42',
      styles: {color: 'red'},
    });
  });

  it('adopts stylesheet on ShadowRoot when element is in a shadow tree', async () => {
    const shadowNode = createStubNode({backendNodeId: 42, isInShadowTree: true});
    const remoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    remoteObject.callFunction.resolves({object: remoteObject});
    shadowNode.resolveToObject.resolves(remoteObject);
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(shadowNode);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    const stylesheetRuleText = '.ai-style-change-42 {\n  button& {\n    color: red;\n  }\n}';
    changeManager.addChange.resolves(stylesheetRuleText);

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Style shadow button',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    sinon.assert.calledOnceWithExactly(shadowNode.resolveToObject, '');
    sinon.assert.calledOnceWithExactly(
        remoteObject.callFunction,
        AiAssistance.DOMHelpers.adoptStyleSheetInShadowRoot,
        [
          {value: AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME},
          {value: stylesheetRuleText},
        ],
    );
    sinon.assert.calledOnce(remoteObject.release);
  });

  it('returns error without mutating DOM when CSS properties are invalid or contain URLs', async () => {
    const resolvedNode = createStubNode({backendNodeId: 42});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();

    // Pass an empty property value and a disallowed url() value so
    // sanitizeStyleChanges rejects them in both Chrome and Node.js
    // foundation_unittests (where CSSStyleSheet is undefined). Browser-specific
    // CSS value parsing is tested in DOMHelpers.test.ts.
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [
        {name: 'color', value: ''},
        {name: 'background-image', value: 'url("https://attacker.example/leak")'},
      ],
    },
                                        createMockContext({changeManager}));

    assertIsError(response);
    assert.include(
        response.error,
        'None of the suggested CSS properties or their values for selector were considered valid or permitted',
    );
    sinon.assert.notCalled(resolvedNode.setAttributeValuePromise);
    sinon.assert.notCalled(changeManager.addChange);
  });

  it('applies valid properties and reports ignored properties when some declarations are sanitized out', async () => {
    const resolvedNode1 = createStubNode({backendNodeId: 42, localName: 'div'});
    const resolvedNode2 = createStubNode({backendNodeId: 43, localName: 'span'});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise')
        .onFirstCall()
        .resolves(resolvedNode1)
        .onSecondCall()
        .resolves(resolvedNode2);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.resolves('');
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();

    const response = await tool.handler({
      explanation: 'Set background color and image',
      elements: [42, 43],
      styleProperties: [
        {name: 'background-color', value: 'red'},
        {name: 'background-image', value: 'url("https://attacker.example/leak")'},
      ],
    },
                                        createMockContext({changeManager}));

    assertIsResult(response);
    assert.strictEqual(
        response.result,
        'Successfully updated styles (background-color). The following properties were ignored because they are invalid CSS or contain disallowed URL functions (url(), image-set(), src()): background-image.',
    );
    sinon.assert.calledTwice(changeManager.addChange);
    sinon.assert.calledWithExactly(changeManager.addChange.firstCall, cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-42',
      styles: {'background-color': 'red'},
    });
    sinon.assert.calledWithExactly(changeManager.addChange.secondCall, cssModel, frameId, {
      selector: 'span',
      className: 'ai-style-change-43',
      styles: {'background-color': 'red'},
    });
  });

  it('returns error when target is missing', async () => {
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({target: null, originLock: {status: 'UNINITIALIZED'}}));

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the inspected page.');
  });

  it('returns error when no elements are provided', async () => {
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext());

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: No elements provided.');
  });

  it('returns error when no style properties are provided', async () => {
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [],
    },
                                        createMockContext());

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: No style properties provided.');
  });

  it('returns error when element uid cannot be resolved', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(null);

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext());

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the element with uid=42');
  });

  it('returns error on origin mismatch without mutating DOM or calling ChangeManager', async () => {
    const resolvedNode = createStubNode({origin: 'https://another.com'});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the current origin.');
    sinon.assert.notCalled(resolvedNode.setAttributeValuePromise);
    sinon.assert.notCalled(changeManager.addChange);
  });

  it('returns error when resolved node has no security origin (detached node)', async () => {
    const detachedNode = createStubNode({origin: null});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(detachedNode);

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext());

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when origin lock is uninitialized', async () => {
    const resolvedNode = createStubNode();
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({originLock: {status: 'UNINITIALIZED'}}));

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when navigation occurred during run', async () => {
    const resolvedNode = createStubNode();
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({originLock: {status: 'BLOCKED_BY_NAVIGATION'}}));

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the current origin.');
  });

  it('handles exception thrown by ChangeManager', async () => {
    const resolvedNode = createStubNode();
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const changeManager = sinon.createStubInstance(AiAssistance.ChangeManager.ChangeManager);
    changeManager.addChange.rejects(new Error('inspector-stylesheet is not found'));

    const tool = new AiAssistance.SetElementStyles.SetElementStylesTool();
    const response = await tool.handler({
      explanation: 'Update styles',
      elements: [42],
      styleProperties: [{name: 'color', value: 'red'}],
    },
                                        createMockContext({changeManager}));

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: inspector-stylesheet is not found');
  });
});
