// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithEnvironment('WatchExpression', () => {
  it('creates read-only object properties for watch expression', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves({object, exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const expandController = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(
        new UI.TreeOutline.TreeOutline());
    const linkifier = new Components.Linkifier.Linkifier();

    const watchExpression = new Sources.WatchExpressionsSidebarPane.WatchExpression('obj', expandController, linkifier);
    await spyCall(watchExpression, 'createWatchExpression');

    const treeElement = watchExpression.treeElement();
    assert.exists(treeElement);

    // Ensure children are populated
    await treeElement.onpopulate();

    const firstProperty = treeElement.childAt(0);
    assert.instanceOf(firstProperty, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(firstProperty.editable);
  });

  it('shows "No watch expressions" when empty', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set([]);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    renderElementIntoDOM(pane);

    await pane.performUpdate();

    const emptyElement = pane.contentElement.querySelector('.gray-info-message');
    assert.exists(emptyElement);
    assert.strictEqual(emptyElement.textContent, 'No watch expressions');

    pane.detach();
  });

  it('adds expression via action', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set([]);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    renderElementIntoDOM(pane);
    await pane.performUpdate();

    const frame = sinon.createStubInstance(Sources.UISourceCodeFrame.UISourceCodeFrame);
    sinon.stub(frame, 'textEditor').value({state: {sliceDoc: () => '1 + 1', selection: {main: {from: 0, to: 5}}}});
    UI.Context.Context.instance().setFlavor(Sources.UISourceCodeFrame.UISourceCodeFrame, frame);

    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();

    const firstCall = spyCall(Sources.WatchExpressionsSidebarPane.WatchExpression.prototype, 'createWatchExpression');
    pane.handleAction(UI.Context.Context.instance(), 'sources.add-to-watch');
    await firstCall;

    assert.deepEqual(setting.get(), ['1 + 1']);

    pane.detach();
  });

  it('edits an expression and saves to settings', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['1 + 1']);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    renderElementIntoDOM(pane);
    await pane.performUpdate();

    const watchExpression = pane.watchExpressions[0];

    const treeOutlineElement =
        pane.contentElement.querySelector('.gray-info-message')?.nextElementSibling as HTMLElement;
    assert.exists(treeOutlineElement);
    assert.exists(treeOutlineElement.shadowRoot);

    const watchExpressionItem =
        treeOutlineElement.shadowRoot.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(watchExpressionItem);

    const headerElement = watchExpressionItem.querySelector('.watch-expression-header') as HTMLElement;
    assert.exists(headerElement);

    // Double click to start editing
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    const textPromptElement = treeOutlineElement.shadowRoot.querySelector('.text-prompt') as HTMLElement;
    assert.exists(textPromptElement);

    const editUpdatesPromise = spyCall(watchExpression, 'createWatchExpression');
    textPromptElement.textContent = '2 + 2';
    textPromptElement.dispatchEvent(new InputEvent('input', {bubbles: true}));
    textPromptElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    await editUpdatesPromise;

    assert.deepEqual(setting.get(), ['2 + 2']);

    pane.detach();
  });

  it('deletes an expression and saves to settings', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['1 + 1']);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    renderElementIntoDOM(pane);
    await pane.performUpdate();

    const watchExpression = pane.watchExpressions[0];

    const treeOutlineElement =
        pane.contentElement.querySelector('.gray-info-message')?.nextElementSibling as HTMLElement;
    assert.exists(treeOutlineElement);
    assert.exists(treeOutlineElement.shadowRoot);

    const deleteButton = treeOutlineElement.shadowRoot.querySelector('.watch-expression-delete-button') as HTMLElement;
    assert.exists(deleteButton);

    const editUpdatesPromise = spyCall(watchExpression, 'createWatchExpression');
    deleteButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    await editUpdatesPromise;

    assert.deepEqual(setting.get(), []);

    pane.detach();
  });

  it('screenshot for empty state', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set([]);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane);
    await pane.performUpdate();

    await assertScreenshot('sources/watch-expressions-empty.png');

    pane.detach();
  });

  it('screenshot for list of expressions', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set(['1 + 1', '2 + 2']);

    const object1 = SDK.RemoteObject.RemoteObject.fromLocalObject(2);
    const object2 = SDK.RemoteObject.RemoteObject.fromLocalObject(4);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;

    executionContext.evaluate.callsFake(async (options: SDK.RuntimeModel.EvaluationOptions) => {
      if (options.expression === '1 + 1') {
        return {object: object1, exceptionDetails: undefined};
      }
      return {object: object2, exceptionDetails: undefined};
    });

    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const pane = Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane);
    await pane.performUpdate();

    const watchExpressions = pane.watchExpressions;
    await Promise.all(watchExpressions.map(we => spyCall(we, 'createWatchExpression')));

    await assertScreenshot('sources/watch-expressions-list.png');

    pane.detach();
  });
});
