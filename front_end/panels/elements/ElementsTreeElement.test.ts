// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {findMenuItemWithLabel} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, registerActions} from '../../testing/EnvironmentHelpers.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import * as Elements from './elements.js';

function getBaseViewInput(): Elements.ElementsTreeElement.ViewInput {
  return {
    node: null,
    isClosingTag: false,
    expanded: false,
    isExpandable: false,
    isXMLMimeType: false,
    updateRecord: null,
    onHighlightSearchResults: () => {},
    onExpand: () => {},
    containerAdornerActive: false,
    showContainerAdorner: false,
    showFlexAdorner: false,
    flexAdornerActive: false,
    showGridAdorner: false,
    showGridLanesAdorner: false,
    showMediaAdorner: false,
    showPopoverAdorner: false,
    showInterestAdorner: false,
    showTopLayerAdorner: false,
    gridAdornerActive: false,
    popoverAdornerActive: false,
    interestAdornerActive: false,
    isSubgrid: false,
    showViewSourceAdorner: false,
    showScrollAdorner: false,
    showScrollSnapAdorner: false,
    scrollSnapAdornerActive: false,
    showSlotAdorner: false,
    showCustomElementAdorner: false,
    showStartingStyleAdorner: false,
    startingStyleAdornerActive: false,
    onStartingStyleAdornerClick: () => {},
    onSlotAdornerClick: () => {},
    onCustomElementAdornerClick: () => {},
    topLayerIndex: -1,
    onViewSourceAdornerClick: () => {},
    onGutterClick: () => {},
    onContainerAdornerClick: () => {},
    onFlexAdornerClick: () => {},
    onGridAdornerClick: () => {},
    onMediaAdornerClick: () => {},
    onPopoverAdornerClick: () => {},
    onInterestAdornerClick: () => {},
    onScrollSnapAdornerClick: () => {},
    onTopLayerAdornerClick: () => {},
    isHovered: false,
    isSelected: false,
    canInspect: false,
    showAiButton: false,
    onAiButtonClick: () => {},
    decorations: [],
    descendantDecorations: [],
    decorationsTooltip: '',
    indent: 0,
    adTooltipId: '',
    editorState: null,
    editorWidth: null,
  };
}

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

  it('renders gutter decorations correctly', async () => {
    const target = document.createElement('div');
    target.style.width = '100px';
    target.style.height = '20px';
    const style = document.createElement('style');
    // FIXME: styles are currently external to ElementsTreeElement.
    style.innerText = Elements.ElementsTreeOutline.elementsTreeOutlineStyles;
    target.append(style);
    renderElementIntoDOM(target, {
      includeCommonStyles: true,
    });
    const decorations = [
      {title: 'Decoration 1', color: 'red'},
      {title: 'Decoration 2', color: 'blue'},
    ];
    const descendantDecorations = [
      {title: 'Descendant 1', color: 'green'},
    ];
    Elements.ElementsTreeElement.DEFAULT_VIEW({
      ...getBaseViewInput(),
      decorations,
      descendantDecorations,
      decorationsTooltip: 'Title',
      indent: 20,
    },
                                              {}, target);
    await assertScreenshot('elements/gutter_decorations.png');
  });
});

