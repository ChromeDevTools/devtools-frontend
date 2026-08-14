// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

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
    await UI.Widget.Widget.allUpdatesComplete;

    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(listItemElement);

    const headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    assert.exists(headerElement);

    // Double click to start editing
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    const textPromptElement = treeElement?.shadowRoot?.querySelector('devtools-prompt') as HTMLElement;
    assert.exists(textPromptElement);

    const savePromise = spyCall(pane, 'saveExpressions');
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: '2 + 2'}));
    await savePromise;
    await UI.Widget.Widget.allUpdatesComplete;

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

  it('screenshot for expanded function expression', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set(['f']);

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

    const target = createTarget();
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    debuggerModel.parsedScriptSource('1' as Protocol.Runtime.ScriptId, urlString`http://example.com/test.js`, 0, 0, 10,
                                     0, 0, '', undefined, undefined, false, false, 100, null, null, null, null, null,
                                     null, null);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    executionContext.debuggerModel = debuggerModel;
    executionContext.runtimeModel = runtimeModel;

    const functionObject = new SDK.RemoteObject.RemoteObjectImpl(
        runtimeModel,
        'mock-f-id' as Protocol.Runtime.RemoteObjectId,
        'function',
        undefined,
        undefined,
        undefined,
        'ƒ () {}',
    );

    const locationObject = new SDK.RemoteObject.RemoteObjectImpl(
        runtimeModel,
        undefined,
        'object',
        'internal#location',
        {scriptId: '1' as Protocol.Runtime.ScriptId, lineNumber: 0, columnNumber: 0},
    );

    const protoObject = new SDK.RemoteObject.RemoteObjectImpl(
        runtimeModel,
        'mock-proto-id' as Protocol.Runtime.RemoteObjectId,
        'function',
        undefined,
        undefined,
        undefined,
        'function () {}',
    );

    const properties = [
      new SDK.RemoteObject.RemoteObjectProperty('arguments', SDK.RemoteObject.RemoteObject.fromLocalObject(null), false,
                                                false, true),
      new SDK.RemoteObject.RemoteObjectProperty('caller', SDK.RemoteObject.RemoteObject.fromLocalObject(null), false,
                                                false, true),
      new SDK.RemoteObject.RemoteObjectProperty('length', SDK.RemoteObject.RemoteObject.fromLocalObject(0), false,
                                                false, true),
      new SDK.RemoteObject.RemoteObjectProperty('name', SDK.RemoteObject.RemoteObject.fromLocalObject('f'), false,
                                                false, true),
      new SDK.RemoteObject.RemoteObjectProperty('prototype', SDK.RemoteObject.RemoteObject.fromLocalObject({}), false,
                                                true, true),
    ];
    const internalProperties = [
      new SDK.RemoteObject.RemoteObjectProperty('[[FunctionLocation]]', locationObject, true, false, undefined,
                                                undefined, undefined, true),
      new SDK.RemoteObject.RemoteObjectProperty('[[Prototype]]', protoObject, true, false, undefined, undefined,
                                                undefined, true),
      new SDK.RemoteObject.RemoteObjectProperty('[[Scopes]]',
                                                SDK.RemoteObject.RemoteObject.fromLocalObject('Scopes[0]'), true, false,
                                                undefined, undefined, undefined, true),
    ];

    sinon.stub(functionObject, 'getOwnProperties').resolves({properties, internalProperties});
    sinon.stub(functionObject, 'getAllProperties').resolves({properties: [], internalProperties: null});

    executionContext.evaluate.resolves({object: functionObject, exceptionDetails: undefined});

    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);
    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();

    pane.element.style.width = '300px';
    pane.element.style.height = '200px';
    renderElementIntoDOM(pane, {includeCommonStyles: true});
    await raf();
    await pane.updateComplete;

    const watchExpressions = pane.watchExpressions;
    assert.lengthOf(watchExpressions, 1);

    const treeComponent = pane.contentElement.querySelector('devtools-tree');
    assert.exists(treeComponent);
    const treeOutline = treeComponent.getInternalTreeOutlineForTest();
    treeOutline.firstChild()?.expand();
    await raf();
    await pane.updateComplete;

    await assertScreenshot('sources/watch-expressions-function.png');
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
    await UI.Widget.Widget.allUpdatesComplete;

    const textPromptElement = treeElement?.shadowRoot?.querySelector('devtools-prompt') as HTMLElement;
    const savePromise = spyCall(pane, 'saveExpressions');
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj2'}));
    await savePromise;
    await UI.Widget.Widget.allUpdatesComplete;

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
    await UI.Widget.Widget.allUpdatesComplete;

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
    await UI.Widget.Widget.allUpdatesComplete;

    let textPromptElement = treeElement?.shadowRoot?.querySelector('devtools-prompt') as HTMLElement;
    let savePromise = spyCall(pane, 'saveExpressions');
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj2'}));
    await savePromise;
    await UI.Widget.Widget.allUpdatesComplete;

    // Change expression back to obj1
    listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    textPromptElement = treeElement?.shadowRoot?.querySelector('devtools-prompt') as HTMLElement;
    savePromise = spyCall(pane, 'saveExpressions');
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'obj1'}));
    await savePromise;
    await UI.Widget.Widget.allUpdatesComplete;

    const newWatchExpression = pane.watchExpressions[0];
    const finalTree = newWatchExpression.result as ObjectUI.ObjectPropertiesSection.ObjectTree;

    assert.isFalse(finalTree.expanded, 'Expansion state of root should be cleared when expression changes');

    const finalChildren = await finalTree.populateChildrenIfNeeded();
    const finalFooProperty = finalChildren.properties?.find(p => p.name === 'foo');
    assert.exists(finalFooProperty);
    assert.notStrictEqual(fooProperty, finalFooProperty);
    assert.isFalse(finalFooProperty.expanded);
  });

  it('updates completions on beforeautocomplete without cancelling editing', async () => {
    Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []).set(['as']);

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    const runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
    debuggerModel.selectedCallFrame.returns(null);
    executionContext.debuggerModel = debuggerModel;
    executionContext.runtimeModel = runtimeModel;
    executionContext.globalLexicalScopeNames.resolves([]);
    executionContext.evaluate.resolves(
        {object: SDK.RemoteObject.RemoteObject.fromLocalObject(123), exceptionDetails: undefined});
    sinon.stub(UI.Context.Context.instance(), 'flavor').returns(executionContext);

    const pane = new Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane();
    renderElementIntoDOM(pane);
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    const treeElement = pane.contentElement.querySelector('devtools-tree');
    const listItemElement = treeElement?.shadowRoot?.querySelector('.watch-expression-tree-item') as HTMLElement;
    assert.exists(listItemElement);

    const headerElement = listItemElement.querySelector('.watch-expression-header') as HTMLElement;
    assert.exists(headerElement);

    headerElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    const textPromptElement = treeElement?.shadowRoot?.querySelector('devtools-prompt') as HTMLElement;
    assert.exists(textPromptElement);
    assert.isTrue(textPromptElement.hasAttribute('editing'));

    const widgetElement = treeElement?.shadowRoot?.querySelector('devtools-widget') as HTMLElement;
    const promptWidget = UI.Widget.Widget.get(widgetElement);
    assert.exists(promptWidget);
    const updatePromise = spyCall(promptWidget, 'performUpdate');
    textPromptElement.dispatchEvent(new UI.TextPrompt.TextPromptElement.BeforeAutoCompleteEvent({
      expression: '',
      filter: 'as',
      force: false,
    }));
    await updatePromise;
    await UI.Widget.Widget.allUpdatesComplete;

    const datalist = textPromptElement.querySelector('datalist');
    assert.exists(datalist);
    const options = Array.from(datalist.querySelectorAll('option')).map(opt => opt.value || opt.textContent);
    assert.include(options, 'async');
    assert.isTrue(textPromptElement.hasAttribute('editing'));

    const savePromise = spyCall(pane, 'saveExpressions');
    textPromptElement.dispatchEvent(new CustomEvent('commit', {detail: 'async'}));
    await savePromise;
    await UI.Widget.Widget.allUpdatesComplete;

    const clearedDatalist = textPromptElement.querySelector('datalist');
    assert.isNull(clearedDatalist);
  });
});
