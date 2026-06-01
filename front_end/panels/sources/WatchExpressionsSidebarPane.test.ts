// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
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

    const expandController = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const linkifier = new Components.Linkifier.Linkifier();

    const watchExpression = new Sources.WatchExpressionsSidebarPane.WatchExpression('obj', expandController, linkifier);
    await watchExpression.updateComplete;

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

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);

    await pane.updateComplete;

    const emptyElement = pane.contentElement.querySelector('.gray-info-message');
    assert.exists(emptyElement);
    assert.strictEqual(emptyElement.textContent, 'No watch expressions');

  });

  it('adds expression via action', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set([]);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const frame = sinon.createStubInstance(Sources.UISourceCodeFrame.UISourceCodeFrame);
    sinon.stub(frame, 'textEditor').value({state: {sliceDoc: () => '1 + 1', selection: {main: {from: 0, to: 5}}}});
    UI.Context.Context.instance().setFlavor(Sources.UISourceCodeFrame.UISourceCodeFrame, frame);

    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();

    pane.handleAction(UI.Context.Context.instance(), 'sources.add-to-watch');
    await pane.updateComplete;

    assert.deepEqual(setting.get(), ['1 + 1']);

  });

  it('edits an expression and saves to settings', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['1 + 1']);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves(
        {object: SDK.RemoteObject.RemoteObject.fromLocalObject(2), exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];

    const listItemElement = watchExpression.treeElement().listItemElement;
    assert.exists(listItemElement);

    const headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    assert.exists(headerElement);

    // Double click to start editing
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    const textPromptElement = listItemElement.querySelector('.text-prompt') as HTMLElement;
    assert.exists(textPromptElement);

    textPromptElement.textContent = '2 + 2';
    textPromptElement.dispatchEvent(new InputEvent('input', {bubbles: true}));
    textPromptElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    await watchExpression.updateComplete;

    assert.deepEqual(setting.get(), ['2 + 2']);

  });

  it('deletes an expression and saves to settings', async () => {
    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['1 + 1']);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves(
        {object: SDK.RemoteObject.RemoteObject.fromLocalObject(2), exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];

    const listItemElement = watchExpression.treeElement().listItemElement;
    const deleteButton = listItemElement.querySelector('.watch-expression-delete-button') as HTMLElement;
    assert.exists(deleteButton);

    deleteButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    await watchExpression.updateComplete;

    assert.deepEqual(setting.get(), []);

  });

  it('screenshot for empty state', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set([]);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    await assertScreenshot('sources/watch-expressions-empty.png');

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
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpressions = pane.watchExpressions;
    assert.lengthOf(watchExpressions, 2);

    watchExpressions[1].treeElement().select();
    await pane.updateComplete;

    await assertScreenshot('sources/watch-expressions-list.png');
  });

  it('preserves expansion state across updates', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: {bar: 'baz'}});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves({object, exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['obj']);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];

    const treeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.instanceOf(treeElement, ObjectUI.ObjectPropertiesSection.RootElement);
    assert.isFalse(treeElement.expanded);

    // Expand the root
    treeElement.expand();
    assert.isTrue(treeElement.expanded);

    // Expand the 'foo' property
    await treeElement.onpopulate();
    const fooProperty = treeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    assert.exists(fooProperty);
    fooProperty.expand();
    assert.isTrue(fooProperty.expanded);

    // Trigger update
    watchExpression.update();
    await watchExpression.updateComplete;

    const newTreeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.notStrictEqual(treeElement, newTreeElement);
    assert.isTrue(newTreeElement.expanded);

    await newTreeElement.onpopulate();
    const newFooProperty = newTreeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    assert.notStrictEqual(fooProperty, newFooProperty);
    assert.isTrue(newFooProperty.expanded);
  });

  it('clears expansion state when expression changes', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: {bar: 'baz'}});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves({object, exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['obj1']);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];
    const treeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.instanceOf(treeElement, ObjectUI.ObjectPropertiesSection.RootElement);

    // Expand the root and a property
    treeElement.expand();
    await treeElement.onpopulate();
    const fooProperty = treeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    fooProperty.expand();
    assert.isTrue(treeElement.expanded);
    assert.isTrue(fooProperty.expanded);

    // Change expression
    watchExpression.updateExpression('obj2');
    await watchExpression.updateComplete;

    const newTreeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.notStrictEqual(treeElement, newTreeElement);
    assert.isFalse(newTreeElement.expanded);

    // Re-query fooProperty and check it's not expanded
    await newTreeElement.onpopulate();
    const newFooProperty = newTreeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    assert.notStrictEqual(fooProperty, newFooProperty);
    assert.isFalse(newFooProperty.expanded);
  });

  it('clears expansion state for the root when expression changes and changes back', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: {bar: 'baz'}});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.evaluate.resolves({object, exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const setting = Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);
    setting.set(['obj1']);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];
    const treeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.instanceOf(treeElement, ObjectUI.ObjectPropertiesSection.RootElement);
    treeElement.expand();
    await treeElement.onpopulate();
    const fooProperty = treeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    fooProperty.expand();
    assert.isTrue(treeElement.expanded);
    assert.isTrue(fooProperty.expanded);

    // Change expression to obj2
    watchExpression.updateExpression('obj2');
    await watchExpression.updateComplete;

    // Change expression back to obj1
    watchExpression.updateExpression('obj1');
    await watchExpression.updateComplete;

    const finalTreeElement = watchExpression.treeElement() as ObjectUI.ObjectPropertiesSection.RootElement;
    assert.isFalse(finalTreeElement.expanded, 'Expansion state of root should be cleared when expression changes');

    await finalTreeElement.onpopulate();
    const finalFooProperty = finalTreeElement.childAt(0) as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
    assert.notStrictEqual(fooProperty, finalFooProperty);
    assert.isFalse(finalFooProperty.expanded);
  });
});
