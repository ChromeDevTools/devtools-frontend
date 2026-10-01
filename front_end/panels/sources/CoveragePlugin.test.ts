// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as Coverage from '../coverage/coverage.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;
const {html} = Lit;

describeWithEnvironment('CoveragePlugin', () => {
  let target: SDK.Target.Target;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let model: Coverage.CoverageModel.CoverageModel;
  let coverageInfo: Coverage.CoverageModel.URLCoverageInfo;
  let container: HTMLElement;
  const URL = urlString`test.js`;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });

    model = target.model(Coverage.CoverageModel.CoverageModel) as Coverage.CoverageModel.CoverageModel;
    coverageInfo = new Coverage.CoverageModel.URLCoverageInfo(URL);
    coverageInfo.addToSizes(9, 28);
    sinon.stub(model, 'getCoverageForUrl').withArgs(URL).returns(coverageInfo);
    ({uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'}));
    container = renderElementIntoDOM(document.createElement('div'));
  });

  function createPlugin(code: Workspace.UISourceCode.UISourceCode =
                            uiSourceCode): Sources.CoveragePlugin.CoveragePlugin {
    return new Sources.CoveragePlugin.CoveragePlugin(code, <SourceFrame.SourceFrame.Transformer>{});
  }

  function renderToolbarButton(plugin: Sources.CoveragePlugin.CoveragePlugin): HTMLElement {
    Lit.render(html`${plugin.rightToolbarItems()}`, container);
    const button = container.querySelector<HTMLElement>('devtools-button');
    assert.isNotNull(button);
    return button;
  }

  function listenForToolbarItemsChanged(plugin: Sources.CoveragePlugin.CoveragePlugin): sinon.SinonSpy {
    const listener = sinon.spy();
    plugin.addEventListener(Sources.Plugin.Events.TOOLBAR_ITEMS_CHANGED, listener);
    return listener;
  }

  it('shows stats', () => {
    const button = renderToolbarButton(createPlugin());

    assert.strictEqual(button.textContent, 'Coverage: 32.1%');
    assert.strictEqual(button.getAttribute('title'), 'Show details');
    assert.strictEqual(button.getAttribute('aria-label'), 'Show details');
    assert.isTrue(button.classList.contains('toolbar-button-secondary'));
  });

  it('shows N/A when there is no coverage for the URL', () => {
    const {uiSourceCode: otherUISourceCode} =
        createContentProviderUISourceCode({url: urlString`other.js`, mimeType: 'text/javascript', projectId: 'other'});
    const button = renderToolbarButton(createPlugin(otherUISourceCode));

    assert.strictEqual(button.textContent, 'Coverage: N/A');
    assert.strictEqual(button.getAttribute('title'), 'Click to show Coverage panel');
    assert.strictEqual(button.getAttribute('aria-label'), 'Click to show Coverage panel');
  });

  it('updates stats', () => {
    const coveragePlugin = createPlugin();
    assert.strictEqual(renderToolbarButton(coveragePlugin).textContent, 'Coverage: 32.1%');
    const listener = listenForToolbarItemsChanged(coveragePlugin);

    coverageInfo.addToSizes(10, 2);

    sinon.assert.calledOnce(listener);
    assert.strictEqual(renderToolbarButton(coveragePlugin).textContent, 'Coverage: 63.3%');
  });

  it('does not request a toolbar update when the label is unchanged', () => {
    const coveragePlugin = createPlugin();
    const listener = listenForToolbarItemsChanged(coveragePlugin);

    // 18/56 formats to the same 32.1% as the initial 9/28.
    coverageInfo.addToSizes(9, 28);

    sinon.assert.notCalled(listener);
  });

  it('resets stats', () => {
    const coveragePlugin = createPlugin();
    assert.strictEqual(renderToolbarButton(coveragePlugin).textContent, 'Coverage: 32.1%');
    const listener = listenForToolbarItemsChanged(coveragePlugin);

    model.dispatchEventToListeners(Coverage.CoverageModel.Events.CoverageReset);

    sinon.assert.calledOnce(listener);
    const button = renderToolbarButton(coveragePlugin);
    assert.strictEqual(button.textContent, 'Coverage: N/A');
    assert.strictEqual(button.getAttribute('title'), 'Click to show Coverage panel');
    assert.strictEqual(button.getAttribute('aria-label'), 'Click to show Coverage panel');
  });

  it('opens the Coverage panel when clicked', () => {
    const showView = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const button = renderToolbarButton(createPlugin());

    dispatchClickEvent(button);

    sinon.assert.calledOnceWithExactly(showView, 'coverage');
  });
});
