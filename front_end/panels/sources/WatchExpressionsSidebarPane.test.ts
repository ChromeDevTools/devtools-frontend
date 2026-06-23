// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
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

    const expansionTracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const watchExpression = new Sources.WatchExpressionsSidebarPane.WatchExpression();
    await watchExpression.setExpression('obj', expansionTracker);
    assert.isTrue(watchExpression.result?.readOnly);
  });

  it('shows "No watch expressions" when empty', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set([]);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);

    await raf();
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
    await raf();
    await pane.updateComplete;

    const frame = sinon.createStubInstance(Sources.UISourceCodeFrame.UISourceCodeFrame);
    sinon.stub(frame, 'textEditor').value({state: {sliceDoc: () => '1 + 1', selection: {main: {from: 0, to: 5}}}});
    UI.Context.Context.instance().setFlavor(Sources.UISourceCodeFrame.UISourceCodeFrame, frame);

    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();

    pane.handleAction(UI.Context.Context.instance(), 'sources.add-to-watch');
    await raf();
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
    await raf();
    await pane.updateComplete;

    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(listItemElement);

    const headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    assert.exists(headerElement);

    // Double click to start editing
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await pane.updateComplete;

    const textPromptElement = listItemElement.querySelector('devtools-prompt') as HTMLElement;
    assert.exists(textPromptElement);

    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: '2 + 2'}));

    await raf();
    await pane.updateComplete;

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
    await raf();
    await pane.updateComplete;

    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(listItemElement);

    const deleteButton = listItemElement.querySelector('.watch-expression-delete-button') as HTMLElement;
    assert.exists(deleteButton);

    deleteButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    await raf();
    await pane.updateComplete;

    assert.deepEqual(setting.get(), []);

  });

  it('screenshot for empty state', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set([]);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane, {includeCommonStyles: true});
    await raf();
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
    renderElementIntoDOM(pane, {includeCommonStyles: true});
    await raf();
    await pane.updateComplete;

    const watchExpressions = pane.watchExpressions;
    assert.lengthOf(watchExpressions, 2);

    await assertScreenshot('sources/watch-expressions-list.png');
  });

  it('screenshot for watch expression with delete button visible', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set(['1 + 1']);

    const object1 = SDK.RemoteObject.RemoteObject.fromLocalObject(2);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;

    executionContext.evaluate.resolves({object: object1, exceptionDetails: undefined});

    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane);
    await raf();
    await pane.updateComplete;

    const watchExpressions = pane.watchExpressions;
    assert.lengthOf(watchExpressions, 1);

    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(listItemElement);
    const deleteButton = listItemElement.querySelector('.watch-expression-delete-button') as HTMLElement;
    assert.exists(deleteButton);

    // Focus the delete button to make it visible via :focus-within on the title
    deleteButton.focus();
    await pane.updateComplete;

    await assertScreenshot('sources/watch-expression-delete-button.png');
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
    await raf();
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];

    const tree = watchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;
    assert.exists(tree);
    assert.isFalse(tree.expanded);

    // Expand the root
    tree.expanded = true;
    assert.isTrue(tree.expanded);

    // Expand the 'foo' property
    const children = await tree.populateChildrenIfNeeded();
    const fooProperty = children.properties?.find(p => p.name === 'foo');
    assert.exists(fooProperty);
    fooProperty.expanded = true;
    assert.isTrue(fooProperty.expanded);

    // Trigger update by refreshing
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
    await raf();
    await pane.updateComplete;

    const newWatchExpression = pane.watchExpressions[0];
    const newTree = newWatchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;
    assert.notStrictEqual(tree, newTree);
    assert.isTrue(newTree.expanded);

    const newChildren = await newTree.populateChildrenIfNeeded();
    const newFooProperty = newChildren.properties?.find(p => p.name === 'foo');
    assert.exists(newFooProperty);
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
    await raf();
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];
    const tree = watchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;
    assert.exists(tree);

    // Expand the root and a property
    tree.expanded = true;
    const children = await tree.populateChildrenIfNeeded();
    const fooProperty = children.properties?.find(p => p.name === 'foo');
    assert.exists(fooProperty);
    fooProperty.expanded = true;

    assert.isTrue(tree.expanded);
    assert.isTrue(fooProperty.expanded);

    // Change expression
    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    const headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await pane.updateComplete;

    const textPromptElement = listItemElement.querySelector('devtools-prompt') as HTMLElement;
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj2'}));
    await raf();
    await pane.updateComplete;

    const newWatchExpression = pane.watchExpressions[0];
    const newTree = newWatchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;
    assert.notStrictEqual(tree, newTree);
    assert.isFalse(newTree.expanded);

    // Re-query fooProperty and check it's not expanded
    const newChildren = await newTree.populateChildrenIfNeeded();
    const newFooProperty = newChildren.properties?.find(p => p.name === 'foo');
    assert.exists(newFooProperty);
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
    await raf();
    await pane.updateComplete;

    const watchExpression = pane.watchExpressions[0];
    const tree = watchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;
    assert.exists(tree);

    tree.expanded = true;
    const children = await tree.populateChildrenIfNeeded();
    const fooProperty = children.properties?.find(p => p.name === 'foo');
    assert.exists(fooProperty);
    fooProperty.expanded = true;

    assert.isTrue(tree.expanded);
    assert.isTrue(fooProperty.expanded);

    // Change expression to obj2
    const treeElement = pane.contentElement.querySelector('devtools-tree');
    let listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    let headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await pane.updateComplete;

    let textPromptElement = listItemElement.querySelector('devtools-prompt') as HTMLElement;
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj2'}));
    await raf();
    await pane.updateComplete;

    // Change expression back to obj1
    listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await pane.updateComplete;

    textPromptElement = listItemElement.querySelector('devtools-prompt') as HTMLElement;
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj1'}));
    await raf();
    await pane.updateComplete;

    const newWatchExpression = pane.watchExpressions[0];
    const finalTree = newWatchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;

    assert.isFalse(finalTree.expanded, 'Expansion state of root should be cleared when expression changes');

    const finalChildren = await finalTree.populateChildrenIfNeeded();
    const finalFooProperty = finalChildren.properties?.find(p => p.name === 'foo');
    assert.exists(finalFooProperty);
    assert.notStrictEqual(fooProperty, finalFooProperty);
    assert.isFalse(finalFooProperty.expanded);
  });
});