describeWithEnvironment('ElementsTreeElement', () => {
  const DEFAULT_LAYOUT_PROPERTIES = {
    isFlex: false,
    isGrid: false,
    isSubgrid: false,
    isGridLanes: false,
    containerType: undefined,
    hasScroll: false,
  };

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    registerActions([{
      actionId: 'freestyler.element-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    }]);
  });

  describe('Ad Adorner Tooltip', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
      sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
      sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(universe.ignoreListManager);

      target = universe.createTarget();
    });

    it('renders fallback tooltip when no provenance is available', () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        adTooltipId: 'ad-tooltip-test',
        target,
        adProvenance: {},
      },
                                                {}, domTarget);

      const adorners = domTarget.querySelectorAll('devtools-adorner');
      const adorner = Array.from(adorners).find(a => a.name === 'ad');
      assert.exists(adorner);
      const tooltip = domTarget.querySelector('devtools-tooltip');
      assert.exists(tooltip);
      assert.strictEqual(tooltip.querySelector('.ad-provenance-tooltip-title')?.textContent,
                         'No provenance data is available');
    });

    it('renders filter list rule', () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        adTooltipId: 'ad-tooltip-test',
        target,
        adProvenance: {filterlistRule: '||ads.com^'},
      },
                                                {}, domTarget);

      const tooltip = domTarget.querySelector('devtools-tooltip');
      assert.exists(tooltip);
      const title = tooltip.querySelector('.ad-provenance-tooltip-title');
      const content = tooltip.querySelector('.ad-provenance-tooltip-content');
      assert.strictEqual(title?.textContent, 'Filter list rule');
      assert.strictEqual(content?.textContent, '||ads.com^');
    });

    it('renders script ancestry with root script rules', async () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);

      // Mock the script parsing event so the Linkifier knows about this scriptId.
      const scriptId = '123' as Protocol.Runtime.ScriptId;
      const debuggerId = '' as Protocol.Runtime.UniqueDebuggerId;

      const scriptParsedEvent: Protocol.Debugger.ScriptParsedEvent = {
        scriptId,
        url: 'https://www.example.com/ad-script.js',
        startLine: 0,
        startColumn: 0,
        endLine: 10,
        endColumn: 10,
        executionContextId: 1234 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
      };
      dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

      // Render the view.
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        adTooltipId: 'ad-tooltip-test',
        target,
        adProvenance: {
          adScriptAncestry: {
            ancestryChain: [{scriptId, debuggerId, name: ''}],
            rootScriptFilterlistRule: '/ad-script.$script',
          },
        },
      },
                                                {}, domTarget);

      // Wait for the asynchronous Linkifier to render the script name.
      await raf();

      const tooltip = domTarget.querySelector('devtools-tooltip');
      assert.exists(tooltip);

      const titles = Array.from(tooltip.querySelectorAll('.ad-provenance-tooltip-title')).map(el => el.textContent);
      assert.deepEqual(titles, ['Creator ad script ancestry', 'Root script filter list rule']);

      // Assert that the Linkifier correctly resolved the script URL to a short name.
      const link = tooltip.querySelector('.devtools-link');
      assert.exists(link);
      assert.strictEqual(link.textContent?.trim(), 'ad-script.js:1');

      const contents =
          Array.from(tooltip.querySelectorAll('.ad-provenance-tooltip-content')).map(el => el.textContent?.trim());
      assert.include(contents[1], '/ad-script.$script');
    });
  });

  describe('Relation Attributes', () => {
    let target: SDK.Target.Target;
    let domModel: SDK.DOMModel.DOMModel;

    beforeEach(() => {
      target = createTarget();
      domModel = target.model(SDK.DOMModel.DOMModel)!;
    });

    it('renders empty relation attribute without quotes if no relation', async () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);

      const node = new SDK.DOMModel.DOMNode(domModel);
      sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
      sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
      sinon.stub(node, 'nodeName').returns('DIV');
      sinon.stub(node, 'hasAttributes').returns(true);
      sinon.stub(node, 'attributes').returns([{name: 'popovertarget', value: ''}] as SDK.DOMModel.Attribute[]);

      sinon.stub(domModel, 'getElementByRelation').resolves(undefined);

      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        node,
      },
                                                {}, domTarget);

      await raf();  // Wait for directive to run

      const attributeElement = domTarget.querySelector('.webkit-html-attribute');
      assert.exists(attributeElement);

      const nameElement = attributeElement.querySelector('.webkit-html-attribute-name');
      assert.exists(nameElement);
      assert.strictEqual(nameElement.textContent, 'popovertarget');

      // Should NOT have quotes or equals
      assert.notInclude(attributeElement.textContent || '', '=');
      assert.notInclude(attributeElement.textContent || '', '"');
    });

    it('renders empty relation attribute and linkifies it if relation exists', async () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);

      const node = new SDK.DOMModel.DOMNode(domModel);
      node.id = 1 as Protocol.DOM.NodeId;
      sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
      sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
      sinon.stub(node, 'nodeName').returns('DIV');
      sinon.stub(node, 'hasAttributes').returns(true);
      sinon.stub(node, 'attributes').returns([{name: 'popovertarget', value: ''}] as SDK.DOMModel.Attribute[]);

      const relatedNodeId = 2 as Protocol.DOM.NodeId;
      const relatedNode = new SDK.DOMModel.DOMNode(domModel);
      sinon.stub(domModel, 'getElementByRelation').resolves(relatedNodeId);
      sinon.stub(domModel, 'nodeForId').withArgs(relatedNodeId).returns(relatedNode);

      const fakeLink = html`<span>LINKIFIED_TARGET</span>`;
      const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(fakeLink);

      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        node,
      },
                                                {}, domTarget);

      await raf();  // Wait for directive to run

      const attributeElement = domTarget.querySelector('.webkit-html-attribute');
      assert.exists(attributeElement);

      // With Philip's model, we linkify the name!
      const nameElement = attributeElement.querySelector('.webkit-html-attribute-name');
      assert.exists(nameElement);

      // Wait for async linkify to finish rendering
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.include(nameElement.textContent || '', 'LINKIFIED_TARGET');

      // Value element should NOT exist
      const valueElement = attributeElement.querySelector('.webkit-html-attribute-value');
      assert.notExists(valueElement);

      sinon.assert.calledOnce(linkifyStub);
      const linkOptions = linkifyStub.firstCall.args[1] as PanelsCommon.DOMLinkifier.Options;
      assert.strictEqual(linkOptions.textContent, 'popovertarget');
    });

    it('renders relation attribute with value and linkifies it', async () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);

      const node = new SDK.DOMModel.DOMNode(domModel);
      node.id = 1 as Protocol.DOM.NodeId;
      sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
      sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
      sinon.stub(node, 'nodeName').returns('DIV');
      sinon.stub(node, 'hasAttributes').returns(true);
      sinon.stub(node, 'attributes').returns([{name: 'popovertarget',
                                               value: 'targetNode'}] as SDK.DOMModel.Attribute[]);

      const relatedNodeId = 2 as Protocol.DOM.NodeId;
      const relatedNode = new SDK.DOMModel.DOMNode(domModel);
      sinon.stub(domModel, 'getElementByRelation').resolves(relatedNodeId);
      sinon.stub(domModel, 'nodeForId').withArgs(relatedNodeId).returns(relatedNode);

      const fakeLink = html`<span>LINKIFIED_TARGET</span>`;
      const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(fakeLink);

      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        node,
      },
                                                {}, domTarget);

      await raf();  // Wait for directive to run

      const attributeElement = domTarget.querySelector('.webkit-html-attribute');
      assert.exists(attributeElement);

      const valueElement = attributeElement.querySelector('.webkit-html-attribute-value');
      assert.exists(valueElement);

      // Wait for async linkify to finish rendering
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.include(valueElement.textContent || '', 'LINKIFIED_TARGET');
      sinon.assert.calledOnce(linkifyStub);
    });
  });

  async function getContextMenuForElementWithLayoutProperties(layoutProperties: SDK.CSSModel.LayoutProperties|
                                                              null): Promise<UI.ContextMenu.ContextMenu> {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(domModel);
    assert.exists(cssModel);

    sinon.stub(cssModel, 'getLayoutPropertiesFromComputedStyle').resolves(layoutProperties);

    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    const event = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    await Elements.DOMTreeContextMenu.populateNodeContextMenu(contextMenu, treeElement);
    return contextMenu;
  }

  it('shows default submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(null);
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label),
                     ['Start a chat', 'Assess visibility', 'Center element']);
  });

  it('shows flexbox submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isFlex: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label),
                     ['Start a chat', 'Wrap these items', 'Distribute items evenly', 'Explain flexbox']);
  });

  it('shows grid submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isGrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label),
                     ['Start a chat', 'Align items', 'Add padding', 'Explain grid layout']);
  });

  it('shows subgrid submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(
        {...DEFAULT_LAYOUT_PROPERTIES, isGrid: true, isSubgrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label),
                     ['Start a chat', 'Find grid definition', 'Change parent properties', 'Explain subgrids']);
  });

  it('shows scroll submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, hasScroll: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(debugWithAiItem?.subItems?.map(item => item.label),
                     ['Start a chat', 'Remove scrollbars', 'Style scrollbars', 'Explain scrollbars']);
  });

  it('shows container submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(
        {...DEFAULT_LAYOUT_PROPERTIES, containerType: 'inline-size'});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Explain container queries', 'Explain container types', 'Explain container context']);
  });

  it('opens element state pane when forced state is clicked in context menu', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const buttonProvider = sinon.createStubInstance(Elements.ElementStatePaneWidget.ButtonProvider);
    sinon.stub(Elements.ElementStatePaneWidget.ButtonProvider, 'instance').returns(buttonProvider);

    const event = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const node = new SDK.DOMModel.DOMNode(domModel);
    Elements.ElementsTreeElement.ElementsTreeElement.populateForcedPseudoStateItems(contextMenu, node);

    const subMenu = findMenuItemWithLabel(contextMenu.debugSection(), 'Force state');
    assert.instanceOf(subMenu, UI.ContextMenu.SubMenu);
    const hoverItem = findMenuItemWithLabel(subMenu.defaultSection(), ':hover');
    assert.exists(hoverItem);

    contextMenu.invokeHandler(hoverItem.id());

    sinon.assert.calledOnce(buttonProvider.showPane);
  });

  it('updates when persistent overlay state changes', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    // Simulate binding to the tree
    treeElement.onbind();

    const requestUpdateSpy = sinon.spy(treeElement.widget, 'requestUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(requestUpdateSpy);

    // Simulate unbinding
    treeElement.onunbind();
    requestUpdateSpy.resetHistory();

    // Trigger event again
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, {enabled: false});

    sinon.assert.notCalled(requestUpdateSpy);
  });

  it('updates when persistent scroll snap overlay state changes', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    // Simulate binding to the tree
    treeElement.onbind();
    const requestUpdateSpy = sinon.spy(treeElement.widget, 'requestUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(requestUpdateSpy);

    // Simulate unbinding
    treeElement.onunbind();
    requestUpdateSpy.resetHistory();

    // Trigger event again
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, {enabled: false});

    sinon.assert.notCalled(requestUpdateSpy);
  });

  it('initializes the slot adorner if the node has an assigned slot', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    const shortcut = {
      deferredNode: {
        resolve: (callback: (node: SDK.DOMModel.DOMNode) => void) => {
          callback(node);
        },
        resolvePromise: () => Promise.resolve(node),
        backendNodeId: () => 1,
        highlight: () => {},
      },
    } as unknown as SDK.DOMModel.DOMNodeShortcut;
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();

    sinon.stub(node, 'hasAssignedSlot').returns(true);
    sinon.stub(node, 'assignedSlot').value(shortcut);

    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    // Simulate binding to the tree
    treeElement.onbind();

    treeElement.requestUpdate();
    await treeElement.updateComplete;

    const adorner = treeElement.widget.contentElement.querySelector('devtools-adorner');
    assert.exists(adorner);
    assert.strictEqual(adorner.name, 'slot');
  });

  it('renders STARTING_STYLE adorner when enabled', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    node.id = 1 as Protocol.DOM.NodeId;

    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();

    sinon.stub(node, 'affectedByStartingStyles').returns(true);

    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    treeElement.onbind();
    treeElement.requestUpdate();
    await treeElement.updateComplete;

    const adorner = treeElement.widget.contentElement.querySelector('.starting-style');
    assert.exists(adorner);

    const forceSpy = sinon.spy(cssModel, 'forceStartingStyle');
    (adorner as HTMLElement).click();
    sinon.assert.calledWith(forceSpy, node, true);

    (adorner as HTMLElement).click();
    sinon.assert.calledWith(forceSpy, node, false);
  });

  it('ensures in-place editing does not add or keep zero-width spaces when re-rendering is attempted (crbug.com/515639787)',
     async () => {
       const target = createTarget();
       const domModel = target.model(SDK.DOMModel.DOMModel);
       assert.exists(domModel);

       const nodePayload = {
         nodeId: 1 as Protocol.DOM.NodeId,
         backendNodeId: 2 as Protocol.DOM.BackendNodeId,
         nodeType: Node.ELEMENT_NODE,
         nodeName: 'DIV',
         localName: 'div',
         nodeValue: '',
         attributes: ['autofill-information', 'foo: test, bar: test'],
         childNodeCount: 0,
       };
       const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);

       const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
       const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
       treeElement.treeOutline = treeOutline;
       treeElement.onbind();

       // Render the element initially
       treeElement.requestUpdate();
       await treeElement.updateComplete;

       // The attribute container DOM initially contains zero-width spaces (inserted for wrapping by rendering)
       const attributeElement = treeElement.widget.contentElement.querySelector('.webkit-html-attribute');
       assert.exists(attributeElement);

       // Count initial zero-width spaces
       const initialSpacesCount = (attributeElement.textContent).split('\u200B').length - 1;
       assert.isAbove(initialSpacesCount, 0);

       // Start in-place editing of the attribute
       const editStarted = treeElement.triggerEditAttribute('autofill-information');
       assert.isTrue(editStarted);

       // Verify that starting edit stripped the zero-width spaces from the attribute element
       assert.notInclude(attributeElement.textContent, '\u200B');

       // While editing is active, call performUpdate (or hover, etc.) which would re-render
       treeElement.requestUpdate();
       await treeElement.updateComplete;

       // Verify that the attribute element STILL does not contain zero-width spaces.
       assert.notInclude(attributeElement.textContent, '\u200B');

       // Cancel the editing session and clean up
       treeElement.editingCancelled(attributeElement, 'autofill-information');
       await treeElement.updateComplete;

       // Re-query the newly rendered attribute element from the DOM
       const finalAttributeElement = treeElement.widget.contentElement.querySelector('.webkit-html-attribute');
       assert.exists(finalAttributeElement);

       // After cancelling, the element is restored, and the zero-width spaces should be restored back to initial count
       // (verifying no duplicate or redundant spaces are added/kept in the DOM)
       const finalSpacesCount = finalAttributeElement.textContent.split('\u200B').length - 1;
       assert.strictEqual(finalSpacesCount, initialSpacesCount);
     });

  it('truncates long data URL attribute values in the UI but shows them in full when editing', () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const longDataUrl = 'data:text/plain;,' +
        '1234567890'.repeat(10);
    const nodePayload = {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'A',
      localName: 'a',
      nodeValue: '',
      attributes: ['href', longDataUrl, 'id', 'inspected'],
      childNodeCount: 0,
    };
    const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
    // Stub resolveURL to return the URL as-is, which triggers DevTools linkification logic.
    sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`${url}`);

    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    treeElement.performUpdate();

    const attributeElement = treeElement.widget.contentElement.querySelector('.webkit-html-attribute');
    assert.exists(attributeElement);
    const attributeValueElement = attributeElement.querySelector('.webkit-html-attribute-value');
    assert.exists(attributeValueElement);

    // The expected trimmed value when rendered in the UI (with zero-width spaces stripped for comparison).
    // DevTools trims it to 60 characters (including ZWSPs).
    // "data:text/plain;,1234567890" (27 chars) + "…" (1 char) + "23456789012345678901234567890" (29 chars) = 57 chars
    const expectedTrimmedUrlClean = 'data:text/plain;,1234567890…23456789012345678901234567890';

    // We strip zero-width spaces from the actual text content to compare it with our clean expected value,
    // avoiding issues with invisible characters in the assertion.
    const cleanActualText = attributeValueElement.textContent?.trim().replace(/\u200B/g, '') ?? '';
    assert.strictEqual(cleanActualText, expectedTrimmedUrlClean);

    // Start editing the 'href' attribute.
    const editStarted = treeElement.triggerEditAttribute('href');
    assert.isTrue(editStarted);
    // When editing, the full, untrimmed value should be displayed without zero-width spaces.
    assert.strictEqual(attributeValueElement.textContent?.trim(), longDataUrl);

    // Cancel editing.
    treeElement.editingCancelled(attributeElement, 'href');

    // The value should be trimmed again.
    const attributeElementAfterCancel = treeElement.widget.contentElement.querySelector('.webkit-html-attribute');
    assert.exists(attributeElementAfterCancel);
    const attributeValueElementAfterCancel = attributeElementAfterCancel.querySelector('.webkit-html-attribute-value');
    assert.exists(attributeValueElementAfterCancel);
    const cleanActualTextAfterCancel =
        attributeValueElementAfterCancel.textContent?.trim().replace(/\u200B/g, '') ?? '';
    assert.strictEqual(cleanActualTextAfterCancel, expectedTrimmedUrlClean);
  });

  describe('Linkification', () => {
    let target: SDK.Target.Target;
    let domModel: SDK.DOMModel.DOMModel;

    beforeEach(() => {
      target = createTarget();
      domModel = target.model(SDK.DOMModel.DOMModel)!;
      assert.exists(domModel);
    });

    function renderTreeNode(node: SDK.DOMModel.DOMNode): Elements.ElementsTreeElement.ElementsTreeElement {
      const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
      treeElement.treeOutline = treeOutline;
      treeElement.performUpdate();
      return treeElement;
    }

    function getLinkOutputs(treeElement: Elements.ElementsTreeElement.ElementsTreeElement):
        Array<{text: string, href: string}> {
      const attributeValueElement = treeElement.widget.contentElement.querySelector('.webkit-html-attribute-value');
      assert.exists(attributeValueElement);
      const linkElements = Array.from(attributeValueElement.querySelectorAll('.devtools-link'));
      assert.isNotEmpty(linkElements, 'Expected to find .devtools-link elements');

      return linkElements.map(link => {
        const text = link.textContent?.trim().replace(/\u200B/g, '') ?? '';
        let href = '';
        if (link.tagName.toLowerCase() === 'devtools-link') {
          href = link.getAttribute('href') ?? '';
        } else {
          href = Components.Linkifier.Linkifier.linkInfo(link)?.url ?? '';
        }
        return {text, href};
      });
    }

    it('renders src attribute on img as a link', () => {
      const nodePayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'IMG',
        localName: 'img',
        nodeValue: '',
        attributes: ['src', 'image.png'],
        childNodeCount: 0,
      };
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
      sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`http://example.com/${url}`);

      const treeElement = renderTreeNode(node);
      const links = getLinkOutputs(treeElement);

      assert.lengthOf(links, 1);
      assert.deepEqual(links[0], {text: 'image.png', href: 'http://example.com/image.png'});
    });

    it('renders srcset attribute on img as multiple links', () => {
      const nodePayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'IMG',
        localName: 'img',
        nodeValue: '',
        attributes: ['srcset', '1x.png 1x, 2x.png 2x'],
        childNodeCount: 0,
      };
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
      sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`http://example.com/${url}`);

      const treeElement = renderTreeNode(node);
      const links = getLinkOutputs(treeElement);

      assert.lengthOf(links, 2);
      assert.deepEqual(links[0], {text: '1x.png', href: 'http://example.com/1x.png'});
      assert.deepEqual(links[1], {text: '2x.png', href: 'http://example.com/2x.png'});
    });

    it('renders href attribute on a as a devtools-link', () => {
      const nodePayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'A',
        localName: 'a',
        nodeValue: '',
        attributes: ['href', 'http://example.com'],
        childNodeCount: 0,
      };
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
      sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`${url}`);

      const treeElement = renderTreeNode(node);
      const links = getLinkOutputs(treeElement);

      assert.lengthOf(links, 1);
      assert.deepEqual(links[0], {text: 'http://example.com', href: 'http://example.com'});

      const attributeValueElement = treeElement.widget.contentElement.querySelector('.webkit-html-attribute-value');
      const linkElement = attributeValueElement?.querySelector('.devtools-link');
      assert.strictEqual(linkElement?.tagName.toLowerCase(), 'devtools-link');
    });

    it('renders href attribute on SVG image as a link', () => {
      const nodePayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'image',
        localName: 'image',
        nodeValue: '',
        attributes: ['href', 'image.png'],
        childNodeCount: 0,
      };
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
      sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`http://example.com/${url}`);

      const treeElement = renderTreeNode(node);
      const links = getLinkOutputs(treeElement);

      assert.lengthOf(links, 1);
      assert.deepEqual(links[0], {text: 'image.png', href: 'http://example.com/image.png'});
    });
  });
});

