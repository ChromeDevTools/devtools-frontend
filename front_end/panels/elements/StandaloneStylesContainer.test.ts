// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {
  getMatchedStyles,
  getMatchedStylesWithProperties,
  ruleMatch,
} from '../../testing/StyleHelpers.js';

import * as Elements from './elements.js';

describeWithMockConnection('StandaloneStylesContainer', () => {
  let target: SDK.Target.Target;
  let cssModel: SDK.CSSModel.CSSModel;
  let node: SDK.DOMModel.DOMNode;

  beforeEach(() => {
    target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    cssModel = domModel.cssModel()!;

    node = new SDK.DOMModel.DOMNode(domModel);
    node.init(null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'div',
      localName: 'div',
      nodeValue: '',
      attributes: [],
    });
  });

  async function setupContainer(properties: Array<{name: string, value: string}> = []) {
    const matchedStyles = await getMatchedStylesWithProperties({cssModel, node, properties, selector: 'div'});
    sinon.stub(cssModel, 'cachedMatchedCascadeForNode').resolves(matchedStyles);
    const container = new Elements.StandaloneStylesContainer.StandaloneStylesContainer();
    renderElementIntoDOM(container);

    const updatePromise = new Promise<void>(resolve => {
      container.addEventListener(
          Elements.StandaloneStylesContainer.Events.STYLES_UPDATE_COMPLETED, () => resolve(), {once: true});
    });

    container.domNode = node;
    await updatePromise;
    return {container, matchedStyles};
  }

  it('should render the component with a single section and properties', async () => {
    const {container} = await setupContainer([
      {name: 'color', value: 'red'},
      {name: 'font-size', value: '14px'},
    ]);

    container.element.style.width = 'var(--sys-size-20)';
    container.element.style.height = 'var(--sys-size-18)';

    await assertScreenshot('elements/standalone-styles-container.png');
  });

  it('should perform full rebuild when CSS model changes without an edit', async () => {
    const {container} = await setupContainer();
    const initialSections = container.allSections();
    const discardSpy = sinon.spy(cssModel, 'discardCachedMatchedCascade');

    const updatePromise = new Promise<void>(resolve => {
      container.addEventListener(
          Elements.StandaloneStylesContainer.Events.STYLES_UPDATE_COMPLETED, () => resolve(), {once: true});
    });

    container.computedStyleModel().dispatchEventToListeners(
        ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, undefined);

    await updatePromise;
    sinon.assert.called(discardSpy);

    const newSections = container.allSections();
    assert.notStrictEqual(newSections, initialSections, 'Sections array was not replaced');
    assert.notStrictEqual(newSections[0], initialSections[0], 'Section objects were not recreated');
  });

  it('should perform full rebuild when domNode changes', async () => {
    const {container} = await setupContainer();
    const initialSections = container.allSections();
    const discardSpy = sinon.spy(cssModel, 'discardCachedMatchedCascade');

    // Create a new node to switch to
    const node2 = new SDK.DOMModel.DOMNode(node.domModel());
    node2.init(null, false, {
      nodeId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'span',
      localName: 'span',
      nodeValue: '',
      attributes: [],
    });

    const updatePromise = new Promise<void>(resolve => {
      container.addEventListener(
          Elements.StandaloneStylesContainer.Events.STYLES_UPDATE_COMPLETED, () => resolve(), {once: true});
    });

    container.domNode = node2;

    await updatePromise;
    sinon.assert.called(discardSpy);
    assert.notStrictEqual(
        container.allSections(), initialSections, 'Sections should have been recreated for the new node');
  });

  it('should update underlying model when applyStyleText is called', async () => {
    const {container, matchedStyles} = await setupContainer([{name: 'color', value: 'red'}]);
    const style = matchedStyles.nodeStyles()[0];
    style.styleSheetId = '1' as Protocol.DOM.StyleSheetId;
    style.range = new TextUtils.TextRange.TextRange(0, 0, 10, 10);
    style.allProperties()[0].range = new TextUtils.TextRange.TextRange(0, 0, 1, 10);

    const setStyleTextsHandler = sinon.spy((params: Protocol.CSS.SetStyleTextsRequest) => {
      assert.strictEqual(params.edits[0].styleSheetId, '1');
      assert.include(params.edits[0].text, 'color: blue');
      return {
        styles: [],
      };
    });
    setMockConnectionResponseHandler('CSS.setStyleTexts', setStyleTextsHandler);

    const treeElement = container.allSections()[0].propertiesTreeOutline.firstChild() as
        Elements.StylePropertyTreeElement.StylePropertyTreeElement;

    await treeElement.applyStyleText('color: blue', true);

    sinon.assert.calledOnce(setStyleTextsHandler);
  });

  it('should dispatch update event and reposition popover on manual refresh', async () => {
    const {container} = await setupContainer([{name: 'color', value: 'red'}]);
    const repositionSpy = sinon.spy(container.swatchPopoverHelper(), 'reposition');

    container.refreshUpdate(container.allSections()[0]);

    await container.updateComplete;
    sinon.assert.calledOnce(repositionSpy);
  });

  it('should render only matching sections from the DOM when a filter is applied', async () => {
    const matchedStyles = await getMatchedStyles({
      cssModel,
      node,
      matchedPayload: [
        ruleMatch('.match', {color: 'red'}),
        ruleMatch('.no-match', {color: 'blue'}),
      ],
    });
    sinon.stub(cssModel, 'cachedMatchedCascadeForNode').resolves(matchedStyles);
    const container = new Elements.StandaloneStylesContainer.StandaloneStylesContainer();
    renderElementIntoDOM(container);

    const updatePromise = new Promise<void>(resolve => {
      container.addEventListener(
          Elements.StandaloneStylesContainer.Events.STYLES_UPDATE_COMPLETED, () => resolve(), {once: true});
    });
    container.domNode = node;
    await updatePromise;

    assert.lengthOf(container.contentElement.querySelectorAll('.styles-section'), 2);

    container.filter = /\.match/;
    await container.updateComplete;

    const sections = container.contentElement.querySelectorAll('.styles-section');
    assert.lengthOf(sections, 1);
    assert.include(sections[0].textContent, '.match');
    assert.notInclude(sections[0].textContent, '.no-match');
  });

  it('should restore sections to the DOM when the filter is cleared', async () => {
    const matchedStyles = await getMatchedStyles({
      cssModel,
      node,
      matchedPayload: [
        ruleMatch('.match', {color: 'red'}),
        ruleMatch('.no-match', {color: 'blue'}),
      ],
    });
    sinon.stub(cssModel, 'cachedMatchedCascadeForNode').resolves(matchedStyles);
    const container = new Elements.StandaloneStylesContainer.StandaloneStylesContainer();
    renderElementIntoDOM(container);

    const updatePromise = new Promise<void>(resolve => {
      container.addEventListener(
          Elements.StandaloneStylesContainer.Events.STYLES_UPDATE_COMPLETED, () => resolve(), {once: true});
    });
    container.domNode = node;
    await updatePromise;

    container.filter = /\.match/;
    await container.updateComplete;
    assert.lengthOf(container.contentElement.querySelectorAll('.styles-section'), 1);

    container.filter = null;
    await container.updateComplete;
    assert.lengthOf(container.contentElement.querySelectorAll('.styles-section'), 2);
  });

  it('should refresh all sections when computed styles change', async () => {
    const {container} = await setupContainer([{name: 'color', value: 'red'}]);
    const updatePromise = spyCall(container, 'performUpdate');

    container.computedStyleModel().dispatchEventToListeners(
        ComputedStyle.ComputedStyleModel.Events.COMPUTED_STYLE_CHANGED);

    await updatePromise;
  });
});
