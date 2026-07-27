// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as AiAssistanceModel from '../ai_assistance/ai_assistance.js';

describeWithEnvironment('ChangeManager', () => {
  let styleSheetId = 0;
  const frameId = '1' as Protocol.Page.FrameId;
  const anotherFrameId = '2' as Protocol.Page.FrameId;
  const agentId = '1';

  beforeEach(() => {
    styleSheetId = 0;
  });

  function createModel() {
    const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel, {
      // @ts-expect-error stub types
      createInspectorStylesheet: sinon.stub().callsFake(frameId => {
        styleSheetId++;
        return new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
          styleSheetId: String(styleSheetId) as Protocol.DOM.StyleSheetId,
          frameId,
          sourceURL: '',
          origin: 'inspector' as Protocol.CSS.StyleSheetOrigin,
          title: 'style.css',
          disabled: false,
          isInline: false,
          isMutable: false,
          isConstructed: false,
          startLine: 0,
          startColumn: 0,
          length: 10,
          endLine: 1,
          endColumn: 8,
        });
      }),
    });

    return cssModel;
  }

  it('can register a change', async () => {
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    sinon.assert.calledOnce(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
    );
  });

  it('can merge multiple changes with same className', async () => {
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    sinon.assert.calledOnce(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true]);
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'span',
      className: 'ai-style-change-1',
      styles: {
        color: 'green',
      },
    });
    sinon.assert.calledTwice(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: green;\n  }\n}', true]);
  });

  it('can register multiple changes with the same selector', async () => {
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-2',
      styles: {
        color: 'green',
      },
    });

    sinon.assert.calledTwice(cssModel.setStyleSheetText);
    assert.deepEqual(cssModel.setStyleSheetText.lastCall.args, [
      '1',
      '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}\n.ai-style-change-2 {\n  div& {\n    color: green;\n  }\n}',
      true,
    ]);
  });

  it('creates a stylesheet per frame', async () => {
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    sinon.assert.calledOnce(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true]);

    await changeManager.addChange(cssModel, anotherFrameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-2',
      styles: {
        color: 'green',
      },
    });

    sinon.assert.calledTwice(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['2', '.ai-style-change-2 {\n  div& {\n    color: green;\n  }\n}', true]);
  });

  it('can clear changes', async () => {
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager();
    let cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    sinon.assert.calledOnce(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
    );
    await changeManager.clear();
    cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'body',
      className: 'ai-style-change-1',
      styles: {
        color: 'green',
      },
    });
    sinon.assert.calledOnce(cssModel.setStyleSheetText);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['2', '.ai-style-change-1 {\n  body& {\n    color: green;\n  }\n}', true],
    );
  });

  it('disposes targetManager and cssModel listeners on dispose', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const removeModelListenerSpy = sinon.spy(targetManager, 'removeModelListener');
    const changeManager = new AiAssistanceModel.ChangeManager.ChangeManager(targetManager);
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });

    changeManager.dispose();

    sinon.assert.calledWith(
        removeModelListenerSpy,
        SDK.ResourceTreeModel.ResourceTreeModel,
        sinon.match(SDK.ResourceTreeModel.Events.PrimaryPageChanged),
        changeManager.clear,
        changeManager,
    );
    sinon.assert.calledWith(
        cssModel.removeEventListener,
        SDK.CSSModel.Events.ModelDisposed,
        sinon.match.func,
        changeManager,
    );
  });
});
