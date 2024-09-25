// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import * as Freestyler from './freestyler.js';

describe('ChangeManager', () => {
  const styleSheetId = '1' as Protocol.CSS.StyleSheetId;
  const frameId = '1' as Protocol.Page.FrameId;

  function createModel() {
    const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel, {
      // @ts-expect-error stub types
      createInspectorStylesheet: sinon.stub().callsFake(() => {
        return new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
          styleSheetId,
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
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
    assert.deepStrictEqual(cssModel.setStyleSheetText.args, [
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
    ]);
  });

  it('can merge multiple changes with same className', async () => {
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    await changeManager.addChange(cssModel, frameId, {
      selector: 'span',
      className: 'ai-style-change-1',
      styles: {
        color: 'green',
      },
    });
    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepStrictEqual(cssModel.setStyleSheetText.args, [
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: green;\n  }\n}', true],
    ]);
  });

  it('can register multiple changes with the same selector', async () => {
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    await changeManager.addChange(cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'green',
      },
    });
    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepStrictEqual(cssModel.setStyleSheetText.args, [
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: green;\n  }\n}', true],
    ]);
  });

  it('can clear changes', async () => {
    const changeManager = new Freestyler.ChangeManager();
    const cssModel = createModel();
    await changeManager.addChange(cssModel, frameId, {
      selector: 'div',
      className: 'ai-style-change-1',
      styles: {
        color: 'blue',
      },
    });
    assert(cssModel.setStyleSheetText.calledOnce);
    assert.deepStrictEqual(cssModel.setStyleSheetText.args, [
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],
    ]);
    await changeManager.clear();
    await changeManager.addChange(cssModel, frameId, {
      selector: 'body',
      className: 'ai-style-change-1',
      styles: {
        color: 'green',
      },
    });
    assert(cssModel.setStyleSheetText.calledTwice);
    assert.deepStrictEqual(cssModel.setStyleSheetText.args, [
      [styleSheetId, '.ai-style-change-1 {\n  div& {\n    color: blue;\n  }\n}', true],  // before clear().
      [styleSheetId, '.ai-style-change-1 {\n  body& {\n    color: green;\n  }\n}', true],
    ]);
  });
});
