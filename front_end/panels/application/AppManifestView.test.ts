// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {getCleanTextContentFromElements} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithMockConnection('AppManifestView', () => {
  const FIXTURES_96X96_URL = `${new URL('./fixtures/96x96.png', import.meta.url)}`;
  const FIXTURES_320X320_URL = `${new URL('./fixtures/320x320.png', import.meta.url)}`;
  const FIXTURES_640X320_URL = `${new URL('./fixtures/640x320.png', import.meta.url)}`;

  let target: SDK.Target.Target;
  let emptyView: UI.EmptyWidget.EmptyWidget;
  let reportView: UI.ReportView.ReportView;
  let throttler: Common.Throttler.Throttler;
  let view: Application.AppManifestView.AppManifestView;
  beforeEach(() => {
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    emptyView = new UI.EmptyWidget.EmptyWidget('');
    reportView = new UI.ReportView.ReportView('');
    throttler = new Common.Throttler.Throttler(0);
  });

  afterEach(() => {
    view.detach();
  });

  it('shows report view once manifest available', async () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = 'http://example.com' as Platform.DevToolsPath.UrlString;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.onCall(0).resolves({url: URL, data: null, errors: []});
    fetchAppManifest.onCall(1).resolves({url: URL, data: '{}', errors: []});
    fetchAppManifest.onCall(2).resolves({url: URL, data: '{"short_name": "example.com"}', errors: []});
    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
    view.markAsRoot();
    view.show(document.body);

    await new Promise(resolve => {
      view.addEventListener(Application.AppManifestView.Events.MANIFEST_DETECTED, resolve, {once: true});
    });
    assert.isTrue(emptyView.isShowing());
    assert.isFalse(reportView.isShowing());

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    await new Promise(resolve => {
      view.addEventListener(Application.AppManifestView.Events.MANIFEST_DETECTED, resolve, {once: true});
    });
    assert.isTrue(emptyView.isShowing());
    assert.isFalse(reportView.isShowing());

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    await new Promise(resolve => {
      view.addEventListener(Application.AppManifestView.Events.MANIFEST_DETECTED, resolve, {once: true});
    });
    assert.isFalse(emptyView.isShowing());
    assert.isTrue(reportView.isShowing());
  });

  it('shows pwa wco if available', async () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = 'https://www.example.com' as Platform.DevToolsPath.UrlString;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.resolves({url: URL, data: '{"display_override": ["window-controls-overlay"]}', errors: []});

    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
    view.markAsRoot();
    view.show(document.body);

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    await new Promise(resolve => {
      view.addEventListener(Application.AppManifestView.Events.MANIFEST_DETECTED, resolve, {once: true});
    });

    const manifestSections = view.getStaticSections();
    const values = getCleanTextContentFromElements(manifestSections[4].getFieldElement(), '.wco');
    assert.deepEqual(values, ['window-controls-overlay']);
  });

  it('can parse ‘sizes’-field', async () => {
    view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
    const parsed =
        view.parseSizes('512x512', 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html', []);
    const expected = [{
      width: 512,
      height: 512,
      formatted: '512×512px',
    } as Application.AppManifestView.ParsedSize];
    assert.deepStrictEqual(parsed, expected);
  });

  it('can handle missing ‘sizes’-field', async () => {
    view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
    const parsed = view.parseSizes(
        undefined as unknown as string, 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html', []);
    assert.deepStrictEqual(parsed, []);
  });

  async function renderWithWarnings(manifest: string): Promise<string[]> {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = window.location.origin as Platform.DevToolsPath.UrlString;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.resolves({url: URL, data: manifest, errors: []});

    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
    view.markAsRoot();
    view.show(document.body);

    await new Promise(resolve => {
      view.addEventListener(Application.AppManifestView.Events.MANIFEST_RENDERED, resolve, {once: true});
    });

    const warningSection = reportView.element.shadowRoot?.querySelector('.report-section');
    assert.exists(warningSection);
    const warnings = warningSection.querySelectorAll<HTMLDivElement>('.report-row');
    assert.exists(warnings);
    return Array.from(warnings).map(warning => warning.textContent || '');
  }

  it('displays warnings for too many shortcuts and not enough screenshots', async () => {
    const actual = await renderWithWarnings(`{
        "shortcuts" : [
          {
            "name": "Today's agenda",
            "url": "/today",
            "description": "List of events planned for today",
            "icons": [{ "src": "${FIXTURES_96X96_URL}", "sizes": "96x96" }]
          },
          {
            "name": "New event",
            "url": "/create/event",
            "icons": [{ "src": "${FIXTURES_96X96_URL}", "sizes": "96x96" }]
          },
          {
            "name": "New reminder",
            "url": "/create/reminder",
            "icons": [{ "src": "${FIXTURES_96X96_URL}", "sizes": "96x96" }]
          },
          {
            "name": "Delete event",
            "url": "/delete/reminder",
            "icons": [{ "src": "${FIXTURES_96X96_URL}", "sizes": "96x96" }]
          },
          {
            "name": "Delete reminder",
            "url": "/delete/reminder",
            "icons": [{ "src": "${FIXTURES_96X96_URL}", "sizes": "96x96" }]
          }
        ]
      }`);
    const expected = [
      'The maximum number of shortcuts is platform dependent. Some shortcuts may be not available.',
      'Richer PWA Install UI won’t be available on desktop. Please add at least one screenshot with the form_factor set to wide.',
      'Richer PWA Install UI won’t be available on mobile. Please add at least one screenshot for which form_factor is not set or set to a value other than wide.',
      'Most operating systems require square icons. Please include at least one square icon in the array.',
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('displays warnings for too many mobile screenshots', async () => {
    const actual = await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320"
          }
        ]
      }`);
    const expected = [
      'Richer PWA Install UI won’t be available on desktop. Please add at least one screenshot with the form_factor set to wide.',
      'No more than 5 screenshots will be displayed on mobile. The rest will be ignored.',
      'Most operating systems require square icons. Please include at least one square icon in the array.',
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('displays warnings for too many desktop screenshots and wrong aspect ratio', async () => {
    const actual = await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_640X320_URL}",
            "type": "image/png",
            "sizes": "640x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          }
        ]
      }`);
    const expected = [
      'All screenshots with the same form_factor must have the same aspect ratio as the first screenshot with that form_factor. Some screenshots will be ignored.',
      'Richer PWA Install UI won’t be available on mobile. Please add at least one screenshot for which form_factor is not set or set to a value other than wide.',
      'No more than 8 screenshots will be displayed on desktop. The rest will be ignored.',
      'Most operating systems require square icons. Please include at least one square icon in the array.',
    ];
    assert.deepStrictEqual(actual, expected);
  });

  it('displays "form-factor", "platform" and "label" properties for screenshots', async () => {
    await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "${FIXTURES_320X320_URL}",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide",
            "label": "Dummy Screenshot",
            "platform": "windows"
          }
        ]
      }`);

    const screenshotSection =
        reportView.element.shadowRoot?.querySelectorAll<HTMLDivElement>('.report-section')[7] || null;
    assert.instanceOf(screenshotSection, HTMLDivElement);
    assert.deepStrictEqual(
        getCleanTextContentFromElements(screenshotSection, '.report-field-name').slice(0, 3),
        ['Form factor', 'Label', 'Platform']);
    assert.deepStrictEqual(
        getCleanTextContentFromElements(screenshotSection, '.report-field-value').slice(0, 3),
        ['wide', 'Dummy Screenshot', 'windows']);
  });
});
