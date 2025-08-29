// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {dispatchMouseUpEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as UI from './legacy.js';

const {html, render} = Lit;

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
    sinon.assert.notCalled(contextMenuDiscardSpy);

    dispatchMouseUpEvent(item0);
    assert.isFalse(item0.hasAttribute('checked'));
    assert.isTrue(item1.hasAttribute('checked'));
    sinon.assert.notCalled(contextMenuDiscardSpy);

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
    sinon.assert.called(contextMenuDiscardSpy);

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
    sinon.assert.called(showContextMenuAtPoint);
  });

  it('records new badge usage', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const submenu1 = contextMenu.defaultSection().appendSubMenuItem('submenu', false, undefined, 'feature1');
    submenu1.defaultSection().appendItem('item', () => {}, {featureName: 'feature2'});
    submenu1.defaultSection().appendItem('item', () => {});

    const submenu2 = contextMenu.defaultSection().appendSubMenuItem('submenu2', false, undefined, 'feature3');
    submenu2.defaultSection().appendItem('item', () => {}, {featureName: 'feature4'});
    const item = submenu2.defaultSection().appendItem('item', () => {}, {featureName: 'feature5'});

    await contextMenu.show();
    const newBadgeUsageStub =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordNewBadgeUsage');
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, item.id());
    assert.deepEqual(newBadgeUsageStub.args, [['feature5'], ['feature3']]);
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
    sinon.assert.calledOnce(recordImpression);
    const impressions =
        recordImpression.firstCall.firstArg.impressions as Host.InspectorFrontendHostAPI.VisualElementImpression[];
    const menuId = impressions.find(i => !i.parent)?.id;
    assert.exists(menuId);
    assert.sameDeepMembers(impressions.map(i => ({...i, id: 0})), [
      {id: 0, type: 67, height: 40, width: 200},
      {id: 0, type: 29, parent: menuId, context: 42, height: 20, width: 200},
      {id: 0, type: 29, parent: menuId, context: 44, height: 20, width: 200},
    ]);

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, 1);

    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnce(recordClick);
    await VisualLogging.stopLogging();
  });

  it('can register an action menu item with a new badge', async () => {
    const actionId = 'test-action';
    registerNoopActions([actionId]);

    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);

    const showContextMenuAtPoint =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendAction(actionId, 'mockLabel', false, undefined, 'mockFeature');
    await contextMenu.show();
    sinon.assert.calledOnce(showContextMenuAtPoint);

    assert.strictEqual(showContextMenuAtPoint.args[0][2][0].featureName, 'mockFeature');
  });

  it('can register a submenu item with a new badge', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);

    const showContextMenuAtPoint =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const subMenu = contextMenu.defaultSection().appendSubMenuItem('mockLabel', false, undefined, 'mockFeature');
    subMenu.defaultSection().appendItem('subMenuLabel', () => {});
    await contextMenu.show();
    sinon.assert.calledOnce(showContextMenuAtPoint);
    assert.strictEqual(showContextMenuAtPoint.args[0][2][0].featureName, 'mockFeature');
    assert.strictEqual(showContextMenuAtPoint.args[0][2][0].type, 'subMenu');
  });
});

describeWithEnvironment('MenuButton', function() {
  it('renders a button and opens a menu on click', async () => {
    const container = document.createElement('div');
    let resolveMenuPopulated = () => {};
    const populatedPromise = new Promise<void>(resolve => {
      resolveMenuPopulated = resolve;
    });

    const populateMenuCall = (menu: UI.ContextMenu.ContextMenu): void => {
      menu.defaultSection().appendItem('item 1', () => {});
    };

    // clang-format off
    render(html`
      <devtools-menu-button
       .populateMenuCall=${populateMenuCall}
        soft-menu
        icon-name="dots-vertical"
      ></devtools-menu-button>
    `, container);
    // clang-format on

    const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').callsFake(async () => {
      resolveMenuPopulated();
    });

    renderElementIntoDOM(container);
    const menuButton = container.querySelector<UI.ContextMenu.MenuButton>('devtools-menu-button');
    assert.exists(menuButton, 'MenuButton element should exist');
    const devtoolsButton = menuButton.shadowRoot?.querySelector('devtools-button');
    assert.exists(devtoolsButton);

    devtoolsButton.click();

    await populatedPromise;

    assert.strictEqual(devtoolsButton.getAttribute('aria-expanded'), 'true');
    sinon.assert.calledOnce(showStub);
  });

  it('can be disabled', async () => {
    const container = document.createElement('div');

    // clang-format off
    render(html`
      <devtools-menu-button
        .populateMenuCall=${() => {}}
        disabled
        icon-name="dots-vertical"
      ></devtools-menu-button>
    `, container);
    // clang-format on

    renderElementIntoDOM(container);
    const menuButton = container.querySelector<UI.ContextMenu.MenuButton>('devtools-menu-button');
    assert.exists(menuButton, 'MenuButton element should exist');

    const devtoolsButton = menuButton.shadowRoot?.querySelector('devtools-button');
    assert.exists(devtoolsButton);

    assert.isTrue(devtoolsButton.disabled);
  });
});
