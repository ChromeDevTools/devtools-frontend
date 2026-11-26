// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import {findMenuItemWithLabel, getContextMenuForElement} from '../../testing/ContextMenuHelpers.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

describe('NetworkLogViewColumns', () => {
  setupLocaleHooks();
  setupSettingsHooks();

  let container: UI.Widget.VBox;
  let columns: Network.NetworkLogViewColumns.NetworkLogViewColumns;
  let previousGlassPaneContainer: Element|undefined;

  beforeEach(() => {
    previousGlassPaneContainer = UI.GlassPane.GlassPane.container(document);
    container = new UI.Widget.VBox();
    renderElementIntoDOM(container, {includeCommonStyles: true, width: 800, height: 600});
    UI.GlassPane.GlassPane.setContainer(container.element);

    const timeCalculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const durationCalculator = new NetworkTimeCalculator.NetworkTransferDurationCalculator();
    const networkLogView = sinon.createStubInstance(Network.NetworkLogView.NetworkLogView);
    Object.defineProperty(networkLogView, 'element', {value: container.element});
    networkLogView.calculator.returns(timeCalculator);
    networkLogView.hoveredNode.returns(null);
    networkLogView.flatNodesList.returns([]);

    const largeRowsSetting = Common.Settings.Settings.instance().createSetting('network-log-large-rows', false);
    columns = new Network.NetworkLogViewColumns.NetworkLogViewColumns(networkLogView, timeCalculator,
                                                                      durationCalculator, largeRowsSetting);
    columns.dataGrid().asWidget().show(container.element);
    columns.switchViewMode(true);
  });

  afterEach(async () => {
    while (UI.Dialog.Dialog.hasInstance()) {
      UI.Dialog.Dialog.getInstance()?.hide();
    }
    columns.willHide();
    container.detach();
    if (previousGlassPaneContainer) {
      UI.GlassPane.GlassPane.setContainer(previousGlassPaneContainer);
    }
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;
  });

  async function openManageHeadersDialog(subMenuLabel: string): Promise<{
    dialog: UI.Dialog.Dialog,
    view: Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView,
  }> {
    const headerElement = columns.dataGrid().element.querySelector('th');
    assert.exists(headerElement);
    const contextMenu = getContextMenuForElement(headerElement);
    const headersSubMenu = findMenuItemWithLabel(contextMenu.footerSection(), subMenuLabel);
    assert.instanceOf(headersSubMenu, UI.ContextMenu.SubMenu);
    const manageColumnsItem = findMenuItemWithLabel(headersSubMenu.footerSection(), 'Manage Header Columns…');
    assert.exists(manageColumnsItem);
    contextMenu.invokeHandler(manageColumnsItem.id());

    const dialog = UI.Dialog.Dialog.getInstance();
    assert.exists(dialog);
    const viewElement = dialog.contentElement.firstElementChild;
    assert.instanceOf(viewElement, HTMLElement);
    const view = UI.Widget.Widget.get(viewElement);
    assert.instanceOf(view, Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    await view.updateComplete;
    await raf();
    return {dialog, view};
  }

  function assertDialogFitsView(
      dialog: UI.Dialog.Dialog,
      view: Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView,
      ): void {
    const header = view.contentElement.querySelector<HTMLElement>('.header');
    const addButton = view.contentElement.querySelector<HTMLElement>('.add-button');
    assert.exists(header);
    assert.exists(addButton);

    const dialogRect = dialog.contentElement.getBoundingClientRect();
    const viewRect = view.contentElement.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const addButtonRect = addButton.getBoundingClientRect();
    assert.isAbove(dialogRect.width, 0);
    assert.isAbove(dialogRect.height, 0);
    assert.isAtLeast(dialogRect.width, viewRect.width);
    assert.isAtLeast(dialogRect.height, viewRect.height);
    assert.isAtLeast(dialogRect.width, headerRect.width);
    assert.isAtLeast(dialogRect.height, headerRect.height);
    assert.isAtLeast(dialogRect.right, addButtonRect.right);
    assert.isAtLeast(dialogRect.bottom, addButtonRect.bottom);
  }

  it('sizes the manage request headers dialog to fit its asynchronously rendered content', async () => {
    const {dialog, view} = await openManageHeadersDialog('Request headers');

    assert.include(dialog.contentElement.getAttribute('jslog') ?? '', 'manage-custom-request-headers');
    assertDialogFitsView(dialog, view);
  });

  it('sizes the manage response headers dialog to fit its asynchronously rendered content', async () => {
    const {dialog, view} = await openManageHeadersDialog('Response headers');

    assert.include(dialog.contentElement.getAttribute('jslog') ?? '', 'manage-custom-response-headers');
    assertDialogFitsView(dialog, view);
  });
});
