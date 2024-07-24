// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {dispatchMouseUpEvent} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as UI from './legacy.js';

function getContextMenuElement(): HTMLElement {
  const container = document.querySelector('div[data-devtools-glass-pane]');
  const softMenuElement = container!.shadowRoot!.querySelector('.widget > .soft-context-menu');
  assert.instanceOf(softMenuElement, HTMLElement);
  return softMenuElement;
}

describeWithEnvironment('ContextMenu', () => {
  let menuItems: UI.SoftContextMenu.SoftContextMenuDescriptor[];
  beforeEach(() => {
    menuItems = [
      {
        type: 'checkbox',
        id: 0,
        label: 'item0',
        checked: false,
      },
      {
        type: 'checkbox',
        id: 1,
        label: 'item1',
        checked: false,
      },
    ];
  });

  it('stays open after clicking on an item when keepOpen is true', () => {
    const softMenu = new UI.SoftContextMenu.SoftContextMenu(menuItems, () => {}, true);
    const contextMenuDiscardSpy = sinon.spy(softMenu, 'discard');
    softMenu.show(document, new AnchorBox(0, 0, 0, 0));
    const softMenuElement = getContextMenuElement();

    const item0 = softMenuElement.querySelector('[aria-label^="item0"]');
    assert.instanceOf(item0, HTMLElement);
    const item1 = softMenuElement.querySelector('[aria-label^="item1"]');
    assert.instanceOf(item1, HTMLElement);

    assert.isFalse(item0.hasAttribute('checked'));
    assert.isFalse(item1.hasAttribute('checked'));

    dispatchMouseUpEvent(item0);
    dispatchMouseUpEvent(item1);
    assert.isTrue(item0.hasAttribute('checked'));
    assert.isTrue(item1.hasAttribute('checked'));
    assert.isTrue(!contextMenuDiscardSpy.called);

    dispatchMouseUpEvent(item0);
    assert.isFalse(item0.hasAttribute('checked'));
    assert.isTrue(item1.hasAttribute('checked'));
    assert.isTrue(!contextMenuDiscardSpy.called);

    softMenu.discard();
  });

  it('closes after clicking on an item when keepOpen is false', () => {
    const softMenu = new UI.SoftContextMenu.SoftContextMenu(menuItems, () => {}, false);
    const contextMenuDiscardSpy = sinon.spy(softMenu, 'discard');
    softMenu.show(document, new AnchorBox(0, 0, 0, 0));
    const softMenuElement = getContextMenuElement();

    const item0 = softMenuElement.querySelector('[aria-label^="item0"]');
    assert.instanceOf(item0, HTMLElement);
    dispatchMouseUpEvent(item0);
    assert.isTrue(contextMenuDiscardSpy.called);

    softMenu.discard();
  });

  it('uses hosted menu when possible', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    const showContextMenuAtPoint =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    await contextMenu.show();
    assert.isTrue(showContextMenuAtPoint.called);
  });

  it('logs impressions and clicks for hosted menu', async () => {
    const throttler = new Common.Throttler.Throttler(1000000000);
    await VisualLogging.startLogging({processingThrottler: throttler});
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');
    const recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );

    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem('item 1', () => {}, {jslogContext: '42'});
    contextMenu.defaultSection().appendItem('item 2', () => {}, {jslogContext: '44'});
    await contextMenu.show();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.exists(throttler.process);
    await throttler.process?.();
    assert.isTrue(recordImpression.calledOnce);
    const impressions =
        recordImpression.firstCall.firstArg.impressions as Host.InspectorFrontendHostAPI.VisualElementImpression[];
    const menuId = impressions.find(i => !i.parent)?.id;
    assert.exists(menuId);
    assert.sameDeepMembers(impressions.map(i => ({...i, id: 0})), [
      {id: 0, type: 67, height: 0, width: 0},
      {id: 0, type: 29, parent: menuId, context: 42, height: 0, width: 0},
      {id: 0, type: 29, parent: menuId, context: 44, height: 0, width: 0},
    ]);

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, 1);

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(recordClick.calledOnce);
    await VisualLogging.stopLogging();
  });
});
