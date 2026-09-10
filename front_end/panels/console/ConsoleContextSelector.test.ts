// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {navigate} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

describeWithEnvironment('ConsoleContextSelector', () => {
  let target: SDK.Target.Target;
  let subtarget: SDK.Target.Target;
  let targetContext: SDK.RuntimeModel.ExecutionContext;
  let subtargetContext: SDK.RuntimeModel.ExecutionContext;
  let selector: Console.ConsoleContextSelector.ConsoleContextSelector;

  beforeEach(() => {
    selector = new Console.ConsoleContextSelector.ConsoleContextSelector();
    target = createTarget();
    subtarget = createTarget({parentTarget: target});
    targetContext = createExecutionContext(target);
    subtargetContext = createExecutionContext(subtarget);
  });

  let id = 0;

  function createExecutionContext(target: SDK.Target.Target): SDK.RuntimeModel.ExecutionContext {
    ++id;
    dispatchEvent(target, 'Runtime.executionContextCreated', {
      context: {
        id: id as Protocol.Runtime.ExecutionContextId,
        origin: 'http://example.com',
        name: `c${id}`,
        uniqueId: `c${id}`,
        auxData: {
          frameId: 'f2',
        },
      },
    });
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const executionContext = runtimeModel.executionContext(id);
    assert.exists(executionContext);
    return executionContext;
  }

  const tests = (inScope: boolean) => () => {
    beforeEach(() => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    });

    it('creates drop-down with console context', () => {
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext] : []);

      const subtarget2 = createTarget({parentTarget: target});
      const subtarget2Context = createExecutionContext(subtarget2);
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext, subtarget2Context] : []);

      const subtarget2Context2 = createExecutionContext(subtarget2);
      assert.deepEqual(
          [...selector.items], inScope ? [targetContext, subtargetContext, subtarget2Context, subtarget2Context2] : []);

      subtarget2.dispose('');
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext] : []);
    });

    it('updates selected target when UI context flavor changes', () => {
      assert.strictEqual(selector.toolbarItem().element.title, 'JavaScript context: Not selected');
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, targetContext);
      assert.strictEqual(
          selector.toolbarItem().element.title,
          `JavaScript context: ${inScope ? 'c' + targetContext.id : 'Not selected'}`);
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, subtargetContext);
      assert.strictEqual(
          selector.toolbarItem().element.title,
          `JavaScript context: ${inScope ? 'c' + subtargetContext.id : 'Not selected'}`);
    });
  };

  describe('in scope', tests(true));
  describe('out of scope', tests(false));

  it('updates UI context flavor on selection', () => {
    selector.itemSelected(targetContext);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), targetContext);
    selector.itemSelected(subtargetContext);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), subtargetContext);
  });

  describe('createElementForItem subtitle', () => {
    async function getSubtitle(executionContext: SDK.RuntimeModel.ExecutionContext): Promise<string> {
      const element = selector.createElementForItem(executionContext);
      renderElementIntoDOM(element, {allowMultipleChildren: true});
      await UI.Widget.Widget.allUpdatesComplete;
      const subtitle = element.querySelector('.subtitle')?.textContent;
      return subtitle ?? '';
    }

    function createCustomExecutionContext(target: SDK.Target.Target, origin: string,
                                          frameId?: Protocol.Page.FrameId): SDK.RuntimeModel.ExecutionContext {
      ++id;
      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: id as Protocol.Runtime.ExecutionContextId,
          origin,
          name: `c${id}`,
          uniqueId: `c${id}`,
          auxData: frameId ? {frameId} : undefined,
        },
      });
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const executionContext = runtimeModel.executionContext(id);
      assert.exists(executionContext);
      return executionContext;
    }

    it('renders domain for top-level frame without parent frame', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const mainFrame = resourceTreeModel.frameAttached('main-frame' as Protocol.Page.FrameId, null);
      assert.exists(mainFrame);
      navigate(mainFrame, {url: 'https://example.com/', securityOrigin: 'https://example.com'});

      const context = createCustomExecutionContext(target, 'https://example.com', mainFrame.id);
      const subtitle = await getSubtitle(context);
      assert.strictEqual(subtitle, 'example.com');
    });

    it('renders domain for subframe with different-origin parent frame', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const parentFrame = resourceTreeModel.frameAttached('parent-frame' as Protocol.Page.FrameId, null);
      assert.exists(parentFrame);
      navigate(parentFrame, {url: 'https://parent.com/', securityOrigin: 'https://parent.com'});

      const childFrame = resourceTreeModel.frameAttached('child-frame' as Protocol.Page.FrameId, parentFrame.id);
      assert.exists(childFrame);
      navigate(childFrame, {url: 'https://child.com/', securityOrigin: 'https://child.com'});

      const context = createCustomExecutionContext(target, 'https://child.com', childFrame.id);
      const subtitle = await getSubtitle(context);
      assert.strictEqual(subtitle, 'child.com');
    });

    it('renders frame domain for subframe with same-origin parent frame', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const parentFrame = resourceTreeModel.frameAttached('same-parent' as Protocol.Page.FrameId, null);
      assert.exists(parentFrame);
      navigate(parentFrame, {url: 'https://example.com/', securityOrigin: 'https://example.com'});

      const childFrame = resourceTreeModel.frameAttached('same-child' as Protocol.Page.FrameId, parentFrame.id);
      assert.exists(childFrame);
      navigate(childFrame, {url: 'https://example.com/sub', securityOrigin: 'https://example.com'});

      const context = createCustomExecutionContext(target, 'https://example.com', childFrame.id);
      const subtitle = await getSubtitle(context);
      assert.strictEqual(subtitle, 'example.com');
    });

    it('renders fallback IFrame for subframe with opaque origin', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const parentFrame = resourceTreeModel.frameAttached('opaque-parent' as Protocol.Page.FrameId, null);
      assert.exists(parentFrame);
      navigate(parentFrame, {url: 'https://example.com/', securityOrigin: 'https://example.com'});

      const childFrame = resourceTreeModel.frameAttached('opaque-child' as Protocol.Page.FrameId, parentFrame.id);
      assert.exists(childFrame);
      navigate(childFrame, {url: 'about:blank', securityOrigin: ''});

      const context = createCustomExecutionContext(target, 'about:blank', childFrame.id);
      const subtitle = await getSubtitle(context);
      assert.strictEqual(subtitle, 'IFrame');
    });

    it('renders Extension for chrome-extension execution context', async () => {
      const context = createCustomExecutionContext(target, 'chrome-extension://abcdefghijklmnop');
      const subtitle = await getSubtitle(context);
      assert.strictEqual(subtitle, 'Extension');
    });
  });
});
