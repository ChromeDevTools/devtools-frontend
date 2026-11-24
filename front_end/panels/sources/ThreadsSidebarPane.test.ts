// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithEnvironment('ThreadsSidebarPane', () => {
  const {ThreadsSidebarPane} = Sources.ThreadsSidebarPane;
  let threadsSidebarPane: Sources.ThreadsSidebarPane.ThreadsSidebarPane;
  let view: sinon.SinonSpy;

  beforeEach(async () => {
    view = sinon.spy();
    threadsSidebarPane = new ThreadsSidebarPane(undefined, view);
    threadsSidebarPane.markAsRoot();
    renderElementIntoDOM(threadsSidebarPane);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
    view.resetHistory();
  });

  afterEach(() => {
    threadsSidebarPane.detach();
  });

  it('shows and hides based on the number of debugger models', () => {
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());

    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());

    const anotherTarget = createTarget();
    const anotherDebuggerModel = anotherTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(anotherDebuggerModel);
    assert.isTrue(ThreadsSidebarPane.shouldBeShown());

    SDK.TargetManager.TargetManager.instance().removeTarget(target);
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());
  });

  it('updates the view when a model is added or removed', async () => {
    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
  });

  it('updates the view on target flavor change', async () => {
    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await threadsSidebarPane.updateComplete;
    view.resetHistory();

    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
  });

  it('continues updating on target name changes after another target is removed', async () => {
    const target1 = createTarget();
    const target2 = createTarget();
    await threadsSidebarPane.updateComplete;

    SDK.TargetManager.TargetManager.instance().removeTarget(target2);
    await threadsSidebarPane.updateComplete;
    view.resetHistory();

    target1.setName('renamed-target');
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
  });
});

describe('ThreadsSidebarPane rendering and accessibility', () => {
  setupRuntimeHooks();
  setupLocaleHooks();

  const {ThreadsSidebarPane} = Sources.ThreadsSidebarPane;
  let backend: MockDebuggerBackend;
  let threadsSidebarPane: Sources.ThreadsSidebarPane.ThreadsSidebarPane|undefined;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(backend.universe.settings);
    setTestUniverseForWidgets(backend.universe);
    threadsSidebarPane = undefined;
  });

  afterEach(() => {
    threadsSidebarPane?.detach();
    UI.Context.Context.removeInstance();
  });

  it('renders paused worker and main thread without accessibility violations', async () => {
    const mainTarget = backend.createTarget({
      id: 'main' as Protocol.Target.TargetID,
      name: 'Main',
      type: SDK.Target.Type.FRAME,
    });
    const mainRuntimeModel = mainTarget.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(mainRuntimeModel);
    backend.cdpConnection.dispatchEvent('Runtime.executionContextCreated', {
      context: {
        id: 1 as Protocol.Runtime.ExecutionContextId,
        origin: 'http://127.0.0.1:8000',
        name: '',
        uniqueId: 'main-context',
        auxData: {isDefault: true},
      },
    },
                                        mainTarget.sessionId);
    assert.strictEqual(mainRuntimeModel.defaultExecutionContext()?.label(), '');

    const workerTarget = backend.createTarget({
      id: 'worker-1' as Protocol.Target.TargetID,
      name: 'worker-source.js',
      type: SDK.Target.Type.Worker,
      parentTarget: mainTarget,
    });
    const workerRuntimeModel = workerTarget.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(workerRuntimeModel);
    backend.cdpConnection.dispatchEvent('Runtime.executionContextCreated', {
      context: {
        id: 1 as Protocol.Runtime.ExecutionContextId,
        origin: 'http://127.0.0.1:8000/devtools/sources/resources/worker-source.js',
        name: 'worker-source.js',
        uniqueId: 'worker-context',
        auxData: {isDefault: true},
      },
    },
                                        workerTarget.sessionId);
    assert.strictEqual(workerRuntimeModel.defaultExecutionContext()?.label(), 'worker-source.js');

    const workerDebuggerModel = workerTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(workerDebuggerModel);
    const workerScript = await backend.addScript(workerTarget, {
      url: 'http://127.0.0.1:8000/devtools/sources/resources/worker-source.js',
      content: 'debugger;\n',
    },
                                                 null);
    const pausedPromise = workerDebuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
    backend.dispatchDebuggerPause(workerScript, Protocol.Debugger.PausedEventReason.Other);
    await pausedPromise;

    UI.Context.Context.instance().setFlavor(SDK.Target.Target, workerTarget);
    assert.isTrue(ThreadsSidebarPane.shouldBeShown());

    threadsSidebarPane = new ThreadsSidebarPane();
    renderElementIntoDOM(threadsSidebarPane, {includeCommonStyles: true, width: 300, height: 100});
    await threadsSidebarPane.updateComplete;

    const listbox = threadsSidebarPane.contentElement.querySelector('[role="listbox"]');
    assert.exists(listbox);
    const options = [...listbox.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    assert.lengthOf(options, 2);

    assert.strictEqual(options[0].querySelector('.thread-item-title')?.textContent, 'Main');
    assert.strictEqual(options[0].querySelector('.thread-item-paused-state')?.textContent, '');
    assert.strictEqual(options[0].getAttribute('aria-selected'), 'false');
    assert.isNull(options[0].querySelector('.selected-thread-icon'));

    assert.strictEqual(options[1].querySelector('.thread-item-title')?.textContent, 'worker-source.js');
    assert.strictEqual(options[1].querySelector('.thread-item-paused-state')?.textContent, 'paused');
    assert.strictEqual(options[1].getAttribute('aria-selected'), 'true');
    assert.exists(options[1].querySelector('.selected-thread-icon'));

    const violations = await getAxeViolations(threadsSidebarPane.contentElement);
    assert.isEmpty(violations);

    await raf();
    await assertScreenshot('sources/threads-sidebar-pane.png');
  });
});