describeWithEnvironment('ElementsTreeElement highlighting', () => {
  let domModel: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;
  let containerNode: SDK.DOMModel.DOMNode;
  let attrTestNode: SDK.DOMModel.DOMNode;
  let childTestNode: SDK.DOMModel.DOMNode;
  let textTestNode: SDK.DOMModel.DOMNode;
  let attrTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let childTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let textTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let nodeId = 0;

  function createDOMNodePayload(name: string, attrs: Record<string, string> = {}): Protocol.DOM.Node {
    const attrList: string[] = [];
    for (const [key, value] of Object.entries(attrs)) {
      attrList.push(key, value);
    }
    return {
      nodeId: ++nodeId as Protocol.DOM.NodeId,
      backendNodeId: ++nodeId as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: name.toUpperCase(),
      localName: name,
      nodeValue: '',
      attributes: attrList,
      childNodeCount: 0,
    };
  }

  function createTextNodePayload(text: string): Protocol.DOM.Node {
    return {
      nodeId: ++nodeId as Protocol.DOM.NodeId,
      backendNodeId: ++nodeId as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: text,
      childNodeCount: 0,
    };
  }

  function createProcessingInstructionPayload(target: string, nodeValue: string): Protocol.DOM.Node {
    return {
      nodeId: ++nodeId as Protocol.DOM.NodeId,
      backendNodeId: ++nodeId as Protocol.DOM.BackendNodeId,
      nodeType: Node.PROCESSING_INSTRUCTION_NODE,
      nodeName: target,
      localName: '',
      nodeValue,
      childNodeCount: 0,
    };
  }

  beforeEach(async () => {
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    const target = universe.createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel)!;

    const containerPayload = createDOMNodePayload('div', {id: 'container'});
    const attrTestPayload = createDOMNodePayload('div', {id: 'attrTest', attrFoo: 'foo'});
    const childTestPayload = createDOMNodePayload('div', {id: 'childTest'});
    const textTestPayload = createDOMNodePayload('div', {id: 'textTest'});

    containerNode = SDK.DOMModel.DOMNode.create(domModel, null, false, containerPayload);
    containerNode.setChildrenPayload([attrTestPayload, childTestPayload, textTestPayload]);

    attrTestNode = containerNode.children()![0];
    childTestNode = containerNode.children()![1];
    textTestNode = containerNode.children()![2];

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    treeOutline.wireToDOMModel(domModel);

    const containerTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(containerNode);
    attrTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(attrTestNode);
    containerTreeElement.appendChild(attrTestTreeElement);
    childTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(childTestNode);
    containerTreeElement.appendChild(childTestTreeElement);
    textTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textTestNode);
    containerTreeElement.appendChild(textTestTreeElement);
    treeOutline.appendChild(containerTreeElement);

    treeOutline.setVisible(true);
    renderElementIntoDOM(treeOutline.element);
    containerTreeElement.expand();
  });

  afterEach(() => {
    treeOutline.removeChildren();
    treeOutline.setVisible(false);
  });

  let stub: sinon.SinonStub<[], void>|undefined;
  async function waitForHighlights(element: Elements.ElementsTreeElement.ElementsTreeElement) {
    stub?.restore();
    return await new Promise(resolve => {
      stub = sinon.stub(treeOutline, 'updateModifiedNodes');
      stub.callsFake(async () => {
        stub?.wrappedMethod.call(treeOutline);
        await element.updateComplete;
        resolve(element.widget.contentElement.querySelectorAll('.dom-update-highlight').length);
      });
    });
  }

  it('highlights attribute value change', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrFoo', 'bar');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights attribute set to empty', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrFoo', '');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights new attribute', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrBar', 'bar');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights attribute removal', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeRemoved(attrTestNode.id, 'attrFoo');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights appending child to an empty node', async () => {
    const highlights = waitForHighlights(childTestTreeElement);
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, child1Node);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights appending child to an expanded node', async () => {
    childTestTreeElement.expand();
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    childTestNode.setChildrenPayload([child1Payload]);
    const child1TreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(child1Node);
    childTestTreeElement.appendChild(child1TreeElement);

    const highlights = waitForHighlights(childTestTreeElement);
    const child2Payload = createDOMNodePayload('span', {id: 'child2'});
    const child2Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child2Payload);
    child2Node.parentNode = childTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, child2Node);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights child removal', async () => {
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    childTestNode.setChildrenPayload([child1Payload]);
    const child1TreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(child1Node);
    childTestTreeElement.appendChild(child1TreeElement);

    const highlights = waitForHighlights(childTestTreeElement);
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: child1Node, parent: childTestNode});
    assert.strictEqual(await highlights, 1);
  });

  it('highlights setting text content', async () => {
    const highlights = waitForHighlights(textTestTreeElement);
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textNode.parentNode = textTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, textNode);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights changing text node content', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.characterDataModified(textNode.id, 'Changed');
    assert.strictEqual(await highlights, 2);
  });

  it('highlights removing a text node', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textNode.parentNode = textTestNode;
    textTestNode.setChildrenPayload([textNodePayload]);
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.childNodeRemoved(textTestNode.id, textNode.id);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights clearing text node content', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.characterDataModified(textNode.id, '');
    assert.strictEqual(await highlights, 2);
  });

  it('highlights changing processing instruction node content', async () => {
    const piPayload = createProcessingInstructionPayload('pi-target', 'pi-data');
    const piNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, piPayload);
    textTestNode.setChildrenPayload([piPayload]);
    piNode.parentNode = textTestNode;
    const piTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(piNode);
    textTestTreeElement.appendChild(piTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.characterDataModified(piNode.id, 'Changed');
    assert.strictEqual(await highlights, 1);
  });

  it('edits a processing instruction node', async () => {
    const piPayload = createProcessingInstructionPayload('pi-target', 'pi-data');
    const piNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, piPayload);
    textTestNode.setChildrenPayload([piPayload]);
    piNode.parentNode = textTestNode;

    const setNodeValueSpy = sinon.spy(piNode, 'setNodeValue');
    sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const piTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(piNode);
    assert.exists(piTreeElement);
    textTestTreeElement.appendChild(piTreeElement);

    await textTestTreeElement.onpopulate();

    treeOutline.selectDOMNode(piNode, true);
    await piTreeElement.updateComplete;

    const piElementDOM =
        piTreeElement.widget.contentElement.querySelector('.webkit-html-processing-instruction-value') as HTMLElement;
    assert.exists(piElementDOM);

    // Start editing by calling ondblclick
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'target', {value: piElementDOM});
    assert.isFalse(piTreeElement.ondblclick(event));

    assert.isTrue(piTreeElement.isEditing);

    assert.strictEqual(piElementDOM.textContent, 'pi-data');

    // The inplace editor is now active on piElementDOM.
    piElementDOM.textContent = 'New Data';

    // The commit is triggered by blur or enter.
    piElementDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    assert.isFalse(piTreeElement.isEditing);

    sinon.assert.calledOnce(setNodeValueSpy);
    sinon.assert.calledWith(setNodeValueSpy, 'New Data');
  });

  it('edits a processing instruction node without data', async () => {
    const piPayload = createProcessingInstructionPayload('pi-target', '');
    const piNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, piPayload);
    textTestNode.setChildrenPayload([piPayload]);
    piNode.parentNode = textTestNode;

    const setNodeValueSpy = sinon.spy(piNode, 'setNodeValue');
    sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const piTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(piNode);
    assert.exists(piTreeElement);
    textTestTreeElement.appendChild(piTreeElement);

    await textTestTreeElement.onpopulate();

    treeOutline.selectDOMNode(piNode, true);
    await piTreeElement.updateComplete;

    const piElementDOM =
        piTreeElement.widget.contentElement.querySelector('.webkit-html-processing-instruction-value') as HTMLElement;
    assert.exists(piElementDOM);

    // Start editing by calling ondblclick
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'target', {value: piElementDOM});
    assert.isFalse(piTreeElement.ondblclick(event));

    assert.isTrue(piTreeElement.isEditing);

    assert.strictEqual(piElementDOM.textContent, '');

    // The inplace editor is now active on piElementDOM.
    piElementDOM.textContent = 'New Data';

    // The commit is triggered by blur or enter.
    piElementDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    assert.isFalse(piTreeElement.isEditing);

    sinon.assert.calledOnce(setNodeValueSpy);
    sinon.assert.calledWith(setNodeValueSpy, 'New Data');
  });

  it('does not highlight when panel is hidden', async () => {
    treeOutline.setVisible(false);
    attrTestNode.setAttribute('attrFoo', 'bar');
    let highlights = waitForHighlights(attrTestTreeElement);
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: attrTestNode, name: 'attrFoo'});
    assert.strictEqual(await highlights, 0);

    treeOutline.setVisible(true);
    highlights = waitForHighlights(attrTestTreeElement);
    attrTestNode.setAttribute('attrFoo', 'baz');
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: attrTestNode, name: 'attrFoo'});
    assert.strictEqual(await highlights, 1);
  });

  it('edits a text node', async () => {
    const longText = 'This is a long text that is longer than 80 characters to ensure that the text node is ' +
        'not rendered inline and the parent element is expandable.';
    const textNodePayload = createTextNodePayload(longText);
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;

    const setNodeValueSpy = sinon.spy(textNode, 'setNodeValue');
    sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    assert.exists(textNodeTreeElement);
    textTestTreeElement.appendChild(textNodeTreeElement);

    await textTestTreeElement.onpopulate();

    treeOutline.selectDOMNode(textNode, true);
    await textNodeTreeElement.updateComplete;

    const textElementDOM =
        textNodeTreeElement.widget.contentElement.querySelector('.webkit-html-text-node') as HTMLElement;
    assert.exists(textElementDOM);

    // Start editing by calling ondblclick
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'target', {value: textElementDOM});
    assert.isFalse(textNodeTreeElement.ondblclick(event));

    assert.isTrue(textNodeTreeElement.isEditing);

    assert.strictEqual(textElementDOM.textContent, longText);

    // The inplace editor is now active on textElementDOM.
    textElementDOM.textContent = 'New Text';

    // The commit is triggered by blur or enter.
    textElementDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    assert.isFalse(textNodeTreeElement.isEditing);

    sinon.assert.calledOnce(setNodeValueSpy);
    sinon.assert.calledWith(setNodeValueSpy, 'New Text');
  });

  it('highlights search results in ordered text ranges', () => {
    attrTestTreeElement.highlightSearchResults('foo');
    const highlight = CSS.highlights.get('highlighted-search-result');
    assert.exists(highlight);
    assert.deepEqual(Array.from(highlight).map(range => range.toString()), ['Foo', 'foo']);
  });
});

