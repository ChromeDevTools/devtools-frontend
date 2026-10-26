// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {dispatchKeyDownEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const CLASS_NAMES = ['class-1', 'class-2', 'class-3'];

describeWithEnvironment('ClassesPaneWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.ClassesPaneWidget.ClassesPaneWidget;

  beforeEach(() => {
    target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
  });

  afterEach(() => {
    view?.detach();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const viewFunction = createViewFunctionStub(Elements.ClassesPaneWidget.ClassesPaneWidget);
    const presenter = new Elements.ClassesPaneWidget.ClassesPaneWidget(undefined, viewFunction);
    presenter.wasShown();

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await viewFunction.nextInput;
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'getAttribute').withArgs('class').returns(CLASS_NAMES.join(' '));
    assert.isEmpty(viewFunction.input.classes);

    model.dispatchEventToListeners(SDK.DOMModel.Events.DOMMutated, node);
    if (inScope) {
      const input = await viewFunction.nextInput;
      assert.deepEqual(input.classes, CLASS_NAMES.map(className => ({className, enabled: true})));
    } else {
      await presenter.updateComplete;
      assert.isEmpty(viewFunction.input.classes);
    }
    presenter.willHide();
  };

  it('updates UI on in scope update event', updatesUiOnEvent(true));
  it('does not update UI on out of scope update event', updatesUiOnEvent(false));

  it('strips leading dot when applying dot-prefixed classes', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    view = new Elements.ClassesPaneWidget.ClassesPaneWidget();
    renderElementIntoDOM(view);

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'getAttribute').withArgs('class').returns('');
    const setAttributeValue = expectCall(sinon.stub(node, 'setAttributeValuePromise'), {
      fakeFn: (_name: string, _value: string) => Promise.resolve(null),
    });

    const input = view.contentElement.querySelector('.new-class-input');
    assert.instanceOf(input, HTMLElement);
    input.textContent = '.btn';
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    const [name, value] = await setAttributeValue;
    assert.strictEqual(name, 'class');
    assert.strictEqual(value, 'btn');
  });

  function createNodeWithClasses(classAttribute: string): SDK.DOMModel.DOMNode {
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'getAttribute').withArgs('class').returns(classAttribute);
    return node;
  }

  function renderClassesPaneWidget(): Elements.ClassesPaneWidget.ClassesPaneWidget {
    view = new Elements.ClassesPaneWidget.ClassesPaneWidget();
    renderElementIntoDOM(view);
    return view;
  }

  it('renders node classes sorted case-insensitively', async () => {
    const node = createNodeWithClasses('zebra alpha Beta');

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;

    const checkboxes = [...view.contentElement.querySelectorAll('devtools-checkbox')];
    assert.deepEqual(checkboxes.map(checkbox => checkbox.title), ['alpha', 'Beta', 'zebra']);
    assert.isTrue(checkboxes.every(checkbox => checkbox.checked));
  });

  it('replaces rendered classes when selected node changes', async () => {
    const node1 = createNodeWithClasses('class-1 class-2');
    const node2 = createNodeWithClasses('class-3');

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node1);
    await view.updateComplete;
    assert.deepEqual(
        [...view.contentElement.querySelectorAll('devtools-checkbox')].map(c => c.title),
        ['class-1', 'class-2'],
    );

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node2);
    await view.updateComplete;
    assert.deepEqual(
        [...view.contentElement.querySelectorAll('devtools-checkbox')].map(c => c.title),
        ['class-3'],
    );
  });

  it('clears rendered classes when selected node becomes null', async () => {
    const node = createNodeWithClasses('class-1 class-2');

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;
    assert.lengthOf(view.contentElement.querySelectorAll('devtools-checkbox'), 2);

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
    await view.updateComplete;
    assert.lengthOf(view.contentElement.querySelectorAll('devtools-checkbox'), 0);
  });

  it('renders the classes of a node selected while the pane was hidden when shown again', async () => {
    const node1 = createNodeWithClasses('class-1');
    const node2 = createNodeWithClasses('class-2');

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node1);
    await view.updateComplete;

    view.detach();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node2);

    renderElementIntoDOM(view);
    assert.deepEqual(
        [...view.contentElement.querySelectorAll('devtools-checkbox')].map(c => c.title),
        ['class-2'],
    );
  });

  it('attaches the prompt only once across re-renders', async () => {
    const attachSpy = sinon.spy(Elements.ClassesPaneWidget.ClassNamePrompt.prototype, 'attach');
    const node = createNodeWithClasses('class-1');

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;
    node.domModel().dispatchEventToListeners(SDK.DOMModel.Events.DOMMutated, node);
    await view.updateComplete;
    view.detach();
    renderElementIntoDOM(view);
    await view.updateComplete;

    sinon.assert.calledOnce(attachSpy);
  });

  it('toggles class on checkbox click', async () => {
    const node = createNodeWithClasses('class-1 class-2');
    const setAttributeStub = sinon.stub(node, 'setAttributeValuePromise');
    const setAttributeCalled = expectCall(setAttributeStub, {
      fakeFn: (_name: string, _value: string) => Promise.resolve(null),
    });

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;

    const checkbox = [...view.contentElement.querySelectorAll('devtools-checkbox')].find(c => c.title === 'class-1');
    assert.exists(checkbox);
    checkbox.click();
    await setAttributeCalled;
    await view.updateComplete;

    assert.isFalse(checkbox.checked);
    sinon.assert.calledOnceWithExactly(setAttributeStub, 'class', 'class-2');
  });

  it('re-checks an unchecked checkbox when the class is re-added to the node externally', async () => {
    const node = createNodeWithClasses('class-1 class-2');
    const setAttributeCalled = expectCall(sinon.stub(node, 'setAttributeValuePromise'), {
      fakeFn: (_name: string, _value: string) => Promise.resolve(null),
    });

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;

    const checkbox = [...view.contentElement.querySelectorAll('devtools-checkbox')].find(c => c.title === 'class-1');
    assert.exists(checkbox);
    checkbox.click();
    await setAttributeCalled;
    await view.updateComplete;
    assert.isFalse(checkbox.checked);

    // The page re-adds `class-1` (getAttribute still reports it), which is surfaced as a DOM mutation.
    node.domModel().dispatchEventToListeners(SDK.DOMModel.Events.DOMMutated, node);
    await view.updateComplete;

    const updatedCheckbox =
        [...view.contentElement.querySelectorAll('devtools-checkbox')].find(c => c.title === 'class-1');
    assert.exists(updatedCheckbox);
    assert.isTrue(updatedCheckbox.checked);
  });

  it('adds classes and clears prompt on Enter', async () => {
    const node = createNodeWithClasses('existing-class');
    const setAttributeStub = sinon.stub(node, 'setAttributeValuePromise');
    const setAttributeCalled = expectCall(setAttributeStub, {
      fakeFn: (_name: string, _value: string) => Promise.resolve(null),
    });

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;

    const input = view.contentElement.querySelector<HTMLElement>('.new-class-input');
    assert.exists(input);

    input.textContent = 'added-1 added-2';
    dispatchKeyDownEvent(input, {key: 'Enter', bubbles: true});
    await setAttributeCalled;
    await view.updateComplete;

    assert.strictEqual(input.textContent, '');
    sinon.assert.calledOnceWithExactly(setAttributeStub, 'class', 'added-1 added-2 existing-class');
    assert.deepEqual(
        [...view.contentElement.querySelectorAll('devtools-checkbox')].map(c => c.title),
        ['added-1', 'added-2', 'existing-class'],
    );
  });

  it('clears prompt without adding classes on Escape', async () => {
    const node = createNodeWithClasses('existing-class');
    const setAttributeStub = sinon.stub(node, 'setAttributeValuePromise');
    const setAttributeCalled = expectCall(setAttributeStub, {
      fakeFn: (_name: string, _value: string) => Promise.resolve(null),
    });

    renderClassesPaneWidget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await view.updateComplete;

    const input = view.contentElement.querySelector<HTMLElement>('.new-class-input');
    assert.exists(input);

    input.textContent = 'discarded-class';
    dispatchKeyDownEvent(input, {key: 'Escape', bubbles: true});
    await setAttributeCalled;
    await view.updateComplete;

    assert.strictEqual(input.textContent, '');
    sinon.assert.calledOnceWithExactly(setAttributeStub, 'class', 'existing-class');
    assert.deepEqual(
        [...view.contentElement.querySelectorAll('devtools-checkbox')].map(c => c.title),
        ['existing-class'],
    );
  });

  it('clears uncommitted prompt text and restores committed classes on previous node when selected node changes',
     async () => {
       const node1 = createNodeWithClasses('class-1');
       const setAttributeStub1 = sinon.stub(node1, 'setAttributeValuePromise');
       const setAttributeCalled1 = expectCall(setAttributeStub1, {
         fakeFn: (_name: string, _value: string) => Promise.resolve(null),
       });
       const node2 = createNodeWithClasses('class-2');

       renderClassesPaneWidget();
       UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node1);
       await view.updateComplete;

       const input = view.contentElement.querySelector<HTMLElement>('.new-class-input');
       assert.exists(input);
       input.textContent = 'pending-class';

       UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node2);
       await setAttributeCalled1;
       await view.updateComplete;

       assert.strictEqual(input.textContent, '');
       sinon.assert.calledOnceWithExactly(setAttributeStub1, 'class', 'class-1');
     });

  describe('DEFAULT_VIEW', () => {
    function renderView() {
      const input = {
        classes: [],
        onCommit: sinon.stub(),
        onCancel: sinon.stub().returns(false),
        onClick: sinon.stub(),
      };
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      Elements.ClassesPaneWidget.DEFAULT_VIEW(input, {}, container);
      const promptElement = container.querySelector<HTMLElement>('.new-class-input');
      assert.exists(promptElement);
      return {input, promptElement};
    }

    it('calls onCommit on Enter', () => {
      const {input, promptElement} = renderView();
      dispatchKeyDownEvent(promptElement, {key: 'Enter', bubbles: true});
      sinon.assert.calledOnce(input.onCommit);
    });

    it('does not call onCommit on Enter while an IME composition is in progress', () => {
      const {input, promptElement} = renderView();
      dispatchKeyDownEvent(promptElement, {key: 'Enter', isComposing: true, bubbles: true});
      sinon.assert.notCalled(input.onCommit);
    });
  });

  describe('ClassNamePrompt', () => {
    let domModel: SDK.DOMModel.DOMModel;
    let cssModel: SDK.CSSModel.CSSModel;
    let node: SDK.DOMModel.DOMNode;

    beforeEach(() => {
      const model = target.model(SDK.DOMModel.DOMModel);
      assert.exists(model);
      domModel = model;

      const css = domModel.cssModel();
      assert.exists(css);
      cssModel = css;

      node = new SDK.DOMModel.DOMNode(domModel);
      node.ownerDocument = {id: 1 as Protocol.DOM.NodeId} as SDK.DOMModel.DOMDocument;
      sinon.stub(node, 'frameId').returns('main-frame' as Protocol.Page.FrameId);
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

      sinon.stub(cssModel, 'allStyleSheets').returns([
        {id: 'stylesheet1' as Protocol.DOM.StyleSheetId, frameId: 'main-frame' as Protocol.Page.FrameId} as
            SDK.CSSStyleSheetHeader.CSSStyleSheetHeader,
      ]);
      sinon.stub(cssModel, 'getClassNames').withArgs('stylesheet1' as Protocol.DOM.StyleSheetId).resolves([
        'b',
        'abc',
        'a1',
        'a2',
      ]);
      sinon.stub(domModel, 'classNamesPromise').resolves([]);
    });

    function stubSuggestBox() {
      const {resolve, promise} = Promise.withResolvers<UI.SuggestBox.Suggestions>();
      const suggestBoxStub = sinon.stub(UI.SuggestBox.SuggestBox.prototype, 'updateSuggestions');
      suggestBoxStub.callsFake((_, suggestions) => {
        suggestBoxStub.restore();
        resolve(suggestions);
      });
      return promise;
    }

    async function getCompletions(text: string,
                                  nodeClasses: Map<string, boolean> = new Map<string, boolean>()): Promise<string[]> {
      const suggestBoxPromise = stubSuggestBox();
      const prompt = new Elements.ClassesPaneWidget.ClassNamePrompt(() => nodeClasses);
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      prompt.attachAndStartEditing(div);
      prompt.setText(text);
      await prompt.complete();
      const completions = await suggestBoxPromise;
      return completions.map(c => c.text);
    }

    it('shows completions matching dot prefix in alphabetical order', async () => {
      const texts = await getCompletions('.');
      assert.deepEqual(texts, ['.a1', '.a2', '.abc', '.b']);
    });

    it('shows completions matching class name prefix in alphabetical order', async () => {
      const texts = await getCompletions('a');
      assert.deepEqual(texts, ['a1', 'a2', 'abc']);
    });

    it('filters out classes already present on the selected node', async () => {
      sinon.stub(node, 'getAttribute').withArgs('class').returns('abc');
      const texts = await getCompletions('a', new Map([['abc', true]]));
      assert.deepEqual(texts, ['a1', 'a2']);
    });

    it('filters out classes already present in the prompt', async () => {
      const texts = await getCompletions('a1 a');
      assert.deepEqual(texts, ['a2', 'abc']);
    });

    it('filters out dot-prefixed classes already present in the prompt', async () => {
      const texts = await getCompletions('.a1 .a');
      assert.deepEqual(texts, ['.a2', '.abc']);
    });
  });
});
