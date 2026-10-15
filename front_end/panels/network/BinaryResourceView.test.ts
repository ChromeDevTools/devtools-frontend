// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {assertScreenshot, doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

async function waitForViewToSettle(view: Network.BinaryResourceView.BinaryResourceView): Promise<void> {
  await doubleRaf();
  const viewer = view.element.querySelector('.viewer-widget');
  if (viewer) {
    let prevHeight = -1;
    while (viewer.clientHeight !== prevHeight) {
      prevHeight = viewer.clientHeight;
      await doubleRaf();
    }
  }
}

describeWithEnvironment('BinaryResourceView', () => {
  it('renders the hex view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    await waitForViewToSettle(view);

    await assertScreenshot('network/binary_resource_view_hex.png');

    view.detach();
  });

  it('renders the base64 view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    await waitForViewToSettle(view);

    const combobox = view.element.querySelector('select');
    assert.isOk(combobox);
    combobox.value = 'base64';
    combobox.dispatchEvent(new Event('change'));

    await doubleRaf();

    await assertScreenshot('network/binary_resource_view_base64.png');

    view.detach();
  });

  it('renders the utf8 view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    await waitForViewToSettle(view);

    const combobox = view.element.querySelector('select');
    assert.isOk(combobox);
    combobox.value = 'utf8';
    combobox.dispatchEvent(new Event('change'));

    await doubleRaf();

    await assertScreenshot('network/binary_resource_view_utf8.png');

    view.detach();
  });

  it('renders the default hex view', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await waitForViewToSettle(view);

    const combobox = view.element.querySelector('select');

    assert.isNotNull(combobox);
    assert.strictEqual(combobox?.value, 'hex');

    view.detach();
  });

  it('updates state when dropdown changes', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await waitForViewToSettle(view);

    const combobox = view.element.querySelector('select');

    assert.isOk(combobox);
    combobox.value = 'utf8';
    combobox.dispatchEvent(new Event('change'));

    assert.strictEqual(Common.Settings.Settings.instance().createSetting('binary-view-type', 'hex').get(), 'utf8');

    view.detach();
  });

  it('copies to clipboard on copy button click', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await waitForViewToSettle(view);

    let copiedText = '';
    const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText')
                             .callsFake((text?: string|null) => {
                               copiedText = text || '';
                             });

    const copyButton = view.element.querySelector('devtools-button[title="Copy to clipboard"]') as HTMLElement;
    assert.isNotNull(copyButton);
    copyButton.click();

    sinon.assert.calledOnce(copyTextStub);
    // hex string of 'hello world'
    const expectedHex = '68656c6c6f20776f726c64';
    assert.strictEqual(copiedText, expectedHex);
    view.detach();
  });

  describe('with a stubbed view', () => {
    async function createView(viewOutput?: Network.BinaryResourceView.ViewOutput) {
      const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
          new TextUtils.ContentData.ContentData(btoa('hello world'), true, 'application/octet-stream'));
      const view = createViewFunctionStub(Network.BinaryResourceView.BinaryResourceView, viewOutput);
      const widget = new Network.BinaryResourceView.BinaryResourceView(
          contentData, urlString`http://example.com`, Common.ResourceType.resourceTypes.XHR, undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);
      await view.nextInput;
      return {view, widget};
    }

    it('shows the copied message and fades it out after a delay', async () => {
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      try {
        const {view, widget} = await createView();
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
        assert.strictEqual(view.input.copiedText, '');

        view.input.copySelectedViewToClipboard();
        let input = await view.nextInput;
        assert.strictEqual(input.copiedText, 'Copied as Hex');
        assert.isFalse(input.copiedTextFadeout);

        clock.tick(2000);
        input = await view.nextInput;
        assert.strictEqual(input.copiedText, 'Copied as Hex');
        assert.isTrue(input.copiedTextFadeout);

        widget.detach();
      } finally {
        clock.restore();
      }
    });

    it('carries the reading position of the active view over to the new view type', async () => {
      const activeView = {getPositionPercentage: () => 0.42} as unknown as
          SourceFrame.StreamingContentHexView.StreamingContentHexView;
      const {view, widget} = await createView({activeView});
      assert.strictEqual(view.input.binaryViewType, 'hex');
      assert.strictEqual(view.input.activePositionPercentage, 0);

      view.input.binaryViewTypeChanged({target: {value: 'base64'}} as unknown as Event);
      const input = await view.nextInput;
      assert.strictEqual(input.binaryViewType, 'base64');
      assert.strictEqual(input.activePositionPercentage, 0.42);

      widget.detach();
    });
  });
});

describeWithEnvironment('BinaryResourceView Position Syncing', () => {
  it('synchronizes cursor position percentage between views', async () => {
    // We need more content so that a 50% scroll is meaningful and document length > 0
    const base64content = btoa('hello world'.repeat(100));
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    // Needed to instantiate CodeMirror for the base64 view
    renderElementIntoDOM(view, {width: 800, height: 600});

    await waitForViewToSettle(view);

    const currentViewWidget = view.element.querySelector('devtools-widget');
    assert.isOk(currentViewWidget);
    const oldWidget = UI.Widget.Widget.get(currentViewWidget) as unknown as {setPositionPercentage(p: number): void};

    // Fake the position percentage
    oldWidget.setPositionPercentage(0.42);

    const combobox = view.element.querySelector('select');
    assert.isOk(combobox);
    combobox.value = 'base64';
    combobox.dispatchEvent(new Event('change'));

    await doubleRaf();

    const newViewWidget = view.element.querySelector('devtools-widget');
    assert.isOk(newViewWidget);
    assert.notStrictEqual(currentViewWidget, newViewWidget, 'A new devtools-widget should have been rendered');

    const newWidget = UI.Widget.Widget.get(newViewWidget) as unknown as {getPositionPercentage(): number};
    const newPercentage = newWidget.getPositionPercentage();

    // Due to character rounding on lines, it might not be exactly 0.42. Just check if it's close.
    assert.closeTo(newPercentage, 0.42, 0.05);

    view.detach();
  });
});