describeWithEnvironment('ElementsTreeElement in Snapshot Mode', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;
  let node: SDK.DOMModel.DOMNode;
  let treeElement: Elements.ElementsTreeElement.ElementsTreeElement;

  beforeEach(() => {
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = universe.createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel)!;
    node = new SDK.DOMModel.DOMNode(domModel);
    node.id = 1 as Protocol.DOM.NodeId;
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    sinon.stub(node, 'adProvenance').returns({} as Protocol.Network.AdProvenance);
    sinon.stub(node, 'isMediaNode').returns(true);

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
        /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ false, /* maxTreeDepth */ 2,
        /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true);
    treeOutline.wireToDOMModel(domModel);

    treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
  });

  it('Ask AI button is not present', async () => {
    const parentNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 1,
      children: [{
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 0,
        attributes: [],
      } as Protocol.DOM.Node],
      attributes: [],
    });
    const snapshot = await parentNode.takeSnapshot();
    const nodeSnapshot = snapshot.children()?.[0];
    assert.exists(nodeSnapshot);

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
        /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ false, /* maxTreeDepth */ 2,
        /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true);
    treeOutline.wireToDOMModel(domModel);

    treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(nodeSnapshot);
    treeElement.treeOutline = treeOutline;

    treeElement.hovered = true;
    treeElement.select();

    // Mock the action availability
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    sinon.stub(actionRegistry, 'hasAction').withArgs('freestyler.elements-floating-button').returns(true);
    sinon.stub(actionRegistry, 'getAction').withArgs('freestyler.elements-floating-button').returns({
      title: () => 'Ask AI',
      execute: () => {},
    } as unknown as UI.ActionRegistration.Action);

    treeElement.requestUpdate();
    await treeElement.updateComplete;

    const aiButton = treeElement.widget.contentElement.querySelector('devtools-floating-button');
    assert.isNull(aiButton, 'Ask AI button should not be present in snapshot mode');
  });

  describe('Adorners', () => {
    let cssModel: SDK.CSSModel.CSSModel;

    beforeEach(() => {
      cssModel = target.model(SDK.CSSModel.CSSModel)!;
      assert.exists(cssModel);
      // Mocks for various adorners
      sinon.stub(cssModel, 'getLayoutPropertiesFromComputedStyle').resolves({
        containerType: 'inline-size',
        isFlex: true,
        isGrid: true,
        isGridLanes: true,
        hasScroll: true,
        isSubgrid: true,
      } as SDK.CSSModel.LayoutProperties);

      sinon.stub(node, 'attributes').returns([{name: 'popover', value: ''},
                                              {name: 'interesttarget', value: ''}] as SDK.DOMModel.Attribute[]);
      sinon.stub(node, 'topLayerIndex').returns(1);
      sinon.stub(node, 'affectedByStartingStyles').returns(true);

      const slot = {
        deferredNode: {
          resolve: (callback: (node: SDK.DOMModel.DOMNode) => void) => {
            callback(node);
          },
          resolvePromise: () => Promise.resolve(node),
          backendNodeId: () => 1,
          highlight: () => {},
        },
      } as unknown as SDK.DOMModel.DOMNodeShortcut;
      sinon.stub(node, 'hasAssignedSlot').returns(true);
      sinon.stub(node, 'assignedSlot').value(slot);
    });

    it('media adorner click is no-op', async () => {
      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const mediaAdorner = Array.from(adorners).find(a => a.name === 'media');
      assert.exists(mediaAdorner);

      const viewManager = UI.ViewManager.ViewManager.instance();
      const showViewSpy = sinon.spy(viewManager, 'showView');

      mediaAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(showViewSpy);
    });

    it('popover adorner click is no-op', async () => {
      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const popoverAdorner = Array.from(adorners).find(a => a.name === 'popover');
      assert.exists(popoverAdorner);

      const agentSpy = sinon.spy(domModel.agent, 'invoke_forceShowPopover');
      popoverAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(agentSpy);
    });

    it('interest adorner click is no-op', async () => {
      // Force allow interest for test
      const originalDevToolsAllowInterestForcing = Root.Runtime.hostConfig.devToolsAllowInterestForcing;
      Root.Runtime.hostConfig.devToolsAllowInterestForcing = {enabled: true};

      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const interestAdorner = Array.from(adorners).find(a => a.name === 'interest');
      assert.exists(interestAdorner);

      const agentSpy = sinon.spy(domModel.agent, 'invoke_forceShowInterest');
      interestAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(agentSpy);

      // Restore
      Root.Runtime.hostConfig.devToolsAllowInterestForcing = originalDevToolsAllowInterestForcing;
    });

    it('top-layer adorner click is no-op', async () => {
      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const topLayerAdorner = Array.from(adorners).find(a => a.name === 'top-layer');
      assert.exists(topLayerAdorner);

      const revealSpy =
          sinon.spy((treeElement.treeOutline as Elements.ElementsTreeOutline.ElementsTreeOutline)!, 'revealInTopLayer');
      topLayerAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(revealSpy);
    });

    it('starting-style adorner click is no-op', async () => {
      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const startingStyleAdorner = Array.from(adorners).find(a => a.name === 'starting-style');
      assert.exists(startingStyleAdorner);

      const forceStartingStyleSpy = sinon.spy(cssModel, 'forceStartingStyle');
      startingStyleAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(forceStartingStyleSpy);
    });

    it('slot adorner click works', async () => {
      treeElement.updateAdorners();
      treeElement.requestUpdate();
      await treeElement.updateComplete;

      const adorners = treeElement.widget.contentElement.querySelectorAll('devtools-adorner');
      const slotAdorner = Array.from(adorners).find(a => a.name === 'slot');
      assert.exists(slotAdorner);

      const revealSpy = sinon.spy(Common.Revealer.RevealerRegistry.instance(), 'reveal');
      slotAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.called(revealSpy);
    });
  });

  describe('selected hint', () => {
    it('renders selected hint when selected and inspectable', () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        isSelected: true,
        canInspect: true,
      },
                                                {}, domTarget);

      const hint = domTarget.querySelector('.selected-hint');
      assert.exists(hint);
    });

    it('does not render selected hint when selected but not inspectable', () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        isSelected: true,
        canInspect: false,
      },
                                                {}, domTarget);

      const hint = domTarget.querySelector('.selected-hint');
      assert.isNull(hint);
    });

    it('does not render selected hint when not selected', () => {
      const domTarget = document.createElement('div');
      renderElementIntoDOM(domTarget);
      Elements.ElementsTreeElement.DEFAULT_VIEW({
        ...getBaseViewInput(),
        isSelected: false,
        canInspect: true,
      },
                                                {}, domTarget);

      const hint = domTarget.querySelector('.selected-hint');
      assert.isNull(hint);
    });
  });

  it('triggers invoke_forceShowInterest on interest adorner click', async () => {
    const originalDevToolsAllowInterestForcing = Root.Runtime.hostConfig.devToolsAllowInterestForcing;
    Root.Runtime.hostConfig.devToolsAllowInterestForcing = {enabled: true};

    sinon.stub(node, 'attributes').returns([{name: 'interestfor', value: 'my-tooltip'}] as SDK.DOMModel.Attribute[]);

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
        /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ false, /* maxTreeDepth */ 2,
        /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ false);
    treeOutline.wireToDOMModel(domModel);

    treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    treeElement.onbind();

    treeElement.updateAdorners();
    treeElement.requestUpdate();
    await treeElement.updateComplete;

    const adorners = treeElement.widget.contentElement.querySelectorAll<Adorners.Adorner.Adorner>('devtools-adorner');
    const interestAdorner = Array.from(adorners).find(a => a.name === 'interest');
    assert.exists(interestAdorner);

    const agentSpy = sinon.spy(domModel.agent, 'invoke_forceShowInterest');
    interestAdorner.dispatchEvent(new Event('click'));
    sinon.assert.calledWith(agentSpy, {nodeId: node.id, enable: true});

    // Restore
    Root.Runtime.hostConfig.devToolsAllowInterestForcing = originalDevToolsAllowInterestForcing;
  });

  describe('ondelete', () => {
    it('returns false if treeOutline is not set', () => {
      const treeElementNoOutline = new Elements.ElementsTreeElement.ElementsTreeElement(node);
      assert.isFalse(treeElementNoOutline.ondelete());
    });

    it('calls remove on tree element for node', () => {
      const removeSpy = sinon.spy(treeElement, 'remove');
      const handled = treeElement.ondelete();
      assert.isTrue(handled);
      sinon.assert.calledOnce(removeSpy);
    });

    it('calls remove on start tag tree element when ondelete is called on closing tag', () => {
      treeElement.onbind();
      const closingTagTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node, true);
      closingTagTreeElement.treeOutline = treeOutline;
      const removeSpy = sinon.spy(treeElement, 'remove');
      const handled = closingTagTreeElement.ondelete();
      assert.isTrue(handled);
      sinon.assert.calledOnce(removeSpy);
    });
  });
});

