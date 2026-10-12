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
import * as Badges from '../../models/badges/badges.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as ChangeTracker from '../../models/change_tracker/change_tracker.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {findMenuItemWithLabel} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  registerActions,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
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

    // Mirrors the special characters from legacy elements/elements-panel-structure.
    const entityCases: Array<[string, string]> = [
      ['\u00A0', '&nbsp;'],
      ['\u00AD', '&shy;'],
      ['\u2002', '&ensp;'],
      ['\u2003', '&emsp;'],
      ['\u2009', '&thinsp;'],
      ['\u200A', '&hairsp;'],
      ['\u200B', '&ZeroWidthSpace;'],
      ['\u200C', '&zwnj;'],
      ['\u200D', '&zwj;'],
      ['\u200E', '&lrm;'],
      ['\u200F', '&rlm;'],
      ['\u202A', '&#x202A;'],
      ['\u202B', '&#x202B;'],
      ['\u202C', '&#x202C;'],
      ['\u202D', '&#x202D;'],
      ['\u202E', '&#x202E;'],
      ['\u2060', '&NoBreak;'],
      ['\uFEFF', '&#xFEFF;'],
    ];
    for (const [char, entity] of entityCases) {
      it(`converts U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} to ${entity}`, () => {
        const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(`a${char}b`);
        assert.strictEqual(result.text, `a${entity}b`);
        assert.deepEqual(result.entityRanges, [new TextUtils.TextRange.SourceRange(1, entity.length)]);
      });
    }

    it('converts the full legacy elements-panel-structure special character sequence', () => {
      const input = ' ><"\' ' + entityCases.map(([char]) => char).join('_') + ' ';
      const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(input);
      assert.strictEqual(
          result.text,
          ' ><"\' &nbsp;_&shy;_&ensp;_&emsp;_&thinsp;_&hairsp;_&ZeroWidthSpace;_&zwnj;_&zwj;_&lrm;_&rlm;_' +
              '&#x202A;_&#x202B;_&#x202C;_&#x202D;_&#x202E;_&NoBreak;_&#xFEFF; ');
      assert.lengthOf(result.entityRanges, entityCases.length);
    });
  });

  it('renders gutter decorations correctly', async () => {
    const target = document.createElement('div');
    target.style.width = '100px';
    target.style.height = '20px';
    const style = document.createElement('style');
    // FIXME: styles are currently external to ElementsTreeElement.
    style.innerText = Elements.DOMTreeWidget.elementsTreeOutlineStyles;
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
    const domTreeWidget = new Elements.DOMTreeWidget.DOMTreeWidget();
    const event = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    await Elements.DOMTreeContextMenu.populateNodeContextMenu(contextMenu, domTreeWidget, node);
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
    Elements.ElementsTreeElement.ElementsTreeWidget.populateForcedPseudoStateItems(contextMenu, node);

    const subMenu = findMenuItemWithLabel(contextMenu.debugSection(), 'Force state');
    assert.instanceOf(subMenu, UI.ContextMenu.SubMenu);
    const hoverItem = findMenuItemWithLabel(subMenu.defaultSection(), ':hover');
    assert.exists(hoverItem);

    contextMenu.invokeHandler(hoverItem.id());

    sinon.assert.calledOnce(buttonProvider.showPane);
  });

  function createTreeWidget(node: SDK.DOMModel.DOMNode): Elements.ElementsTreeElement.ElementsTreeWidget {
    const widget = new Elements.ElementsTreeElement.ElementsTreeWidget();
    widget.node = node;
    return widget;
  }

  it('updates when persistent overlay state changes', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    const widget = createTreeWidget(node);

    // Simulate binding to the tree
    widget.onbind();

    const requestUpdateSpy = sinon.spy(widget, 'requestUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(requestUpdateSpy);

    // Simulate unbinding
    widget.onunbind();
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
    const widget = createTreeWidget(node);

    // Simulate binding to the tree
    widget.onbind();
    const requestUpdateSpy = sinon.spy(widget, 'requestUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(requestUpdateSpy);

    // Simulate unbinding
    widget.onunbind();
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

    sinon.stub(node, 'hasAssignedSlot').returns(true);
    sinon.stub(node, 'assignedSlot').value(shortcut);

    const widget = createTreeWidget(node);
    // Simulate binding to the tree
    widget.onbind();

    widget.requestUpdate();
    await widget.updateComplete;

    const adorner = widget.contentElement.querySelector('devtools-adorner');
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

    sinon.stub(node, 'affectedByStartingStyles').returns(true);

    const widget = createTreeWidget(node);
    widget.onbind();
    widget.requestUpdate();
    await widget.updateComplete;

    const adorner = widget.contentElement.querySelector('.starting-style');
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

       const widget = createTreeWidget(node);
       widget.onbind();

       // Render the element initially
       widget.requestUpdate();
       await widget.updateComplete;

       // The attribute container DOM initially contains zero-width spaces (inserted for wrapping by rendering)
       const attributeElement = widget.contentElement.querySelector('.webkit-html-attribute');
       assert.exists(attributeElement);

       // Count initial zero-width spaces
       const initialSpacesCount = (attributeElement.textContent).split('\u200B').length - 1;
       assert.isAbove(initialSpacesCount, 0);

       // Start in-place editing of the attribute
       const editStarted = widget.triggerEditAttribute('autofill-information');
       assert.isTrue(editStarted);

       // Verify that starting edit stripped the zero-width spaces from the attribute element
       assert.notInclude(attributeElement.textContent, '\u200B');

       // While editing is active, call performUpdate (or hover, etc.) which would re-render
       widget.requestUpdate();
       await widget.updateComplete;

       // Verify that the attribute element STILL does not contain zero-width spaces.
       assert.notInclude(attributeElement.textContent, '\u200B');

       // Cancel the editing session and clean up
       widget.editingCancelled(attributeElement, 'autofill-information');
       await widget.updateComplete;

       // Re-query the newly rendered attribute element from the DOM
       const finalAttributeElement = widget.contentElement.querySelector('.webkit-html-attribute');
       assert.exists(finalAttributeElement);

       // After cancelling, the element is restored, and the zero-width spaces should be restored back to initial count
       // (verifying no duplicate or redundant spaces are added/kept in the DOM)
       const finalSpacesCount = finalAttributeElement.textContent.split('\u200B').length - 1;
       assert.strictEqual(finalSpacesCount, initialSpacesCount);
     });

  it('starts editing boolean attributes without values via triggerEditAttribute', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const nodePayload = {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BUTTON',
      localName: 'button',
      nodeValue: '',
      attributes: ['disabled', ''],
      childNodeCount: 0,
    };
    const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);

    const widget = createTreeWidget(node);
    widget.onbind();

    widget.requestUpdate();
    await widget.updateComplete;

    const attributeElement = widget.contentElement.querySelector('.webkit-html-attribute');
    assert.exists(attributeElement);
    assert.isNull(attributeElement.querySelector('.webkit-html-attribute-value'));

    const editStarted = widget.triggerEditAttribute('disabled');
    assert.isTrue(editStarted);
  });

  it('starts editing boolean attribute on startEditing when it is the first attribute', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const nodePayload = {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BUTTON',
      localName: 'button',
      nodeValue: '',
      attributes: ['disabled', ''],
      childNodeCount: 0,
    };
    const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);

    const widget = createTreeWidget(node);
    widget.onbind();

    widget.requestUpdate();
    await widget.updateComplete;

    widget.isDOMNodeSelected = true;
    const editStarted = widget.startEditing();
    assert.isTrue(editStarted);
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

    const widget = createTreeWidget(node);
    widget.performUpdate();

    const attributeElement = widget.contentElement.querySelector('.webkit-html-attribute');
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
    const editStarted = widget.triggerEditAttribute('href');
    assert.isTrue(editStarted);
    // When editing, the full, untrimmed value should be displayed without zero-width spaces.
    assert.strictEqual(attributeValueElement.textContent?.trim(), longDataUrl);

    // Cancel editing.
    widget.editingCancelled(attributeElement, 'href');

    // The value should be trimmed again.
    const attributeElementAfterCancel = widget.contentElement.querySelector('.webkit-html-attribute');
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

    function renderTreeNode(node: SDK.DOMModel.DOMNode): Elements.ElementsTreeElement.ElementsTreeWidget {
      const widget = createTreeWidget(node);
      widget.performUpdate();
      return widget;
    }

    function getLinkOutputs(widget: Elements.ElementsTreeElement.ElementsTreeWidget):
        Array<{text: string, href: string}> {
      const linkElements =
          Array.from(widget.contentElement.querySelectorAll('.webkit-html-attribute-value .devtools-link'));
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

      const attributeValueElement = treeElement.contentElement.querySelector('.webkit-html-attribute-value');
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

    it('updates attributes when shifting between plain and linkified values without throwing', () => {
      const nodePayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'SCRIPT',
        localName: 'script',
        nodeValue: '',
        attributes: ['type', 'rocketlazyloadscript', 'src', 'app.js'],
        childNodeCount: 0,
      };
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, nodePayload);
      sinon.stub(node, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`http://example.com/${url}`);

      const treeElement = renderTreeNode(node);
      assert.deepEqual(getLinkOutputs(treeElement), [{text: 'app.js', href: 'http://example.com/app.js'}]);

      // Removing 'type' shifts 'src' into the first attribute slot (previously ValueType.UNKNOWN).
      domModel.attributeRemoved(node.id, 'type');
      treeElement.performUpdate();
      assert.deepEqual(getLinkOutputs(treeElement), [{text: 'app.js', href: 'http://example.com/app.js'}]);

      // Replacing 'src' with a plain attribute transitions the slot from ValueType.SRC back to ValueType.UNKNOWN.
      domModel.attributeRemoved(node.id, 'src');
      domModel.attributeModified(node.id, 'type', 'module');
      treeElement.performUpdate();
      const attrValue = treeElement.contentElement.querySelector('.webkit-html-attribute-value');
      assert.strictEqual(attrValue?.textContent?.replace(/\u200B/g, ''), 'module');

      // Also verify IMG transitions between plain attributes and srcset (ValueType.SRCSET).
      const imgNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 3 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'IMG',
        localName: 'img',
        nodeValue: '',
        attributes: ['data-srcset', '1x.png 1x', 'srcset', '1x.png 1x, 2x.png 2x'],
        childNodeCount: 0,
      });
      sinon.stub(imgNode, 'resolveURL').callsFake(url => Platform.DevToolsPath.urlString`http://example.com/${url}`);
      const imgTreeElement = renderTreeNode(imgNode);
      assert.lengthOf(getLinkOutputs(imgTreeElement), 2);

      domModel.attributeRemoved(imgNode.id, 'data-srcset');
      imgTreeElement.performUpdate();
      assert.lengthOf(getLinkOutputs(imgTreeElement), 2);
    });
  });
});

