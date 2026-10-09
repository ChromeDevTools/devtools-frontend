// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, registerActions} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;
const {html} = Lit;
const {SnippetsPlugin} = Sources.SnippetsPlugin;

function createUiSourceCodeStub({
  url = urlString`snippet:///Snippet%20%231`,
  contentType = Common.ResourceType.resourceTypes.Script,
}: {
  url?: Platform.DevToolsPath.UrlString,
  contentType?: Common.ResourceType.ResourceType,
} = {}): sinon.SinonStubbedInstance<Workspace.UISourceCode.UISourceCode> {
  return sinon.createStubInstance(Workspace.UISourceCode.UISourceCode, {
    url,
    contentType,
  });
}

describeWithEnvironment('SnippetsPlugin', () => {
  describe('accepts', () => {
    it('holds true for snippet UISourceCodes', () => {
      assert.isTrue(SnippetsPlugin.accepts(createUiSourceCodeStub({
        url: urlString`snippet:///Snippet%20%231`,
      })));
    });

    it('holds false for non-snippet UISourceCodes', () => {
      assert.isFalse(SnippetsPlugin.accepts(createUiSourceCodeStub({
        url: urlString`https://example.com/script.js`,
      })));
    });
  });

  it('renders a run snippet toolbar button bound to debugger.run-snippet', () => {
    const handleAction = sinon.stub().returns(true);
    registerActions([{
      actionId: 'debugger.run-snippet',
      category: UI.ActionRegistration.ActionCategory.DEBUGGER,
      title: i18n.i18n.lockedLazyString('Run snippet'),
      loadActionDelegate: async () => ({handleAction}),
    }]);
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.run-snippet');
    const executeSpy = sinon.stub(action, 'execute').resolves(true);
    const plugin = new SnippetsPlugin(createUiSourceCodeStub());
    const container = renderElementIntoDOM(document.createElement('div'));

    Lit.render(html`${plugin.rightToolbarItems()}`, container);

    const button = container.querySelector('devtools-button');
    assert.isNotNull(button);
    assert.strictEqual(button.textContent?.trim(), Host.Platform.isMac() ? '⌘+Enter' : 'Ctrl+Enter');
    assert.strictEqual(button.getAttribute('title'), 'Run snippet');

    dispatchClickEvent(button);
    sinon.assert.calledOnce(executeSpy);
  });
});