describeWithEnvironment('ElementsTreeElement issue management', () => {
  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let testDomModel: SDK.DOMModel.DOMModel;
  let domIssuesManager: IssuesManager.DOMIssuesManager.DOMIssuesManager;
  let issuesManager: IssuesManager.IssuesManager.IssuesManager;
  let labelNode: SDK.DOMModel.DOMNode;
  let outline: Elements.ElementsTreeOutline.ElementsTreeOutline;
  let testTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let mockModel: SDK.IssuesModel.IssuesModel;

  beforeEach(() => {
    universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = universe.createTarget();
    testDomModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    domIssuesManager = universe.domIssuesManager;
    issuesManager = universe.issuesManager;

    const labelNodePayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'LABEL',
      localName: 'label',
      nodeValue: 'A label',
      attributes: ['for', 'input-id'],
      childNodeCount: 0,
    };
    const rootNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: 'Body',
      childNodeCount: 1,
      children: [labelNodePayload],
    });
    assert.isNotNull(rootNode);
    labelNode = rootNode.children()![0];
    assert.isNotNull(labelNode);

    outline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    outline.wireToDOMModel(testDomModel);
    outline.setVisible(true);
    renderElementIntoDOM(outline.element);
    testTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(labelNode, false);
    outline.appendChild(testTreeElement);
    testTreeElement.widget.performUpdate();

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(labelNode);

    mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  });

  it('adds generic tag issue to tree element and highlights tag name', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
        },
      },
    };
    const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isTrue(tagElement.classList.contains('violating-element'));
    assert.deepEqual(domIssuesManager.issuesForNode(labelNode), [issue]);
  });

  it('adds select accessibility issue to tree element and highlights tag name', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue,
      details: {
        elementAccessibilityIssueDetails: {
          nodeId: 2 as Protocol.DOM.BackendNodeId,
          elementAccessibilityIssueReason: Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
          hasDisallowedAttributes: false,
        },
      },
    };
    const issue = IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue.fromInspectorIssue(
        mockModel, inspectorIssue)[0];
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isTrue(tagElement.classList.contains('violating-element'));
    assert.deepEqual(domIssuesManager.issuesForNode(labelNode), [issue]);
  });

  it('adds attribute-specific issue to tree element and highlights attribute name', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          violatingNodeAttribute: 'for',
        },
      },
    };
    const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const attrElement = testTreeElement.widget.contentElement.querySelector('.webkit-html-attribute-name');
    assert.isNotNull(attrElement);
    assert.isTrue(attrElement!.classList.contains('violating-element'));
    assert.include(domIssuesManager.issuesForNode(labelNode), issue);
  });

  it('does not highlight tree element for non-supported issue', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
      details: {},
    };
    const issue = IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue.fromInspectorIssue(
        mockModel, inspectorIssue)[0];
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isFalse(tagElement.classList.contains('violating-element'));
  });

  it('removes highlight when issue is hidden', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
        },
      },
    };
    const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isTrue(tagElement.classList.contains('violating-element'));

    issue.setHidden(true);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED, {issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(tagElement.classList.contains('violating-element'));
  });

  it('restores highlight when hidden issue is unhidden', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
        },
      },
    };
    const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
    issue.setHidden(true);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isFalse(tagElement.classList.contains('violating-element'));

    issue.setHidden(false);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED, {issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(tagElement.classList.contains('violating-element'));
  });

  it('does not highlight tree element for pre-hidden issue', async () => {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
        },
      },
    };
    const preHiddenIssue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
    preHiddenIssue.setHidden(true);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                           {issuesModel: mockModel, issue: preHiddenIssue});
    await new Promise(resolve => setTimeout(resolve, 0));
    const tagElement = testTreeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isFalse(tagElement.classList.contains('violating-element'));
  });
});