describeWithEnvironment('ElementsTreeElement highlighting', () => {
  let domModel: SDK.DOMModel.DOMModel;
  let domTree: Elements.DOMTreeWidget.DOMTreeWidget;
  let containerNode: SDK.DOMModel.DOMNode;
  let attrTestNode: SDK.DOMModel.DOMNode;
  let childTestNode: SDK.DOMModel.DOMNode;
  let textTestNode: SDK.DOMModel.DOMNode;
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

  // Updating DOMTreeWidget renders the outer devtools-tree element. The child
  // ElementsTreeWidgets schedule their own updates once they are connected, so
  // yield a tick between the two rounds of widget updates.
  async function waitForTreeUpdates(): Promise<void> {
    await UI.Widget.Widget.allUpdatesComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await UI.Widget.Widget.allUpdatesComplete;
  }

  function findWidget(node: SDK.DOMModel.DOMNode): Elements.ElementsTreeElement.ElementsTreeWidget {
    const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(tree);
    for (const el of tree.getInternalTreeOutlineForTest().contentElement.querySelectorAll('devtools-widget')) {
      const widget = UI.Widget.Widget.get(el);
      if (widget instanceof Elements.ElementsTreeElement.ElementsTreeWidget && widget.node === node &&
          !widget.isClosingTag) {
        return widget;
      }
    }
    assert.fail(`No ElementsTreeWidget rendered for ${node.nodeName()}`);
  }

  beforeEach(async () => {
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    const target = universe.createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel)!;
    sinon.stub(domModel, 'requestDocument').resolves(null);

    const containerPayload = createDOMNodePayload('div', {id: 'container'});
    const attrTestPayload = createDOMNodePayload('div', {id: 'attrTest', attrFoo: 'foo'});
    const childTestPayload = createDOMNodePayload('div', {id: 'childTest'});
    const textTestPayload = createDOMNodePayload('div', {id: 'textTest'});

    containerNode = SDK.DOMModel.DOMNode.create(domModel, null, false, containerPayload);
    containerNode.setChildrenPayload([attrTestPayload, childTestPayload, textTestPayload]);

    attrTestNode = containerNode.children()![0];
    childTestNode = containerNode.children()![1];
    textTestNode = containerNode.children()![2];

    domTree = new Elements.DOMTreeWidget.DOMTreeWidget();
    domTree.markAsRoot();
    renderElementIntoDOM(domTree);
    domTree.modelAdded(domModel);
    domTree.rootDOMNode = containerNode;
    domTree.setNodeExpanded(containerNode, true);
    domTree.performUpdate();
    await waitForTreeUpdates();
  });

  afterEach(async () => {
    domTree.detach();
    await UI.Widget.Widget.allUpdatesComplete;
    Highlighting.HighlightManager.HighlightManager.removeInstance();
  });

  /** Flushes pending DOM mutations into the tree and counts the update highlights rendered for `node`. */
  async function highlightsFor(node: SDK.DOMModel.DOMNode): Promise<number> {
    domTree.updateModifiedNodes();
    await waitForTreeUpdates();
    return findWidget(node).contentElement.querySelectorAll('.dom-update-highlight').length;
  }

  /**
   * Appends `payload` as the only child of `parent` and re-renders the tree.
   * The parent stays collapsed unless `expand` is set, mirroring a node whose
   * children have not been revealed yet.
   */
  async function appendChild(parent: SDK.DOMModel.DOMNode, payload: Protocol.DOM.Node,
                             {expand = false} = {}): Promise<SDK.DOMModel.DOMNode> {
    parent.setChildrenPayload([payload]);
    const child = parent.children()![0];
    if (expand) {
      domTree.setNodeExpanded(parent, true);
    }
    domTree.performUpdate();
    await waitForTreeUpdates();
    return child;
  }

  it('highlights attribute value change', async () => {
    domModel.attributeModified(attrTestNode.id, 'attrFoo', 'bar');
    assert.strictEqual(await highlightsFor(attrTestNode), 1);
  });

  it('highlights attribute set to empty', async () => {
    domModel.attributeModified(attrTestNode.id, 'attrFoo', '');
    assert.strictEqual(await highlightsFor(attrTestNode), 1);
  });

  it('highlights new attribute', async () => {
    domModel.attributeModified(attrTestNode.id, 'attrBar', 'bar');
    assert.strictEqual(await highlightsFor(attrTestNode), 1);
  });

  it('highlights attribute removal', async () => {
    domModel.attributeRemoved(attrTestNode.id, 'attrFoo');
    assert.strictEqual(await highlightsFor(attrTestNode), 1);
  });

  it('highlights appending child to an empty node', async () => {
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, child1Node);
    assert.strictEqual(await highlightsFor(childTestNode), 1);
  });

  it('renders the appended child without highlighting the tag of an expanded node', async () => {
    const child1Node = await appendChild(childTestNode, createDOMNodePayload('span', {id: 'child1'}), {expand: true});
    assert.isTrue(domTree.isNodeExpanded(childTestNode));

    domModel.childNodeInserted(childTestNode.id, child1Node.id, createDOMNodePayload('span', {id: 'child2'}));
    // The children are visible, so the parent tag is not highlighted.
    assert.strictEqual(await highlightsFor(childTestNode), 0);
    const child2Node = childTestNode.children()![1];
    assert.strictEqual(child2Node.getAttribute('id'), 'child2');
    assert.exists(findWidget(child2Node));
  });

  it('highlights child removal', async () => {
    const child1Node = await appendChild(childTestNode, createDOMNodePayload('span', {id: 'child1'}));

    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: child1Node, parent: childTestNode});
    assert.strictEqual(await highlightsFor(childTestNode), 1);
  });

  it('highlights setting text content', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textNode.parentNode = textTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, textNode);
    assert.strictEqual(await highlightsFor(textTestNode), 1);
  });

  it('highlights changing text node content', async () => {
    const textNode = await appendChild(textTestNode, createTextNodePayload('Text'));

    domModel.characterDataModified(textNode.id, 'Changed');
    // The inline text and the parent tag are both highlighted.
    assert.strictEqual(await highlightsFor(textTestNode), 2);
  });

  it('highlights removing a text node', async () => {
    const textNode = await appendChild(textTestNode, createTextNodePayload('Text'));

    domModel.childNodeRemoved(textTestNode.id, textNode.id);
    assert.strictEqual(await highlightsFor(textTestNode), 1);
  });

  it('highlights clearing text node content', async () => {
    const textNode = await appendChild(textTestNode, createTextNodePayload('Text'));

    domModel.characterDataModified(textNode.id, '');
    // The inline text and the parent tag are both highlighted.
    assert.strictEqual(await highlightsFor(textTestNode), 2);
  });

  it('highlights changing processing instruction node content', async () => {
    const piNode = await appendChild(textTestNode, createProcessingInstructionPayload('pi-target', 'pi-data'));

    domModel.characterDataModified(piNode.id, 'Changed');
    // The processing instruction is the only child, so its collapsed parent is highlighted.
    assert.strictEqual(await highlightsFor(textTestNode), 1);
  });

  async function editNodeValueByDoubleClick(node: SDK.DOMModel.DOMNode, valueSelector: string, expectedText: string,
                                            newText: string): Promise<void> {
    const setNodeValueSpy = sinon.spy(node, 'setNodeValue');
    sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    domTree.selectDOMNode(node, true);
    await waitForTreeUpdates();

    const widget = findWidget(node);
    const valueElement = widget.contentElement.querySelector<HTMLElement>(valueSelector);
    assert.exists(valueElement);

    // Start editing by double clicking the value.
    valueElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, composed: true}));
    assert.isTrue(widget.isEditing);
    assert.strictEqual(valueElement.textContent, expectedText);

    // The inplace editor is now active on valueElement.
    valueElement.textContent = newText;

    // The commit is triggered by blur or enter.
    valueElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    assert.isFalse(widget.isEditing);

    sinon.assert.calledOnce(setNodeValueSpy);
    sinon.assert.calledWith(setNodeValueSpy, newText);
  }

  it('edits a processing instruction node', async () => {
    const piNode =
        await appendChild(textTestNode, createProcessingInstructionPayload('pi-target', 'pi-data'), {expand: true});
    await editNodeValueByDoubleClick(piNode, '.webkit-html-processing-instruction-value', 'pi-data', 'New Data');
  });

  it('edits a processing instruction node without data', async () => {
    const piNode = await appendChild(textTestNode, createProcessingInstructionPayload('pi-target', ''), {expand: true});
    await editNodeValueByDoubleClick(piNode, '.webkit-html-processing-instruction-value', '', 'New Data');
  });

  it('edits a text node', async () => {
    const longText = 'This is a long text that is longer than 80 characters to ensure that the text node is ' +
        'not rendered inline and the parent element is expandable.';
    const textNode = await appendChild(textTestNode, createTextNodePayload(longText), {expand: true});
    await editNodeValueByDoubleClick(textNode, '.webkit-html-text-node', longText, 'New Text');
  });

  it('defers highlighting while hidden and highlights once shown', async () => {
    domTree.detach();
    domModel.attributeModified(attrTestNode.id, 'attrFoo', 'bar');
    // The change is recorded but not flushed while the tree is hidden.
    assert.isTrue(domTree.updateRecordsForTest().has(attrTestNode));

    renderElementIntoDOM(domTree);
    await waitForTreeUpdates();
    assert.isFalse(domTree.updateRecordsForTest().has(attrTestNode));
    assert.lengthOf(findWidget(attrTestNode).contentElement.querySelectorAll('.dom-update-highlight'), 1);
  });

  it('highlights search results in ordered text ranges', async () => {
    const widget = findWidget(attrTestNode);
    widget.highlightSearchResults('foo');
    await widget.updateComplete;
    const highlight = CSS.highlights.get('highlighted-search-result');
    assert.exists(highlight);
    assert.deepEqual(Array.from(highlight).map(range => range.toString()), ['Foo', 'foo']);
  });

  it('hides search highlights and clears searchQuery without resurrecting on update', async () => {
    const widget = findWidget(attrTestNode);
    widget.highlightSearchResults('foo');
    await widget.updateComplete;
    let highlight = CSS.highlights.get('highlighted-search-result');
    assert.exists(highlight);
    assert.strictEqual(highlight.size, 2);

    widget.hideSearchHighlights();
    await widget.updateComplete;
    assert.isNull(widget.searchQuery);
    highlight = CSS.highlights.get('highlighted-search-result');
    assert.strictEqual(highlight?.size ?? 0, 0);

    widget.requestUpdate();
    await widget.updateComplete;
    highlight = CSS.highlights.get('highlighted-search-result');
    assert.strictEqual(highlight?.size ?? 0, 0);
  });
});

