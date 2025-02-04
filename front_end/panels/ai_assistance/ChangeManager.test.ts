// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import * as Freestyler from './ai_assistance.js';

describe('ChangeManager', () => {
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
          styleSheetId: String(styleSheetId) as Protocol.CSS.StyleSheetId,
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
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
    );
  });

  it('can merge multiple changes with same className', async () => {
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
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
    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['1', '.ai-style-change-1 {\n  div& {\n    color: green;\n  }\n}', true]);
  });

  it('can register multiple changes with the same selector', async () => {
    const changeManager = new Freestyler.ChangeManager();
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

    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepEqual(cssModel.setStyleSheetText.lastCall.args, [
      '1',
      '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}\n.ai-style-change-2 {\n  div& {\n    color: green;\n  }\n}',
      true
    ]);
  });

  it('creates a stylesheet per frame', async () => {
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
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

    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['2', '.ai-style-change-2 {\n  div& {\n    color: green;\n  }\n}', true]);
  });

  it('can clear changes', async () => {
    const changeManager = new Freestyler.ChangeManager();
    let cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      groupId: agentId,
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
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
    assert(cssModel.setStyleSheetText.calledOnce);
    assert.deepEqual(
        cssModel.setStyleSheetText.lastCall.args,
        ['2', '.ai-style-change-1 {\n  body& {\n    color: green;\n  }\n}', true],
    );
  });

  describe('format changes', () => {
    it('returns empty string when there are no changes from the given agent', async () => {
      const changeManager = new Freestyler.ChangeManager();

      assert.strictEqual(changeManager.formatChanges(agentId), '');
    });

    it('returns formatted changes for an agent without `.ai-style-change` classes', async () => {
      const changeManager = new Freestyler.ChangeManager();
      const cssModel = createModel();

      await changeManager.addChange(cssModel, frameId, {
        groupId: agentId,
        selector: 'div',
        className: 'ai-style-change-1',
        styles: {color: 'blue', 'background-color': 'green'},
      });

      assert.strictEqual(changeManager.formatChanges(agentId), `div {
  color: blue;
  background-color: green;
}`);
    });
  });
});
