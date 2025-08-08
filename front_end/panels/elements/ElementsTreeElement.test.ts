// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../front_end/ui/legacy/legacy.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

import * as Elements from './elements.js';

describe('ElementsTreeElement', () => {
  describe('convertUnicodeCharsToHTMLEntities', () => {
    it('converts unicode characters to HTML entities', () => {
      const input = '\u2002\u2002This string has spaces\xA0\xA0and other\u202Aunicode characters\u200A.';
      const expected = {
        text: '&ensp;&ensp;This string has spaces&nbsp;&nbsp;and other&#x202A;unicode characters&hairsp;.',
        entityRanges: [
          new TextUtils.TextRange.SourceRange(0, 6),
          new TextUtils.TextRange.SourceRange(6, 6),
          new TextUtils.TextRange.SourceRange(34, 6),
          new TextUtils.TextRange.SourceRange(40, 6),
          new TextUtils.TextRange.SourceRange(55, 8),
          new TextUtils.TextRange.SourceRange(81, 8),
        ],
      };

      const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(input);
      assert.strictEqual(result.text, expected.text);
      assert.deepEqual(result.entityRanges, expected.entityRanges);
    });

    it('returns the original string if no unicode characters are present', () => {
      const input = 'ThisStringHasNoWhitespace';
      const expected = {
        text: 'ThisStringHasNoWhitespace',
        entityRanges: [],
      };

      const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(input);
      assert.strictEqual(result.text, expected.text);
      assert.deepEqual(result.entityRanges, expected.entityRanges);
    });
  });
});

describeWithMockConnection('ElementsTreeElement', () => {
  let nodeIdCounter = 0;
  function getTreeElement(model: SDK.DOMModel.DOMModel, treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline) {
    const node = new SDK.DOMModel.DOMNode(model);
    node.id = nodeIdCounter++ as Protocol.DOM.NodeId;
    model.registerNode(node);
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    node.setAttributesPayload(['popover', 'manual']);
    treeOutline.bindTreeElement(treeElement);
    return treeElement;
  }

  async function getAdorner(treeElement: Elements.ElementsTreeElement.ElementsTreeElement) {
    await treeElement.updateStyleAdorners();
    const {tagTypeContext} = treeElement;
    const adorners = 'adorners' in tagTypeContext ? tagTypeContext.adorners : undefined;
    assert.exists(adorners);
    assert.lengthOf(adorners, 1);
    const {value} = adorners.values().next();
    assert.exists(value);
    assert.strictEqual(value.name, 'popover');
    return value;
  }

  beforeEach(() => {
    updateHostConfig({devToolsAllowPopoverForcing: {enabled: true}});
    setMockConnectionResponseHandler('CSS.enable', () => ({}));
    setMockConnectionResponseHandler('CSS.getComputedStyleForNode', () => ({}));
  });
  it('popoverAdorner supports force-opening popovers', async () => {
    const model = new SDK.DOMModel.DOMModel(createTarget());

    const responseHandlerStub = sinon.stub<[Protocol.DOM.ForceShowPopoverRequest]>();
    setMockConnectionResponseHandler('DOM.forceShowPopover', responseHandlerStub);

    const treeElement = getTreeElement(model, new Elements.ElementsTreeOutline.ElementsTreeOutline());
    const adorner = await getAdorner(treeElement);
    adorner.dispatchEvent(new MouseEvent('click'));
    sinon.assert.calledOnce(responseHandlerStub);
    assert.isTrue(responseHandlerStub.args[0][0].enable);
    assert.strictEqual(responseHandlerStub.args[0][0].nodeId, treeElement.node().id);

    adorner.dispatchEvent(new MouseEvent('click'));
    sinon.assert.calledTwice(responseHandlerStub);
    assert.isFalse(responseHandlerStub.args[1][0].enable);
    assert.strictEqual(responseHandlerStub.args[1][0].nodeId, treeElement.node().id);
  });

  it('popoverAdorner gets toggled off when a popover is force-closed by another forceShowPopover call', async () => {
    const model = new SDK.DOMModel.DOMModel(createTarget());
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement1 = getTreeElement(model, treeOutline);
    const treeElement2 = getTreeElement(model, treeOutline);

    const adorner1 = await getAdorner(treeElement1);
    const adorner2 = await getAdorner(treeElement2);

    setMockConnectionResponseHandler(
        'DOM.forceShowPopover', () => ({nodeIds: adorner2.isActive() ? [treeElement2.node().id] : []}));

    adorner2.dispatchEvent(new MouseEvent('click'));
    assert.isTrue(adorner2.isActive());

    const toggleStub = spyCall(adorner2, 'toggle');

    adorner1.dispatchEvent(new MouseEvent('click'));
    await toggleStub;
    assert.isTrue(adorner1.isActive());
    assert.isFalse(adorner2.isActive());
  });
});

describeWithMockConnection('ElementsTreeElement ', () => {
  const DEFAULT_LAYOUT_PROPERTIES = {
    isFlex: false,
    isGrid: false,
    isSubgrid: false,
    isMasonry: false,
    isContainer: false,
    hasScroll: false,
  };

  beforeEach(() => {
    updateHostConfig({
      devToolsAiSubmenuPrompts: {
        enabled: true,
      },
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'freestyler.element-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    });
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.reset();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
  });

  async function getContextMenuForElementWithLayoutProperties(layoutProperties: SDK.CSSModel.LayoutProperties|null):
      Promise<UI.ContextMenu.ContextMenu> {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(domModel);
    assert.exists(cssModel);

    sinon.stub(cssModel, 'getLayoutPropertiesFromComputedStyle').resolves(layoutProperties);

    const node = new SDK.DOMModel.DOMNode(domModel);
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    const event = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    await treeElement.populateNodeContextMenu(contextMenu);
    return contextMenu;
  }

  it('shows default submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(null);
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label), ['Start a chat', 'Assess visibility', 'Center element']);
  });

  it('shows flexbox submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isFlex: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Wrap these items', 'Distribute items evenly', 'Explain flexbox']);
  });

  it('shows grid submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isGrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Align items', 'Add padding', 'Explain grid layout']);
  });

  it('shows subgrid submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(
        {...DEFAULT_LAYOUT_PROPERTIES, isGrid: true, isSubgrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Find grid definition', 'Change parent properties', 'Explain subgrids']);
  });

  it('shows scroll submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, hasScroll: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Remove scrollbars', 'Style scrollbars', 'Explain scrollbars']);
  });

  it('shows container submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isContainer: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Explain container queries', 'Explain container types', 'Explain container context']);
  });
});
