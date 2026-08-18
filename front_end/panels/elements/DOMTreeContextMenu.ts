// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Emulation from '../emulation/emulation.js';

import {canGetJSPath} from './DOMPath.js';
import {ElementsPanel} from './ElementsPanel.js';
import {ElementsTreeElement} from './ElementsTreeElement.js';
import type {ElementsTreeOutline} from './ElementsTreeOutline.js';

const UIStrings = {
  /**
   * @description A context menu item to store a value as a global variable the Elements Panel
   */
  storeAsGlobalVariable: 'Store as global variable',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  addAttribute: 'Add attribute',
  /**
   * @description Text to modify the attribute of an item
   */
  editAttribute: 'Edit attribute',
  /**
   * @description Text to focus on something
   */
  focus: 'Focus',
  /**
   * @description Text to scroll the displayed content into view
   */
  scrollIntoView: 'Scroll into view',
  /**
   * @description A context menu item in the Elements panel to switch to Accessibility tree
   */
  switchToAccessibilityTree: 'Switch to accessibility tree',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  editText: 'Edit text',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  editAsHtml: 'Edit as HTML',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  editData: 'Edit data',
  /**
   * @description Text to cut an element, cut should be used as a verb
   */
  cut: 'Cut',
  /**
   * @description Text for copying, copy should be used as a verb
   */
  copy: 'Copy',
  /**
   * @description Text to paste an element, paste should be used as a verb
   */
  paste: 'Paste',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyOuterhtml: 'Copy outerHTML',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copySelector: 'Copy `selector`',
  /**
   * @description Text in Elements Tree Element of the Elements panel
   */
  copyJsPath: 'Copy JS path',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyStyles: 'Copy styles',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyXpath: 'Copy XPath',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyFullXpath: 'Copy full XPath',
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyElement: 'Copy element',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  duplicateElement: 'Duplicate element',
  /**
   * @description Text to hide an element
   */
  hideElement: 'Hide element',
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  deleteElement: 'Delete element',
  /**
   * @description Text to expand something recursively
   */
  expandRecursively: 'Expand recursively',
  /**
   * @description Text to collapse children of a parent group
   */
  collapseChildren: 'Collapse children',
  /**
   * @description Title of an action in the emulation tool to capture node screenshot
   */
  captureNodeScreenshot: 'Capture node screenshot',
  /**
   * @description Title of a context menu item. When clicked DevTools goes to the Application panel and shows this specific iframe's details
   */
  showFrameDetails: 'Show `iframe` details',
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: 'Start a chat',
  /**
   * @description Context menu item in Elements panel to assess visibility of an element via AI.
   */
  assessVisibility: 'Assess visibility',
  /**
   * @description Context menu item in Elements panel to center an element via AI.
   */
  centerElement: 'Center element',
  /**
   * @description Context menu item in Elements panel to wrap flex items via AI.
   */
  wrapTheseItems: 'Wrap these items',
  /**
   * @description Context menu item in Elements panel to distribute flex items evenly via AI.
   */
  distributeItemsEvenly: 'Distribute items evenly',
  /**
   * @description Context menu item in Elements panel to explain flexbox via AI.
   */
  explainFlexbox: 'Explain flexbox',
  /**
   * @description Context menu item in Elements panel to align grid items via AI.
   */
  alignItems: 'Align items',
  /**
   * @description Context menu item in Elements panel to add padding/gap to grid via AI.
   */
  addPadding: 'Add padding',
  /**
   * @description Context menu item in Elements panel to explain grid layout via AI.
   */
  explainGridLayout: 'Explain grid layout',
  /**
   * @description Context menu item in Elements panel to find grid definition for a subgrid item via AI.
   */
  findGridDefinition: 'Find grid definition',
  /**
   * @description Context menu item in Elements panel to change parent grid properties for a subgrid item via AI.
   */
  changeParentProperties: 'Change parent properties',
  /**
   * @description Context menu item in Elements panel to explain subgrids via AI.
   */
  explainSubgrids: 'Explain subgrids',
  /**
   * @description Context menu item in Elements panel to remove scrollbars via AI.
   */
  removeScrollbars: 'Remove scrollbars',
  /**
   * @description Context menu item in Elements panel to style scrollbars via AI.
   */
  styleScrollbars: 'Style scrollbars',
  /**
   * @description Context menu item in Elements panel to explain scrollbars via AI.
   */
  explainScrollbars: 'Explain scrollbars',
  /**
   * @description Context menu item in Elements panel to explain container queries via AI.
   */
  explainContainerQueries: 'Explain container queries',
  /**
   * @description Context menu item in Elements panel to explain container types via AI.
   */
  explainContainerTypes: 'Explain container types',
  /**
   * @description Context menu item in Elements panel to explain container context via AI.
   */
  explainContainerContext: 'Explain container context',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/DOMTreeContextMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export async function populateNodeContextMenu(contextMenu: UI.ContextMenu.ContextMenu,
                                              treeElement: ElementsTreeElement): Promise<void> {
  const domNode = treeElement.node();
  const isEditable = treeElement.hasEditableNode();
  if (isEditable && !treeElement.isEditing) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.editAsHtml), () => treeElement.editAsHTML(),
                                         {jslogContext: 'elements.edit-as-html'});
  }
  const isShadowRoot = domNode.isShadowRoot();

  const createShortcut = UI.KeyboardShortcut.KeyboardShortcut.shortcutToString.bind(null);
  const modifier = UI.KeyboardShortcut.Modifiers.CtrlOrMeta.value;
  let menuItem;

  const openAiAssistanceId = 'freestyler.element-panel-context';
  if (UI.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
    function appendSubmenuPromptAction(submenu: UI.ContextMenu.SubMenu, action: UI.ActionRegistration.Action,
                                       label: Common.UIString.LocalizedString, prompt: string,
                                       jslogContext: string): void {
      submenu.defaultSection().appendItem(label, () => {
        void action.execute({prompt});
        UI.UIUtils.PromotionManager.instance().recordFeatureInteraction(openAiAssistanceId);
      }, {disabled: !action.enabled(), jslogContext});
    }
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, domNode);
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
    const submenu = contextMenu.footerSection().appendSubMenuItem(action.title(), false, openAiAssistanceId);
    submenu.defaultSection().appendAction(openAiAssistanceId, i18nString(UIStrings.startAChat));

    const submenuConfigs = [
      {
        condition: (props: SDK.CSSModel.LayoutProperties|null): boolean => Boolean(props?.isFlex),
        items: [
          {
            label: i18nString(UIStrings.wrapTheseItems),
            prompt: 'How can I make flex items wrap?',
            jslogContextSuffix: '.flex-wrap',
          },
          {
            label: i18nString(UIStrings.distributeItemsEvenly),
            prompt: 'How do I distribute flex items evenly?',
            jslogContextSuffix: '.flex-distribute',
          },
          {
            label: i18nString(UIStrings.explainFlexbox),
            prompt: 'What is flexbox?',
            jslogContextSuffix: '.flex-what',
          },
        ],
      },
      {
        condition: (props: SDK.CSSModel.LayoutProperties|null): boolean => Boolean(props?.isGrid && !props?.isSubgrid),
        items: [
          {
            label: i18nString(UIStrings.alignItems),
            prompt: 'How do I align items in a grid?',
            jslogContextSuffix: '.grid-align',
          },
          {
            label: i18nString(UIStrings.addPadding),
            prompt: 'How to add spacing between grid items?',
            jslogContextSuffix: '.grid-gap',
          },
          {
            label: i18nString(UIStrings.explainGridLayout),
            prompt: 'How does grid layout work?',
            jslogContextSuffix: '.grid-how',
          },
        ],
      },
      {
        condition: (props: SDK.CSSModel.LayoutProperties|null): boolean => Boolean(props?.isSubgrid),
        items: [
          {
            label: i18nString(UIStrings.findGridDefinition),
            prompt: 'Where is this grid defined?',
            jslogContextSuffix: '.subgrid-where',
          },
          {
            label: i18nString(UIStrings.changeParentProperties),
            prompt: 'How to overwrite parent grid properties?',
            jslogContextSuffix: '.subgrid-override',
          },
          {
            label: i18nString(UIStrings.explainSubgrids),
            prompt: 'How do subgrids work?',
            jslogContextSuffix: '.subgrid-how',
          },
        ],
      },
      {
        condition: (props: SDK.CSSModel.LayoutProperties|null): boolean => Boolean(props?.hasScroll),
        items: [
          {
            label: i18nString(UIStrings.removeScrollbars),
            prompt: 'How do I remove scrollbars for this element?',
            jslogContextSuffix: '.scroll-remove',
          },
          {
            label: i18nString(UIStrings.styleScrollbars),
            prompt: 'How can I style a scrollbar?',
            jslogContextSuffix: '.scroll-style',
          },
          {
            label: i18nString(UIStrings.explainScrollbars),
            prompt: 'Why does this element scroll?',
            jslogContextSuffix: '.scroll-why',
          },
        ],
      },
      {
        condition: (props: SDK.CSSModel.LayoutProperties|null): boolean => Boolean(props?.containerType),
        items: [
          {
            label: i18nString(UIStrings.explainContainerQueries),
            prompt: 'What are container queries?',
            jslogContextSuffix: '.container-what',
          },
          {
            label: i18nString(UIStrings.explainContainerTypes),
            prompt: 'How do I use container-type?',
            jslogContextSuffix: '.container-how',
          },
          {
            label: i18nString(UIStrings.explainContainerContext),
            prompt: 'What\'s the container context for this element?',
            jslogContextSuffix: '.container-context',
          },
        ],
      },
      {
        // Default items
        condition: (): boolean => true,
        items: [
          {
            label: i18nString(UIStrings.assessVisibility),
            prompt: 'Why isn’t this element visible?',
            jslogContextSuffix: '.visibility',
          },
          {
            label: i18nString(UIStrings.centerElement),
            prompt: 'How do I center this element?',
            jslogContextSuffix: '.center',
          },
        ],
      },
    ];

    const layoutProps = await domNode.domModel().cssModel().getLayoutPropertiesFromComputedStyle(domNode.id);
    const config = submenuConfigs.find(c => c.condition(layoutProps));
    if (config) {
      for (const item of config.items) {
        appendSubmenuPromptAction(submenu, action, item.label, item.prompt,
                                  openAiAssistanceId + item.jslogContextSuffix);
      }
    }
  }

  const outline = treeElement.treeOutline as ElementsTreeOutline | null;

  menuItem = contextMenu.clipboardSection().appendItem(i18nString(UIStrings.cut),
                                                       () => outline?.performCopyOrCut(true, domNode),
                                                       {disabled: !treeElement.hasEditableNode(), jslogContext: 'cut'});
  menuItem.setShortcut(createShortcut('X', modifier));

  // Place it here so that all "Copy"-ing items stick together.
  const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy), false, 'copy');
  const section = copyMenu.section();
  if (!isShadowRoot) {
    menuItem = section.appendItem(i18nString(UIStrings.copyOuterhtml), () => outline?.performCopyOrCut(false, domNode),
                                  {jslogContext: 'copy-outer-html'});
    menuItem.setShortcut(createShortcut('V', modifier));
  }
  if (domNode.nodeType() === Node.ELEMENT_NODE) {
    section.appendItem(i18nString(UIStrings.copySelector), () => treeElement.copyCSSPath(),
                       {jslogContext: 'copy-selector'});
    section.appendItem(i18nString(UIStrings.copyJsPath), () => treeElement.copyJSPath(),
                       {disabled: !canGetJSPath(domNode), jslogContext: 'copy-js-path'});
    section.appendItem(i18nString(UIStrings.copyStyles), () => void treeElement.copyStyles(),
                       {jslogContext: 'elements.copy-styles'});
  }
  if (!isShadowRoot) {
    section.appendItem(i18nString(UIStrings.copyXpath), () => treeElement.copyXPath(), {jslogContext: 'copy-xpath'});
    section.appendItem(i18nString(UIStrings.copyFullXpath), () => treeElement.copyFullXPath(),
                       {jslogContext: 'copy-full-xpath'});
  }

  menuItem = copyMenu.clipboardSection().appendItem(i18nString(UIStrings.copyElement),
                                                    () => outline?.performCopyOrCut(false, domNode, true),
                                                    {jslogContext: 'copy-element'});
  menuItem.setShortcut(createShortcut('C', modifier));

  if (!isShadowRoot) {
    // Duplicate element, disabled on root element and ShadowDOM.
    const isRootElement = !domNode.parentNode || domNode.parentNode.nodeName() === '#document';
    menuItem = contextMenu.editSection().appendItem(i18nString(UIStrings.duplicateElement),
                                                    () => outline?.duplicateNode(domNode), {
                                                      disabled: (domNode.isInShadowTree() || isRootElement),
                                                      jslogContext: 'elements.duplicate-element',
                                                    });
  }

  menuItem = contextMenu.clipboardSection().appendItem(i18nString(UIStrings.paste), () => outline?.pasteNode(domNode),
                                                       {disabled: !outline?.canPaste(domNode), jslogContext: 'paste'});
  menuItem.setShortcut(createShortcut('V', modifier));

  menuItem = contextMenu.debugSection().appendCheckboxItem(i18nString(UIStrings.hideElement),
                                                           () => outline?.toggleHideElement(domNode), {
                                                             checked: Boolean(outline?.isToggledToHidden(domNode)),
                                                             jslogContext: 'elements.hide-element',
                                                           });
  menuItem.setShortcut(
      UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('elements.hide-element') || '');

  if (isEditable) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.deleteElement), () => void treeElement.remove(),
                                         {jslogContext: 'delete-element'});
  }

  contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively),
                                       () => void treeElement.expandRecursively(),
                                       {jslogContext: 'expand-recursively'});
  contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), () => treeElement.collapseChildren(),
                                       {jslogContext: 'collapse-children'});
  contextMenu.viewSection().appendItem(i18nString(UIStrings.switchToAccessibilityTree),
                                       () => ElementsPanel.instance().toggleAccessibilityTree(),
                                       {jslogContext: 'switch-to-accessibility-tree'});
  const deviceModeWrapperAction = new Emulation.DeviceModeView.ActionDelegate();
  contextMenu.viewSection().appendItem(i18nString(UIStrings.captureNodeScreenshot),
                                       deviceModeWrapperAction.handleAction.bind(null, UI.Context.Context.instance(),
                                                                                 'emulation.capture-node-screenshot'),
                                       {jslogContext: 'emulation.capture-node-screenshot'});
  if (domNode.frameOwnerFrameId()) {
    contextMenu.viewSection().appendItem(i18nString(UIStrings.showFrameDetails), () => {
      const frameOwnerFrameId = domNode.frameOwnerFrameId();
      if (frameOwnerFrameId) {
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameOwnerFrameId);
        void Common.Revealer.reveal(frame);
      }
    }, {jslogContext: 'show-frame-details'});
  }
}

