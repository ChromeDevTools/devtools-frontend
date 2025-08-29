// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as PanelCommon from '../../../panels/common/common.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import * as TextEditor from './text_editor.js';

const {aiCodeCompletionTeaserPlaceholder} = TextEditor.AiCodeCompletionTeaserPlaceholder;

describeWithEnvironment('AiCodeCompletionTeaserPlaceholder', () => {
  async function createTeaser() {
    const view = createViewFunctionStub(PanelCommon.AiCodeCompletionTeaser);
    const teaser = new PanelCommon.AiCodeCompletionTeaser({onDetach: sinon.stub()}, view);
    return teaser;
  }

  beforeEach(async () => {
    sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
        .resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
  });

  afterEach(() => {
    sinon.restore();
  });

  function createEditor(doc: string, teaser: PanelCommon.AiCodeCompletionTeaser): TextEditor.TextEditor.TextEditor {
    const editor = new TextEditor.TextEditor.TextEditor(
        CodeMirror.EditorState.create({
          doc,
          extensions: [
            aiCodeCompletionTeaserPlaceholder(teaser),
          ],
        }),
    );
    renderElementIntoDOM(editor);
    return editor;
  }

  it('shows the placeholder for an empty document', async () => {
    const teaser = await createTeaser();
    const editor = createEditor('', teaser);
    assert.exists(editor.editor.dom.querySelector('.cm-placeholder'));
    editor.remove();
  });

  it('does not show the placeholder for a non-empty document', async () => {
    const teaser = await createTeaser();
    const editor = createEditor('not empty', teaser);
    assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
    editor.remove();
  });

  it('hides the placeholder when text is inserted', async () => {
    const teaser = await createTeaser();
    const editor = createEditor('', teaser);
    assert.exists(editor.editor.dom.querySelector('.cm-placeholder'));

    editor.dispatch({
      changes: {from: 0, insert: 'a'},
    });

    assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
    editor.remove();
  });

  it('shows the placeholder when text is deleted', async () => {
    const teaser = await createTeaser();
    const editor = createEditor('not empty', teaser);
    assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));

    editor.dispatch({
      changes: {from: 0, to: editor.state.doc.length},
    });

    assert.exists(editor.editor.dom.querySelector('.cm-placeholder'));
    editor.remove();
  });
});