describeWithEnvironment('ElementsTreeElement in Snapshot Mode', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let node: SDK.DOMModel.DOMNode;
  let widget: Elements.ElementsTreeElement.ElementsTreeWidget;

  /** Creates the widget the way DOMTreeWidget renders snapshot trees: edits disabled, no AI button. */
  function createSnapshotWidget(node: SDK.DOMModel.DOMNode,
                                disableEdits = true): Elements.ElementsTreeElement.ElementsTreeWidget {
    const widget = new Elements.ElementsTreeElement.ElementsTreeWidget();
    widget.disableEdits = disableEdits;
    widget.showAIButton = false;
    widget.node = node;
    return widget;
  }

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

    widget = createSnapshotWidget(node);
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

    widget = createSnapshotWidget(nodeSnapshot);
    widget.hovered = true;
    widget.selected = true;

    // Mock the action availability
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    sinon.stub(actionRegistry, 'hasAction').withArgs('freestyler.elements-floating-button').returns(true);
    sinon.stub(actionRegistry, 'getAction').withArgs('freestyler.elements-floating-button').returns({
      title: () => 'Ask AI',
      execute: () => {},
    } as unknown as UI.ActionRegistration.Action);

    widget.requestUpdate();
    await widget.updateComplete;

    const aiButton = widget.contentElement.querySelector('devtools-floating-button');
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
      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
      const mediaAdorner = Array.from(adorners).find(a => a.name === 'media');
      assert.exists(mediaAdorner);

      const viewManager = UI.ViewManager.ViewManager.instance();
      const showViewSpy = sinon.spy(viewManager, 'showView');

      mediaAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(showViewSpy);
    });

    it('popover adorner click is no-op', async () => {
      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
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

      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
      const interestAdorner = Array.from(adorners).find(a => a.name === 'interest');
      assert.exists(interestAdorner);

      const agentSpy = sinon.spy(domModel.agent, 'invoke_forceShowInterest');
      interestAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(agentSpy);

      // Restore
      Root.Runtime.hostConfig.devToolsAllowInterestForcing = originalDevToolsAllowInterestForcing;
    });

    it('top-layer adorner click is no-op', async () => {
      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
      const topLayerAdorner = Array.from(adorners).find(a => a.name === 'top-layer');
      assert.exists(topLayerAdorner);

      const revealInTopLayer = sinon.stub();
      widget.revealInTopLayer = revealInTopLayer;
      topLayerAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(revealInTopLayer);
    });

    it('starting-style adorner click is no-op', async () => {
      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
      const startingStyleAdorner = Array.from(adorners).find(a => a.name === 'starting-style');
      assert.exists(startingStyleAdorner);

      const forceStartingStyleSpy = sinon.spy(cssModel, 'forceStartingStyle');
      startingStyleAdorner!.dispatchEvent(new Event('click'));
      sinon.assert.notCalled(forceStartingStyleSpy);
    });

    it('slot adorner click works', async () => {
      widget.updateAdorners();
      widget.requestUpdate();
      await widget.updateComplete;

      const adorners = widget.contentElement.querySelectorAll('devtools-adorner');
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

    widget = createSnapshotWidget(node, /* disableEdits= */ false);
    widget.onbind();

    widget.updateAdorners();
    widget.requestUpdate();
    await widget.updateComplete;

    const adorners = widget.contentElement.querySelectorAll<Adorners.Adorner.Adorner>('devtools-adorner');
    const interestAdorner = Array.from(adorners).find(a => a.name === 'interest');
    assert.exists(interestAdorner);

    const agentSpy = sinon.spy(domModel.agent, 'invoke_forceShowInterest');
    interestAdorner.dispatchEvent(new Event('click'));
    sinon.assert.calledWith(agentSpy, {nodeId: node.id, enable: true});

    // Restore
    Root.Runtime.hostConfig.devToolsAllowInterestForcing = originalDevToolsAllowInterestForcing;
  });
});