export async function showContextMenu(
    treeElement: ElementsTreeElement,
    event: Event,
    ): Promise<UI.ContextMenu.ContextMenu|undefined> {
  if (UI.UIUtils.isEditing()) {
    return;
  }

  const outline = treeElement.treeOutline as ElementsTreeOutline | null;
  if (outline && !outline.enableContextMenu) {
    return;
  }

  const node = (event.target as Node | null);
  if (!node) {
    return;
  }

  // The context menu construction may be async. In order to
  // make sure that no other (default) context menu shows up, we need
  // to stop propagating and prevent the default action.
  event.stopPropagation();
  event.preventDefault();

  const contextMenu = new UI.ContextMenu.ContextMenu(event);
  const domNode = treeElement.node();
  const isPseudoElement = Boolean(domNode.pseudoType());
  const isTag = domNode.nodeType() === Node.ELEMENT_NODE && !isPseudoElement;

  let textNode: Element|null = (node as Element).enclosingNodeOrSelfWithClass?.('webkit-html-text-node');
  if (textNode?.classList.contains('bogus')) {
    textNode = null;
  }
  const commentNode = (node as Element).enclosingNodeOrSelfWithClass?.('webkit-html-comment');
  contextMenu.saveSection().appendItem(i18nString(UIStrings.storeAsGlobalVariable),
                                       () => void domNode.saveNodeToTempVariable(),
                                       {jslogContext: 'store-as-global-variable'});
  if (textNode) {
    if (!treeElement.isEditing) {
      contextMenu.editSection().appendItem(i18nString(UIStrings.editText),
                                           () => treeElement.startEditingTextNode(textNode as Element),
                                           {jslogContext: 'edit-text'});
    }
    await populateNodeContextMenu(contextMenu, treeElement);
  } else if (isTag) {
    const targetWidget = treeElement.isClosingTag() ?
        ((treeElement.treeOutline as ElementsTreeOutline | null)?.findTreeElement(domNode) as ElementsTreeElement |
         null) :
        treeElement;
    if (targetWidget) {
      contextMenu.editSection().appendItem(i18nString(UIStrings.addAttribute), () => targetWidget.addNewAttribute(),
                                           {jslogContext: 'add-attribute'});
    }

    const target = (event.composedPath()[0] || event.target) as Element;
    const attribute = target.enclosingNodeOrSelfWithClass?.('webkit-html-attribute');
    const newAttribute = target.enclosingNodeOrSelfWithClass?.('add-attribute');
    if (attribute && !newAttribute) {
      contextMenu.editSection().appendItem(i18nString(UIStrings.editAttribute),
                                           () => treeElement.startEditingAttribute(attribute, target),
                                           {jslogContext: 'edit-attribute'});
    }
    await populateNodeContextMenu(contextMenu, treeElement);
    ElementsTreeElement.populateForcedPseudoStateItems(contextMenu, domNode);
    contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => domNode.scrollIntoView(),
                                         {jslogContext: 'scroll-into-view'});
    contextMenu.viewSection().appendItem(i18nString(UIStrings.focus), async () => {
      await domNode.focus();
    }, {jslogContext: 'focus'});
  } else if (commentNode) {
    await populateNodeContextMenu(contextMenu, treeElement);
  } else if (isPseudoElement) {
    if (treeElement.childCount() !== 0) {
      contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively),
                                           () => void treeElement.expandRecursively(),
                                           {jslogContext: 'expand-recursively'});
    }
    contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => domNode.scrollIntoView(),
                                         {jslogContext: 'scroll-into-view'});
  } else if (domNode.nodeType() === Node.PROCESSING_INSTRUCTION_NODE) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.editData),
                                         () => treeElement.startEditingProcessingInstructionValue(),
                                         {jslogContext: 'elements.edit-data'});
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.duplicateElement),
        () => (treeElement.treeOutline as ElementsTreeOutline | null)?.duplicateNode(domNode), {
          disabled: domNode.isInShadowTree(),
          jslogContext: 'elements.duplicate-element',
        });
    contextMenu.editSection().appendItem(i18nString(UIStrings.deleteElement), () => void treeElement.remove(),
                                         {jslogContext: 'delete-element'});
  }

  ElementsPanel.instance().populateAdornerSettingsContextMenu(contextMenu);

  contextMenu.appendApplicableItems(domNode);
  void contextMenu.show();
  return contextMenu;
}
