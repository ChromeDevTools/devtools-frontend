// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Emulation from '../emulation/emulation.js';

import {canGetJSPath} from './DOMPath.js';
import {DOMTreeElementWidget} from './DOMTreeElementWidget.js';
import type {DOMTreeWidget} from './DOMTreeWidget.js';
import {ElementsPanel} from './ElementsPanel.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/DOMTreeContextMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function populateNodeContextMenu(
    contextMenu: UI.ContextMenu.ContextMenu,
    domTreeWidget: DOMTreeWidget,
    domNode: SDK.DOMModel.DOMNode,
    ): void {
  const isEditable = !domNode.isShadowRoot() && !domNode.ancestorUserAgentShadowRoot();
  if (isEditable) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.editAsHtml),
                                         () => domTreeWidget.toggleEditAsHTML(domNode),
                                         {jslogContext: 'elements.edit-as-html'});
  }
  const isShadowRoot = domNode.isShadowRoot();

  const createShortcut = UI.KeyboardShortcut.KeyboardShortcut.shortcutToString.bind(null);
  const modifier = UI.KeyboardShortcut.Modifiers.CtrlOrMeta.value;
  let menuItem;

  const openAiAssistanceId = 'freestyler.element-panel-context';
  if (UI.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, domNode);
    contextMenu.footerSection().appendAction(openAiAssistanceId);
  }

  menuItem = contextMenu.clipboardSection().appendItem(i18nString(UIStrings.cut),
                                                       () => domTreeWidget.performCopyOrCut(true, domNode),
                                                       {disabled: !isEditable, jslogContext: 'cut'});
  menuItem.setShortcut(createShortcut('X', modifier));

  // Place it here so that all "Copy"-ing items stick together.
  const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy), false, 'copy');
  const section = copyMenu.section();
  if (!isShadowRoot) {
    menuItem =
        section.appendItem(i18nString(UIStrings.copyOuterhtml), () => domTreeWidget.performCopyOrCut(false, domNode),
                           {jslogContext: 'copy-outer-html'});
    menuItem.setShortcut(createShortcut('V', modifier));
  }
  if (domNode.nodeType() === Node.ELEMENT_NODE) {
    section.appendItem(i18nString(UIStrings.copySelector), () => domTreeWidget.copyCSSPath(domNode),
                       {jslogContext: 'copy-selector'});
    section.appendItem(i18nString(UIStrings.copyJsPath), () => domTreeWidget.copyJSPath(domNode),
                       {disabled: !canGetJSPath(domNode), jslogContext: 'copy-js-path'});
    section.appendItem(i18nString(UIStrings.copyStyles), () => void domTreeWidget.copyStyles(domNode),
                       {jslogContext: 'elements.copy-styles'});
  }
  if (!isShadowRoot) {
    section.appendItem(i18nString(UIStrings.copyXpath), () => void domTreeWidget.copyXPath(domNode),
                       {jslogContext: 'copy-xpath'});
    section.appendItem(i18nString(UIStrings.copyFullXpath), () => void domTreeWidget.copyFullXPath(domNode),
                       {jslogContext: 'copy-full-xpath'});
  }

  menuItem = copyMenu.clipboardSection().appendItem(i18nString(UIStrings.copyElement),
                                                    () => domTreeWidget.performCopyOrCut(false, domNode, true),
                                                    {jslogContext: 'copy-element'});
  menuItem.setShortcut(createShortcut('C', modifier));

  if (!isShadowRoot) {
    // Duplicate element, disabled on root element and ShadowDOM.
    const isRootElement = !domNode.parentNode || domNode.parentNode.nodeName() === '#document';
    menuItem = contextMenu.editSection().appendItem(i18nString(UIStrings.duplicateElement),
                                                    () => domTreeWidget.duplicateNode(domNode), {
                                                      disabled: (domNode.isInShadowTree() || isRootElement),
                                                      jslogContext: 'elements.duplicate-element',
                                                    });
  }

  menuItem =
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.paste), () => domTreeWidget.pasteNode(domNode),
                                                {disabled: !domTreeWidget.canPaste(domNode), jslogContext: 'paste'});
  menuItem.setShortcut(createShortcut('V', modifier));

  menuItem = contextMenu.debugSection().appendCheckboxItem(i18nString(UIStrings.hideElement),
                                                           () => domTreeWidget.toggleHideElement(domNode), {
                                                             checked: Boolean(domTreeWidget.isToggledToHidden(domNode)),
                                                             jslogContext: 'elements.hide-element',
                                                           });
  menuItem.setShortcut(
      UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('elements.hide-element') || '');

  if (isEditable) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.deleteElement),
                                         () => void domTreeWidget.removeNode(domNode),
                                         {jslogContext: 'delete-element'});
  }

  contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively),
                                       () => void domTreeWidget.expandRecursively(domNode),
                                       {jslogContext: 'expand-recursively'});
  contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren),
                                       () => domTreeWidget.collapseChildren(domNode),
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
    domTreeWidget: DOMTreeWidget,
    domNode: SDK.DOMModel.DOMNode,
    event: Event,
    ): Promise<UI.ContextMenu.ContextMenu|undefined> {
  if (UI.UIUtils.isEditing()) {
    return;
  }

  if (!domTreeWidget.enableContextMenu) {
    return;
  }

  const node = (event.target as Node | null);
  if (!node) {
    return;
  }

  // In order to make sure that no other (default) context menu shows up, we need
  // to stop propagating and prevent the default action.
  event.stopPropagation();
  event.preventDefault();

  const contextMenu = new UI.ContextMenu.ContextMenu(event);
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
    contextMenu.editSection().appendItem(i18nString(UIStrings.editText),
                                         () => domTreeWidget.startEditingTextNode(domNode), {
                                           disabled: !DOMTreeElementWidget.canEditTextNode(domNode),
                                           jslogContext: 'edit-text',
                                         });
    populateNodeContextMenu(contextMenu, domTreeWidget, domNode);
  } else if (isTag) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.addAttribute),
                                         () => domTreeWidget.addNewAttribute(domNode), {jslogContext: 'add-attribute'});

    const target = (event.composedPath()[0] || event.target) as Element;
    const attribute = target.enclosingNodeOrSelfWithClass?.('webkit-html-attribute');
    const newAttribute = target.enclosingNodeOrSelfWithClass?.('add-attribute');
    if (attribute && !newAttribute) {
      const attributeName = attribute.querySelector('.webkit-html-attribute-name')?.textContent?.trim();
      if (attributeName) {
        contextMenu.editSection().appendItem(i18nString(UIStrings.editAttribute),
                                             () => domTreeWidget.startEditing(domNode, attributeName),
                                             {jslogContext: 'edit-attribute'});
      }
    }
    populateNodeContextMenu(contextMenu, domTreeWidget, domNode);
    DOMTreeElementWidget.populateForcedPseudoStateItems(contextMenu, domNode);
    contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => domNode.scrollIntoView(),
                                         {jslogContext: 'scroll-into-view'});
    contextMenu.viewSection().appendItem(i18nString(UIStrings.focus), async () => {
      await domNode.focus();
    }, {jslogContext: 'focus'});
  } else if (commentNode) {
    populateNodeContextMenu(contextMenu, domTreeWidget, domNode);
  } else if (isPseudoElement) {
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy), false, 'copy');
    const section = copyMenu.section();
    section.appendItem(i18nString(UIStrings.copySelector), () => domTreeWidget.copyCSSPath(domNode),
                       {jslogContext: 'copy-selector'});
    section.appendItem(i18nString(UIStrings.copyStyles), () => void domTreeWidget.copyStyles(domNode),
                       {jslogContext: 'elements.copy-styles'});

    const hideItem = contextMenu.debugSection().appendCheckboxItem(
        i18nString(UIStrings.hideElement), () => domTreeWidget.toggleHideElement(domNode), {
          checked: Boolean(domTreeWidget.isToggledToHidden(domNode)),
          jslogContext: 'elements.hide-element',
        });
    hideItem.setShortcut(
        UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('elements.hide-element') || '');

    if (domNode.childNodeCount() !== 0 || domNode.hasPseudoElements()) {
      contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively),
                                           () => void domTreeWidget.expandRecursively(domNode),
                                           {jslogContext: 'expand-recursively'});
    }
    contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => domNode.scrollIntoView(),
                                         {jslogContext: 'scroll-into-view'});
  } else if (domNode.nodeType() === Node.PROCESSING_INSTRUCTION_NODE) {
    contextMenu.editSection().appendItem(i18nString(UIStrings.editData), () => domTreeWidget.startEditing(domNode), {
      disabled: !DOMTreeElementWidget.canEditTextNode(domNode),
      jslogContext: 'elements.edit-data',
    });
    contextMenu.editSection().appendItem(i18nString(UIStrings.duplicateElement),
                                         () => domTreeWidget.duplicateNode(domNode), {
                                           disabled: domNode.isInShadowTree(),
                                           jslogContext: 'elements.duplicate-element',
                                         });
    contextMenu.editSection().appendItem(i18nString(UIStrings.deleteElement),
                                         () => void domTreeWidget.removeNode(domNode),
                                         {jslogContext: 'delete-element'});
  }

  ElementsPanel.instance().populateAdornerSettingsContextMenu(contextMenu);

  contextMenu.appendApplicableItems(domNode);
  await contextMenu.show();
  return contextMenu;
}