describeWithEnvironment('ElementsTreeElement issue management', () => {
  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let testDomModel: SDK.DOMModel.DOMModel;
  let domIssuesManager: IssuesManager.DOMIssuesManager.DOMIssuesManager;
  let issuesManager: IssuesManager.IssuesManager.IssuesManager;
  let labelNode: SDK.DOMModel.DOMNode;
  let widget: Elements.ElementsTreeElement.ElementsTreeWidget;
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

    widget = new Elements.ElementsTreeElement.ElementsTreeWidget();
    widget.node = labelNode;
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    widget.performUpdate();

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(labelNode);

    mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  });

  afterEach(() => {
    widget.detach();
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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
    const attrElement = widget.contentElement.querySelector('.webkit-html-attribute-name');
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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
    const tagElement = widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
    assert.isFalse(tagElement.classList.contains('violating-element'));
  });

  describe('in-place editing', () => {
    it('supports starting in-place editing, adding attributes, and cancelling in ElementsTreeWidget', async () => {
      widget.isDOMNodeSelected = true;

      const startEditingSpy = sinon.spy(widget, 'startEditing');
      const addNewAttributeSpy = sinon.spy(widget, 'addNewAttribute');

      // 1. Trigger startEditing
      assert.isFalse(widget.isEditing);
      widget.startEditing();
      sinon.assert.calledOnce(startEditingSpy);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);

      // 2. Trigger addNewAttribute
      widget.addNewAttribute();
      sinon.assert.calledOnce(addNewAttributeSpy);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);
    });

    it('supports editing tag name and starting attribute editing on an existing attribute', async () => {
      widget.isDOMNodeSelected = true;

      // 1. Start editing tag name
      assert.isFalse(widget.isEditing);
      const tagEditingResult = widget.startEditingTagName();
      assert.isTrue(tagEditingResult);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);

      // 2. Start editing an existing attribute
      const attrElement = widget.contentElement.querySelector('.webkit-html-attribute');
      assert.exists(attrElement);
      const attrEditingResult = widget.startEditingAttribute(attrElement, attrElement);
      assert.isTrue(attrEditingResult);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);
    });

    it('cancels tag name editing when the new tag name is empty', () => {
      const setNodeNameStub = sinon.stub(labelNode, 'setNodeName');
      const editingCancelledSpy = sinon.spy(widget, 'editingCancelled');

      assert.isTrue(widget.startEditingTagName());
      const tagNameElement = widget.contentElement.querySelector('.webkit-html-tag-name');
      assert.exists(tagNameElement);
      tagNameElement.textContent = '   ';
      widget.editing?.commit();

      sinon.assert.notCalled(setNodeNameStub);
      sinon.assert.calledOnce(editingCancelledSpy);
    });

    it('records a renamed tag without a selectNodeAfterEdit hook', () => {
      widget.selectNodeAfterEdit = undefined;
      const recordActionStub = sinon.stub(Badges.UserBadges.instance(), 'recordAction');
      sinon.stub(labelNode, 'setNodeName').callsFake((_name, callback) => callback?.(null, labelNode));

      assert.isTrue(widget.startEditingTagName());
      const tagNameElement = widget.contentElement.querySelector('.webkit-html-tag-name');
      assert.exists(tagNameElement);
      tagNameElement.textContent = 'section';
      widget.editing?.commit();

      sinon.assert.calledOnceWithExactly(recordActionStub, Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
    });

    it('supports double click on tag name or attribute to initiate editing', async () => {
      widget.isDOMNodeSelected = true;

      // Double click on tag name
      const tagNameElement = widget.contentElement.querySelector('.webkit-html-tag-name');
      assert.exists(tagNameElement);
      const tagDblClickEvent = new MouseEvent('dblclick', {bubbles: true});
      Object.defineProperty(tagDblClickEvent, 'target', {value: tagNameElement});
      widget.ondblclick(tagDblClickEvent);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);

      // Double click on attribute
      const attrElement = widget.contentElement.querySelector('.webkit-html-attribute');
      assert.exists(attrElement);
      const attrDblClickEvent = new MouseEvent('dblclick', {bubbles: true});
      Object.defineProperty(attrDblClickEvent, 'target', {value: attrElement});
      widget.ondblclick(attrDblClickEvent);
      assert.isTrue(widget.isEditing);
      widget.editing?.cancel();
      assert.isFalse(widget.isEditing);
    });

    it('adds and commits a new attribute without duplicating attribute elements', async () => {
      widget.isDOMNodeSelected = true;

      // Check initial attribute count
      const initialAttrs = widget.contentElement.querySelectorAll('.webkit-html-attribute');
      assert.lengthOf(initialAttrs, 1);

      // Start adding new attribute
      const added = widget.addNewAttribute();
      assert.isTrue(added);
      assert.isTrue(widget.isEditing);

      // Verify temporary attribute is present
      let attrs = widget.contentElement.querySelectorAll('.webkit-html-attribute');
      assert.lengthOf(attrs, 2);

      // Commit the new attribute
      sinon.stub(testDomModel.agent, 'invoke_setAttributesAsText').resolves({getError: () => undefined} as never);
      testDomModel.attributeModified(labelNode.id, 'data-new', 'value123');
      widget.editing?.commit();

      await UI.Widget.Widget.allUpdatesComplete;

      // Verify no duplicate attributes exist after commit and update
      attrs = widget.contentElement.querySelectorAll('.webkit-html-attribute');
      assert.lengthOf(attrs, 2);
      const getText = (el: Element): string => el.textContent?.replace(/\u200B/g, '') ?? '';
      assert.strictEqual(getText(attrs[0]), 'for="input-id"');
      assert.strictEqual(getText(attrs[1]), 'data-new="value123"');
    });
  });

  describe('Popover adorner', () => {
    let popoverNode: SDK.DOMModel.DOMNode;
    let candidate1: SDK.DOMModel.DOMNode;
    let candidate2: SDK.DOMModel.DOMNode;
    let deferredCandidate1: SDK.DOMModel.DeferredDOMNode;
    let deferredCandidate2: SDK.DOMModel.DeferredDOMNode;
    let connection: MockCDPConnection;
    let target: SDK.Target.Target;
    let domModel: SDK.DOMModel.DOMModel;

    beforeEach(() => {
      sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
      sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
      sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(universe.ignoreListManager);

      connection = new MockCDPConnection();
      target = universe.createTarget({connection});
      domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;

      const popoverNodePayload = {
        nodeId: 2 as Protocol.DOM.NodeId,
        parentId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        attributes: ['popover', 'auto', 'id', 'my-popover'],
        childNodeCount: 0,
      };
      const candidate1Payload = {
        nodeId: 3 as Protocol.DOM.NodeId,
        parentId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 10 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BUTTON',
        localName: 'button',
        nodeValue: '',
        attributes: ['id', 'btn1', 'class', 'primary btn-lg'],
        childNodeCount: 0,
      };
      const candidate2Payload = {
        nodeId: 4 as Protocol.DOM.NodeId,
        parentId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 20 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BUTTON',
        localName: 'button',
        nodeValue: '',
        attributes: ['id', 'btn2', 'class', 'secondary'],
        childNodeCount: 0,
      };

      const rootNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BODY',
        localName: 'body',
        nodeValue: 'Body',
        childNodeCount: 3,
        children: [popoverNodePayload, candidate1Payload, candidate2Payload],
      });
      assert.isNotNull(rootNode);
      popoverNode = rootNode.children()![0];
      candidate1 = rootNode.children()![1];
      candidate2 = rootNode.children()![2];
      assert.isNotNull(popoverNode);
      assert.isNotNull(candidate1);
      assert.isNotNull(candidate2);
      deferredCandidate1 = new SDK.DOMModel.DeferredDOMNode(target, candidate1.backendNodeId());
      deferredCandidate2 = new SDK.DOMModel.DeferredDOMNode(target, candidate2.backendNodeId());
      deferredCandidate1.resolvePromise = () => Promise.resolve(candidate1);
      deferredCandidate2.resolvePromise = () => Promise.resolve(candidate2);
    });

    function createWidget(
        node: SDK.DOMModel.DOMNode,
        view: ViewFunctionStub<typeof Elements.ElementsTreeElement.ElementsTreeWidget>,
        ): Elements.ElementsTreeElement.ElementsTreeWidget {
      const widget = new Elements.ElementsTreeElement.ElementsTreeWidget(undefined, [undefined], view);
      widget.node = node;
      return widget;
    }

    it('eagerly fetches implicit anchor candidates when adorner is updated', async () => {
      const candidatesStub =
          sinon.stub(popoverNode, 'getImplicitAnchorCandidates').resolves([deferredCandidate1, deferredCandidate2]);
      const view = createViewFunctionStub(Elements.ElementsTreeElement.ElementsTreeWidget);

      createWidget(popoverNode, view);
      await view.nextInput;

      sinon.assert.called(candidatesStub);

      const nonPopoverNode = candidate1;
      const nonPopoverStub = sinon.stub(nonPopoverNode, 'getImplicitAnchorCandidates');
      const nonPopoverView = createViewFunctionStub(Elements.ElementsTreeElement.ElementsTreeWidget);
      createWidget(nonPopoverNode, nonPopoverView);
      await nonPopoverView.nextInput;

      sinon.assert.notCalled(nonPopoverStub);
    });

    it('toggles forceShowPopover directly when candidate count <= 1', async () => {
      sinon.stub(popoverNode, 'getImplicitAnchorCandidates').resolves([deferredCandidate1]);

      const forceShowStub = sinon.stub<[Protocol.DOM.ForceShowPopoverRequest]>();
      connection.setSuccessHandler('DOM.forceShowPopover', forceShowStub);

      const view = createViewFunctionStub(Elements.ElementsTreeElement.ElementsTreeWidget);
      createWidget(popoverNode, view);
      await view.nextInput;

      assert.isTrue(view.input.showPopoverAdorner);
      assert.isFalse(view.input.popoverAdornerActive);

      // Click to force-show
      let nextInput = view.nextInput;
      const firstForceShowCall =
          expectCall<[Protocol.DOM.ForceShowPopoverRequest]>(forceShowStub, {fakeFn: () => ({})});
      view.input.onPopoverAdornerClick(new Event('click'));
      const [firstParams] = await firstForceShowCall;
      let input = await nextInput;

      assert.deepEqual(firstParams, {
        nodeId: popoverNode.id,
        enable: true,
        invokerNodeId: 10 as Protocol.DOM.BackendNodeId,
      });
      assert.isTrue(input.popoverAdornerActive);

      // Click again to unforce
      nextInput = view.nextInput;
      const secondForceShowCall =
          expectCall<[Protocol.DOM.ForceShowPopoverRequest]>(forceShowStub, {callCount: 2, fakeFn: () => ({})});
      input.onPopoverAdornerClick(new Event('click'));
      const [secondParams] = await secondForceShowCall;
      input = await nextInput;

      assert.deepEqual(secondParams, {
        nodeId: popoverNode.id,
        enable: false,
        invokerNodeId: undefined,
      });
      assert.isFalse(input.popoverAdornerActive);
    });

    it('shows context menu with candidates when candidate count > 1', async () => {
      sinon.stub(popoverNode, 'getImplicitAnchorCandidates').resolves([deferredCandidate1, deferredCandidate2]);

      const forceShowStub = sinon.stub<[Protocol.DOM.ForceShowPopoverRequest]>();
      connection.setSuccessHandler('DOM.forceShowPopover', forceShowStub);

      const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show');

      const view = createViewFunctionStub(Elements.ElementsTreeElement.ElementsTreeWidget);
      createWidget(popoverNode, view);
      await view.nextInput;

      assert.isTrue(view.input.showPopoverAdorner);
      assert.isFalse(view.input.popoverAdornerActive);

      // Click adorner with 2 candidates
      const showMenuCall1 = expectCall(contextMenuShow, {fakeFn: () => Promise.resolve()});
      view.input.onPopoverAdornerClick(new Event('click'));
      await showMenuCall1;
      const menu1 = contextMenuShow.lastCall.thisValue as UI.ContextMenu.ContextMenu;

      // Should not invoke forceShowPopover directly
      assert.lengthOf(forceShowStub.args, 0);

      const items = menu1.defaultSection().items;
      assert.lengthOf(items, 2);

      const desc1 = items[0].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;
      const desc2 = items[1].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;
      assert.strictEqual(desc1.label, 'button#btn1.primary.btn-lg');
      assert.isFalse(desc1.checked);
      assert.strictEqual(desc2.label, 'button#btn2.secondary');
      assert.isFalse(desc2.checked);

      // Test hover highlight
      const highlightSpy1 = sinon.spy(deferredCandidate1, 'highlight');
      const hideHighlightSpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

      desc1.onHover?.(true);
      sinon.assert.calledOnce(highlightSpy1);

      desc1.onHover?.(false);
      sinon.assert.calledOnce(hideHighlightSpy);

      // Select candidate 1
      let nextInput = view.nextInput;
      const forceShowCall1 = expectCall<[Protocol.DOM.ForceShowPopoverRequest]>(forceShowStub, {fakeFn: () => ({})});
      menu1.invokeHandler(items[0].id());
      const [forceParams1] = await forceShowCall1;
      let input = await nextInput;

      assert.deepEqual(forceParams1, {
        nodeId: popoverNode.id,
        enable: true,
        invokerNodeId: 10 as Protocol.DOM.BackendNodeId,
      });
      assert.isTrue(input.popoverAdornerActive);

      // Click adorner again: active candidate should be checked
      const showMenuCall2 = expectCall(contextMenuShow, {callCount: 2, fakeFn: () => Promise.resolve()});
      input.onPopoverAdornerClick(new Event('click'));
      await showMenuCall2;
      const menu2 = contextMenuShow.lastCall.thisValue as UI.ContextMenu.ContextMenu;

      const itemsAfter = menu2.defaultSection().items;
      assert.isTrue((itemsAfter[0].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor).checked);
      assert.isFalse((itemsAfter[1].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor).checked);

      // Directly selecting a different candidate unforces the old one and forces the new one
      nextInput = view.nextInput;
      const forceShowCall3 =
          expectCall<[Protocol.DOM.ForceShowPopoverRequest]>(forceShowStub, {callCount: 3, fakeFn: () => ({})});
      menu2.invokeHandler(itemsAfter[1].id());
      await forceShowCall3;
      input = await nextInput;

      assert.deepEqual(forceShowStub.getCall(1).args[0], {nodeId: popoverNode.id, enable: false});
      assert.deepEqual(forceShowStub.getCall(2).args[0], {
        nodeId: popoverNode.id,
        enable: true,
        invokerNodeId: 20 as Protocol.DOM.BackendNodeId,
      });
      assert.isTrue(input.popoverAdornerActive);

      // Click adorner again: candidate 2 should now be checked
      const showMenuCall3 = expectCall(contextMenuShow, {callCount: 3, fakeFn: () => Promise.resolve()});
      input.onPopoverAdornerClick(new Event('click'));
      await showMenuCall3;
      const menu3 = contextMenuShow.lastCall.thisValue as UI.ContextMenu.ContextMenu;

      const itemsAfter2 = menu3.defaultSection().items;
      assert.isFalse((itemsAfter2[0].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor).checked);
      assert.isTrue((itemsAfter2[1].buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor).checked);

      // Clicking active candidate 2 un-forces popover
      nextInput = view.nextInput;
      const forceShowCall4 =
          expectCall<[Protocol.DOM.ForceShowPopoverRequest]>(forceShowStub, {callCount: 4, fakeFn: () => ({})});
      menu3.invokeHandler(itemsAfter2[1].id());
      const [forceParams4] = await forceShowCall4;
      input = await nextInput;

      assert.deepEqual(forceParams4, {nodeId: popoverNode.id, enable: false});
      assert.isFalse(input.popoverAdornerActive);
    });
  });
});

