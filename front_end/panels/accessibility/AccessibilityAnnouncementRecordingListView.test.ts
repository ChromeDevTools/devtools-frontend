// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Accessibility from './accessibility.js';

describeWithEnvironment('AccessibilityAnnouncementRecordingListView', () => {
  const {AnnouncementApi} = Accessibility.AccessibilityAnnouncementRecordingView;
  type A11yAnnouncement = Accessibility.AccessibilityAnnouncementRecordingView.A11yAnnouncement;

  const mockAnnouncement: A11yAnnouncement = {
    api: AnnouncementApi.ARIA_LIVE,
    message: 'Live status updated',
    politeness: 'polite',
    element: '<div aria-live="polite">Live status updated</div>',
    time: 1700000000000,
  };

  async function createListView(initialItems: readonly A11yAnnouncement[] = []) {
    const view = createViewFunctionStub(
        Accessibility.AccessibilityAnnouncementRecordingListView.AccessibilityAnnouncementRecordingListView);
    const listView =
        new Accessibility.AccessibilityAnnouncementRecordingListView.AccessibilityAnnouncementRecordingListView(
            undefined, view);
    if (initialItems.length > 0) {
      listView.items = initialItems;
    }
    listView.requestUpdate();
    await view.nextInput;
    return {view, listView};
  }

  it('renders with initial empty state', async () => {
    const {view} = await createListView();
    assert.deepEqual(view.input.items, []);
    assert.isNull(view.input.selectedItem);
  });

  it('updates items when set', async () => {
    const {view, listView} = await createListView();
    listView.items = [mockAnnouncement];
    const input = await view.nextInput;
    assert.deepEqual(input.items, [mockAnnouncement]);
  });

  it('does not trigger update when items is set to the same array', async () => {
    const {view, listView} = await createListView();
    const callCount = view.callCount;
    listView.items = listView.items;
    sinon.assert.callCount(view, callCount);
  });

  it('updates selectedItem when set', async () => {
    const {view, listView} = await createListView();
    listView.selectedItem = mockAnnouncement;
    const input = await view.nextInput;
    assert.strictEqual(input.selectedItem, mockAnnouncement);
  });

  it('does not trigger update when selectedItem is set to the same item', async () => {
    const {view, listView} = await createListView();
    listView.selectedItem = mockAnnouncement;
    await view.nextInput;

    const callCount = view.callCount;
    listView.selectedItem = mockAnnouncement;
    sinon.assert.callCount(view, callCount);
  });

  it('handles onSelect callback and updates selectedItem', async () => {
    const {view, listView} = await createListView();
    const onSelectSpy = sinon.spy();
    listView.onSelect = onSelectSpy;

    view.input.onSelect(mockAnnouncement);

    sinon.assert.calledOnceWithExactly(onSelectSpy, mockAnnouncement);
    assert.strictEqual(listView.selectedItem, mockAnnouncement);
    const input = await view.nextInput;
    assert.strictEqual(input.selectedItem, mockAnnouncement);
  });

  it('handles onDeselect callback and resets selectedItem', async () => {
    const {view, listView} = await createListView();
    listView.selectedItem = mockAnnouncement;
    await view.nextInput;

    const onSelectSpy = sinon.spy();
    listView.onSelect = onSelectSpy;

    view.input.onDeselect();

    sinon.assert.calledOnceWithExactly(onSelectSpy, null);
    assert.isNull(listView.selectedItem);
    const input = await view.nextInput;
    assert.isNull(input.selectedItem);
  });

  it('resets items and selection on reset()', async () => {
    const {view, listView} = await createListView([mockAnnouncement]);
    listView.selectedItem = mockAnnouncement;
    await view.nextInput;

    listView.reset();
    const input = await view.nextInput;

    assert.isEmpty(input.items);
    assert.isNull(input.selectedItem);
  });

  describe('context menu', () => {
    it('populates copy message and copy element HTML actions and copies to clipboard', async () => {
      const {view} = await createListView([mockAnnouncement]);
      const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
      const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));

      view.input.onContextMenu(contextMenu, mockAnnouncement);

      const clipboardItems = contextMenu.clipboardSection().items;
      assert.lengthOf(clipboardItems, 2);

      const copyMessageItem = clipboardItems.find(item => item.buildDescriptor().label === 'Copy message');
      assert.exists(copyMessageItem);
      assert.strictEqual(copyMessageItem.buildDescriptor().jslogContext, 'copy-message');

      const copyElementHtmlItem = clipboardItems.find(item => item.buildDescriptor().label === 'Copy element HTML');
      assert.exists(copyElementHtmlItem);
      assert.strictEqual(copyElementHtmlItem.buildDescriptor().jslogContext, 'copy-element-html');

      contextMenu.invokeHandler(copyMessageItem.id());
      sinon.assert.calledOnceWithExactly(copyTextStub, mockAnnouncement.message);

      copyTextStub.resetHistory();
      contextMenu.invokeHandler(copyElementHtmlItem.id());
      sinon.assert.calledOnceWithExactly(copyTextStub, mockAnnouncement.element);
    });

    it('omits clipboard actions when message or element is empty', async () => {
      const emptyAnnouncement: A11yAnnouncement = {
        api: AnnouncementApi.ARIA_LIVE,
        message: '',
        politeness: 'polite',
        element: '',
        time: 1700000000000,
      };
      const {view} = await createListView([emptyAnnouncement]);
      const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));

      view.input.onContextMenu(contextMenu, emptyAnnouncement);

      assert.isEmpty(contextMenu.clipboardSection().items);
    });

    it('forwards CustomEvent<ContextMenu> from DEFAULT_VIEW row to onContextMenu', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const onContextMenuSpy = sinon.spy();

      Accessibility.AccessibilityAnnouncementRecordingListView.DEFAULT_VIEW({
        items: [mockAnnouncement],
        selectedItem: null,
        onContextMenu: onContextMenuSpy,
        onSelect: () => {},
        onDeselect: () => {},
      },
                                                                            undefined, target);
      // The data grid sets up its columns asynchronously, in response to a
      // mutation observer. Wait for that to settle so that it does not run
      // during teardown, once the test environment is already gone.
      await raf();

      const dataRow = target.querySelector('devtools-data-grid table tr:nth-child(2)');
      assert.exists(dataRow);
      const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));
      dataRow.dispatchEvent(new CustomEvent('contextmenu', {detail: contextMenu}));

      sinon.assert.calledOnceWithExactly(onContextMenuSpy, contextMenu, mockAnnouncement);
    });
  });

  describe('DEFAULT_VIEW screenshots', () => {
    let target: HTMLElement;

    beforeEach(() => {
      target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
      target.style.display = 'flex';
      target.style.width = '640px';
      target.style.height = '300px';
    });

    it('renders empty state', async () => {
      Accessibility.AccessibilityAnnouncementRecordingListView.DEFAULT_VIEW(
          {items: [], selectedItem: null, onContextMenu: () => {}, onSelect: () => {}, onDeselect: () => {}}, undefined,
          target);
      await assertScreenshot('accessibility/accessibility_announcement_recording_list_view_empty.png');
    });

    it('renders announcements list', async () => {
      Accessibility.AccessibilityAnnouncementRecordingListView.DEFAULT_VIEW({
        items: [mockAnnouncement],
        selectedItem: null,
        onContextMenu: () => {},
        onSelect: () => {},
        onDeselect: () => {},
      },
                                                                            undefined, target);
      await assertScreenshot('accessibility/accessibility_announcement_recording_list_view.png');
    });
  });
});