describeWithEnvironment('ElementsTreeElement Change Tracking', () => {
  let target: SDK.Target.Target;
  let testDomModel: SDK.DOMModel.DOMModel;
  let universe: TestUniverse;
  let tracker: ChangeTracker.ChangeTracker.ChangeTracker;
  let node: SDK.DOMModel.DOMNode;
  let widget: Elements.ElementsTreeElement.ElementsTreeWidget;

  /** Renders a standalone ElementsTreeWidget for `node` that records changes with `tracker`. */
  function renderWidget(node: SDK.DOMModel.DOMNode): Elements.ElementsTreeElement.ElementsTreeWidget {
    const widget = new Elements.ElementsTreeElement.ElementsTreeWidget(undefined, [undefined, tracker]);
    widget.node = node;
    widget.performUpdate();
    return widget;
  }

  /**
   * `ChangeTracker` records changes on comment threads in `CommentManager`.
   */
  function lastChangeBackendNodeId(): number|undefined {
    return universe.commentManager.getCommentThreads().at(-1)?.anchor.node?.backendNodeId;
  }

  function lastChange(): string|undefined {
    return universe.commentManager.getCommentThreads().at(-1)?.comments[0]?.text;
  }

  /** Types `newText` into the attribute that is currently edited in place and commits it. */
  function commitEditedAttribute(newText: string): void {
    const editedAttribute = widget.contentElement.querySelector('.webkit-html-attribute.editing');
    assert.exists(editedAttribute);
    editedAttribute.textContent = newText;
    widget.editing?.commit();
  }

  /** Starts in-place editing of the tag name, types `newTagName` and commits it. */
  function editTagName(newTagName: string): void {
    assert.isTrue(widget.startEditingTagName());
    const tagNameElement = widget.contentElement.querySelector('.webkit-html-tag-name');
    assert.exists(tagNameElement);
    tagNameElement.textContent = newTagName;
    widget.editing?.commit();
  }

  /** Starts in-place editing of the inline text node, types `newText` and commits it. */
  function editInlineTextNode(newText: string): void {
    const textNodeElement = widget.contentElement.querySelector('.webkit-html-text-node');
    assert.exists(textNodeElement);
    assert.isTrue(widget.startEditingTextNode(textNodeElement));
    textNodeElement.textContent = newText;
    widget.editing?.commit();
  }

  /** Starts editing the node as HTML and waits for the multiline editor to be rendered. */
  async function startEditingAsHTML(): Promise<TextEditor.TextEditor.TextEditor> {
    widget.toggleEditAsHTML();
    // `toggleEditAsHTML` reads the outer HTML asynchronously before it creates the editor.
    await new Promise(resolve => setTimeout(resolve, 0));
    await UI.Widget.Widget.allUpdatesComplete;

    const editor = widget.contentElement.querySelector<TextEditor.TextEditor.TextEditor>('devtools-text-editor');
    assert.exists(editor);
    return editor;
  }

  /** Replaces the content of the multiline HTML editor with `newHTML` and commits it. */
  function commitEditedHTML(editor: TextEditor.TextEditor.TextEditor, newHTML: string): void {
    editor.dispatch({changes: {from: 0, to: editor.state.doc.length, insert: newHTML}});
    widget.editing?.commit();
  }

  beforeEach(() => {
    updateHostConfig({
      devToolsComments: {
        enabled: true,
      },
    });
    universe = new TestUniverse();
    universe.commentManager.setAgentAttached(true);
    tracker = universe.changeTracker;
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = universe.createTarget();
    testDomModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;

    const rootNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'main-div', 'class', 'container'],
      childNodeCount: 1,
      children: [{
        nodeId: 2 as Protocol.DOM.NodeId,
        parentId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '',
        nodeValue: 'Initial Text',
        childNodeCount: 0,
      }],
    });
    assert.isNotNull(rootNode);
    node = rootNode;

    widget = renderWidget(node);
  });

  it('records a change when adding a new attribute', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.(null));

    assert.isTrue(widget.addNewAttribute());
    commitEditedAttribute('data-test="value"');

    assert.strictEqual(lastChange(), 'Added attribute data-test="value"');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('records a change when modifying an existing attribute', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.(null));

    assert.isTrue(widget.triggerEditAttribute('class'));
    commitEditedAttribute('class="container active"');

    assert.strictEqual(lastChange(), 'Changed attribute "class" from "container" to "container active"');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('records a change when renaming an existing attribute', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.(null));

    assert.isTrue(widget.triggerEditAttribute('class'));
    commitEditedAttribute('foo="container"');

    assert.strictEqual(lastChange(), 'Renamed attribute "class" to "foo"');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('records a change when renaming and modifying an existing attribute', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.(null));

    assert.isTrue(widget.triggerEditAttribute('class'));
    commitEditedAttribute('foo="bar"');

    assert.strictEqual(lastChange(), 'Renamed attribute "class"="container" to "foo"="bar"');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('records a change when deleting an attribute', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.(null));

    assert.isTrue(widget.triggerEditAttribute('class'));
    commitEditedAttribute('');

    assert.strictEqual(lastChange(), 'Removed attribute "class"');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('does not record a change when setAttribute fails with an error', () => {
    sinon.stub(node, 'setAttribute').callsFake((_name, _text, callback) => callback?.('Invalid attribute name syntax'));

    assert.isTrue(widget.addNewAttribute());
    commitEditedAttribute('invalid<attr>=1');

    assert.isUndefined(lastChange());
    assert.isEmpty(universe.commentManager.getCommentThreads());
  });

  it('records a change when renaming a tag name', () => {
    let callbackCaptured: ((error: string|null, newNode: SDK.DOMModel.DOMNode|null) => void)|undefined;
    sinon.stub(node, 'setNodeName').callsFake((_name, callback) => {
      callbackCaptured = callback;
    });
    widget.selectNodeAfterEdit = sinon.stub().returns(null);

    editTagName('section');

    assert.exists(callbackCaptured);
    callbackCaptured(null, node);

    assert.strictEqual(lastChange(), 'Renamed tag from <div> to <section>');
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('does not record a change when renaming a tag name fails', () => {
    let callbackCaptured: ((error: string|null, newNode: SDK.DOMModel.DOMNode|null) => void)|undefined;
    sinon.stub(node, 'setNodeName').callsFake((_name, callback) => {
      callbackCaptured = callback;
    });

    editTagName('invalid<tag>');

    assert.exists(callbackCaptured);
    callbackCaptured('Invalid tag name syntax', null);

    assert.isUndefined(lastChange());
    assert.isEmpty(universe.commentManager.getCommentThreads());
  });

  it('records a change when editing an inline text node', () => {
    const textNode = node.children()![0];
    sinon.stub(textNode, 'setNodeValue').callsFake((_value, callback) => callback?.(null));

    editInlineTextNode('Updated Text');

    assert.strictEqual(lastChange(), 'Changed text from "Initial Text" to "Updated Text"');
    assert.strictEqual(lastChangeBackendNodeId(), 2);
  });

  it('does not record a change when editing inline text node fails with an error', () => {
    const textNode = node.children()![0];
    const setNodeValue = sinon.stub(textNode, 'setNodeValue').callsFake((_value, callback) => {
      callback?.('Failed to set text');
    });

    editInlineTextNode('Updated Text');

    sinon.assert.calledOnceWithMatch(setNodeValue, 'Updated Text');
    assert.isUndefined(lastChange());
    assert.isEmpty(universe.commentManager.getCommentThreads());
  });

  it('records a change when editing as HTML', async () => {
    sinon.stub(node, 'getOuterHTML').resolves('<div id="main-div" class="container"></div>');
    sinon.stub(node, 'setOuterHTML').callsFake((_value, callback) => callback?.(null));

    const editor = await startEditingAsHTML();
    commitEditedHTML(editor, '<div id="main-div" class="container"><p>New Child</p></div>');

    assert.strictEqual(
        lastChange(),
        'Changed HTML from "<div id="main-div" class="container"></div>" to ' +
            '"<div id="main-div" class="container"><p>New Child</p></div>"',
    );
    assert.strictEqual(lastChangeBackendNodeId(), 1);
  });

  it('does not record a change when editing as HTML fails with an error', async () => {
    sinon.stub(node, 'getOuterHTML').resolves('<div id="main-div" class="container"></div>');
    const setOuterHTML = sinon.stub(node, 'setOuterHTML').callsFake((_value, callback) => {
      callback?.('Malformed HTML');
    });

    const editor = await startEditingAsHTML();
    commitEditedHTML(editor, '<div id="main-div" class="container"><p>New Child</p></div>');

    sinon.assert.calledOnceWithMatch(setOuterHTML, '<div id="main-div" class="container"><p>New Child</p></div>');
    assert.isUndefined(lastChange());
    assert.isEmpty(universe.commentManager.getCommentThreads());
  });

  it('records a change when removing a node', async () => {
    const parentNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 10 as Protocol.DOM.NodeId,
      backendNodeId: 10 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 1,
      children: [{
        nodeId: 11 as Protocol.DOM.NodeId,
        parentId: 10 as Protocol.DOM.NodeId,
        backendNodeId: 11 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'SPAN',
        localName: 'span',
        nodeValue: '',
        childNodeCount: 0,
      }],
    });
    const childNode = parentNode!.children()![0];
    sinon.stub(childNode, 'removeNode').callsFake(async callback => {
      callback?.(null);
    });

    const childWidget = new Elements.ElementsTreeElement.ElementsTreeWidget(undefined, [undefined, tracker]);
    childWidget.node = childNode;
    await childWidget.remove();

    assert.strictEqual(lastChange(), 'Removed node <span>');
    assert.strictEqual(lastChangeBackendNodeId(), 11);
  });

  it('does not record a change when removing a node fails with an error', async () => {
    const parentNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 10 as Protocol.DOM.NodeId,
      backendNodeId: 10 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 1,
      children: [{
        nodeId: 11 as Protocol.DOM.NodeId,
        parentId: 10 as Protocol.DOM.NodeId,
        backendNodeId: 11 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'SPAN',
        localName: 'span',
        nodeValue: '',
        childNodeCount: 0,
      }],
    });
    const childNode = parentNode!.children()![0];
    sinon.stub(childNode, 'removeNode').callsFake(async callback => {
      callback?.('Cannot remove node');
    });

    const childWidget = new Elements.ElementsTreeElement.ElementsTreeWidget(undefined, [undefined, tracker]);
    childWidget.node = childNode;
    await childWidget.remove();

    assert.isUndefined(lastChange());
    assert.isEmpty(universe.commentManager.getCommentThreads());
  });

  it('unhides hidden node before removal without recording an additional change', async () => {
    const parentNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 10 as Protocol.DOM.NodeId,
      backendNodeId: 10 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 1,
      children: [{
        nodeId: 11 as Protocol.DOM.NodeId,
        parentId: 10 as Protocol.DOM.NodeId,
        backendNodeId: 11 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'SPAN',
        localName: 'span',
        nodeValue: '',
        childNodeCount: 0,
      }],
    });
    const childNode = parentNode!.children()![0];
    sinon.stub(childNode, 'isToggledToHidden').returns(true);
    const toggleHideStub = sinon.stub(childNode, 'toggleHideElement').resolves();
    sinon.stub(childNode, 'removeNode').callsFake(async callback => {
      callback?.(null);
    });

    const childWidget = new Elements.ElementsTreeElement.ElementsTreeWidget(undefined, [undefined, tracker]);
    childWidget.isToggledToHidden = node => node.isToggledToHidden();
    childWidget.node = childNode;
    await childWidget.remove();

    sinon.assert.calledOnce(toggleHideStub);
    const threads = universe.commentManager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].comments[0].text, 'Removed node <span>');
  });

  it('renders RTL and BiDi Arabic and Hebrew text in attributes and text nodes', () => {
    const bidiNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 20 as Protocol.DOM.NodeId,
      backendNodeId: 20 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['title', 'اختبار النص العربي'],
      childNodeCount: 1,
      children: [{
        nodeId: 21 as Protocol.DOM.NodeId,
        parentId: 20 as Protocol.DOM.NodeId,
        backendNodeId: 21 as Protocol.DOM.BackendNodeId,
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '',
        nodeValue: 'טקסט בעברית',
        childNodeCount: 0,
      }],
    });
    const bidiWidget = renderWidget(bidiNode);

    const attrVal = bidiWidget.contentElement.querySelector('.webkit-html-attribute-value');
    const textEl = bidiWidget.contentElement.querySelector('.webkit-html-text-node');
    assert.strictEqual(attrVal?.textContent?.replace(/\u200B/g, '').trim(), 'اختبار النص العربي');
    assert.strictEqual(textEl?.textContent, 'טקסט בעברית');
  });

  it('renders lowercase HTML tag names and camelCase SVG tag names via nodeNameInCorrectCase', () => {
    const htmlNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 30 as Protocol.DOM.NodeId,
      backendNodeId: 30 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
    });
    const svgNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 31 as Protocol.DOM.NodeId,
      backendNodeId: 31 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'feComposite',
      localName: 'feComposite',
      nodeValue: '',
      childNodeCount: 0,
    });
    const htmlWidget = renderWidget(htmlNode);
    const svgWidget = renderWidget(svgNode);

    assert.strictEqual(htmlNode.nodeNameInCorrectCase(), 'div');
    assert.strictEqual(svgNode.nodeNameInCorrectCase(), 'feComposite');
    assert.strictEqual(htmlWidget.contentElement.querySelector('.webkit-html-tag-name')?.textContent, 'div');
    assert.strictEqual(svgWidget.contentElement.querySelector('.webkit-html-tag-name')?.textContent, 'feComposite');
  });

  it('renders special whitespace and entities in ElementsTreeElement', () => {
    const entityNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 40 as Protocol.DOM.NodeId,
      backendNodeId: 40 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'SPAN',
      localName: 'span',
      nodeValue: '',
      childNodeCount: 1,
      children: [{
        nodeId: 41 as Protocol.DOM.NodeId,
        parentId: 40 as Protocol.DOM.NodeId,
        backendNodeId: 41 as Protocol.DOM.BackendNodeId,
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '',
        nodeValue: 'a\u00A0b\u00ADc\uFEFFd\u200Be',
        childNodeCount: 0,
      }],
    });
    const entityWidget = renderWidget(entityNode);

    const entities =
        Array.from(entityWidget.contentElement.querySelectorAll('.webkit-html-entity-value')).map(el => el.textContent);
    assert.deepEqual(entities, ['&nbsp;', '&shy;', '&#xFEFF;', '&ZeroWidthSpace;']);
  });

  it('renders ZWNJ inside BiDi attribute values and text nodes as &zwnj; entities', () => {
    // Mirrors legacy elements/bidi-dom-tree.
    const bidiValue =
        '\u0648\u06CC\u06A9\u06CC\u200C\u067E\u062F\u06CC\u0627:\u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06CC\u062F';
    const expectedValue =
        '\u0648\u06CC\u06A9\u06CC&zwnj;\u067E\u062F\u06CC\u0627:\u062E\u0648\u0634&zwnj;\u0622\u0645\u062F\u06CC\u062F';
    const bidiNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 60 as Protocol.DOM.NodeId,
      backendNodeId: 60 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['title', bidiValue],
      childNodeCount: 1,
      children: [{
        nodeId: 61 as Protocol.DOM.NodeId,
        parentId: 60 as Protocol.DOM.NodeId,
        backendNodeId: 61 as Protocol.DOM.BackendNodeId,
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '',
        nodeValue: bidiValue,
        childNodeCount: 0,
      }],
    });
    const bidiWidget = renderWidget(bidiNode);

    const attrVal = bidiWidget.contentElement.querySelector('.webkit-html-attribute-value');
    const textEl = bidiWidget.contentElement.querySelector('.webkit-html-text-node');
    assert.strictEqual(attrVal?.textContent?.replace(/\u200B/g, ''), expectedValue);
    assert.strictEqual(textEl?.textContent, expectedValue);
    assert.notInclude(attrVal?.textContent ?? '', '\u200C');
    assert.notInclude(textEl?.textContent ?? '', '\u200C');
    const attrEntities =
        Array.from(attrVal?.querySelectorAll('.webkit-html-entity-value') ?? []).map(e => e.textContent);
    const textEntities =
        Array.from(textEl?.querySelectorAll('.webkit-html-entity-value') ?? []).map(e => e.textContent);
    assert.deepEqual(attrEntities, ['&zwnj;', '&zwnj;']);
    assert.deepEqual(textEntities, ['&zwnj;', '&zwnj;']);
  });

  it('renders a text child consisting of only U+FEFF inline as &#xFEFF;', () => {
    // Mirrors the #replacement-character element from legacy elements/elements-panel-structure.
    const node = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 70 as Protocol.DOM.NodeId,
      backendNodeId: 70 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'replacement-character'],
      childNodeCount: 1,
      children: [{
        nodeId: 71 as Protocol.DOM.NodeId,
        parentId: 70 as Protocol.DOM.NodeId,
        backendNodeId: 71 as Protocol.DOM.BackendNodeId,
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '',
        nodeValue: '\uFEFF',
        childNodeCount: 0,
      }],
    });
    assert.isTrue(Elements.ElementsTreeElement.ElementsTreeWidget.canShowInlineText(node));
    const feffWidget = renderWidget(node);

    const textEl = feffWidget.contentElement.querySelector('.webkit-html-text-node');
    assert.strictEqual(textEl?.textContent, '&#xFEFF;');
    assert.strictEqual(textEl?.querySelector('.webkit-html-entity-value')?.textContent, '&#xFEFF;');
    assert.strictEqual(feffWidget.contentElement.textContent?.replace(/\u200B/g, '').replace(/\s+/g, ''),
                       '<divid="replacement-character">&#xFEFF;</div>');
  });

  it('disallows editing text and processing instruction nodes exceeding MaxEditableTextSize', () => {
    const editableValue = 'a'.repeat(Elements.ElementsTreeElement.MaxEditableTextSize);
    const truncatedValue = editableValue + '\u2026';

    const editableTextNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 80 as Protocol.DOM.NodeId,
      backendNodeId: 80 as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: editableValue,
      childNodeCount: 0,
    });
    const truncatedTextNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 81 as Protocol.DOM.NodeId,
      backendNodeId: 81 as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: truncatedValue,
      childNodeCount: 0,
    });
    const truncatedProcessingInstructionNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
      nodeId: 82 as Protocol.DOM.NodeId,
      backendNodeId: 82 as Protocol.DOM.BackendNodeId,
      nodeType: Node.PROCESSING_INSTRUCTION_NODE,
      nodeName: 'xml-stylesheet',
      localName: '',
      nodeValue: truncatedValue,
      childNodeCount: 0,
    });

    assert.isTrue(Elements.ElementsTreeElement.ElementsTreeWidget.canEditTextNode(editableTextNode));
    assert.isFalse(Elements.ElementsTreeElement.ElementsTreeWidget.canEditTextNode(truncatedTextNode));
    assert.isFalse(Elements.ElementsTreeElement.ElementsTreeWidget.canEditTextNode(truncatedProcessingInstructionNode));

    const truncatedTextWidget = renderWidget(truncatedTextNode);
    const truncatedPiWidget = renderWidget(truncatedProcessingInstructionNode);

    const textSpan = truncatedTextWidget.contentElement.querySelector('.webkit-html-text-node');
    assert.exists(textSpan);
    assert.isFalse(truncatedTextWidget.startEditingTextNode(textSpan));
    assert.isNull(truncatedTextWidget.editing);

    assert.isFalse(truncatedPiWidget.startEditingProcessingInstructionValue());
    assert.isNull(truncatedPiWidget.editing);
  });
});
