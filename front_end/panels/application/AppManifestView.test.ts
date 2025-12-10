// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('AppManifestView', () => {
  const FIXTURES_96X96_URL = `${new URL('./fixtures/96x96.png', import.meta.url)}`;
  const FIXTURES_320X320_URL = `${new URL('./fixtures/320x320.png', import.meta.url)}`;
  const FIXTURES_640X320_URL = `${new URL('./fixtures/640x320.png', import.meta.url)}`;

  let target: SDK.Target.Target;
  let view: Application.AppManifestView.AppManifestView;
  let viewFunction: ViewFunctionStub<typeof Application.AppManifestView.AppManifestView>;

  beforeEach(() => {
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    viewFunction = createViewFunctionStub(Application.AppManifestView.AppManifestView);
  });

  afterEach(() => {
    if (view) {
      view.detach();
    }
  });

  it('shows report view once manifest available', async () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = urlString`http://example.com`;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.onCall(0).resolves({url: URL, data: null, errors: []});
    fetchAppManifest.onCall(1).resolves({url: URL, data: '{}', errors: []});
    fetchAppManifest.onCall(2).resolves({url: URL, data: '{"short_name": "example.com"}', errors: []});
    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    view = new Application.AppManifestView.AppManifestView(viewFunction);
    renderElementIntoDOM(view);

    await viewFunction.nextInput;
    assert.isTrue(viewFunction.input.emptyView.isShowing());
    assert.isFalse(viewFunction.input.reportView.isShowing());

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    await viewFunction.nextInput;
    assert.isTrue(viewFunction.input.emptyView.isShowing());
    assert.isFalse(viewFunction.input.reportView.isShowing());

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    await viewFunction.nextInput;
    assert.isFalse(viewFunction.input.emptyView.isShowing());
    assert.isTrue(viewFunction.input.reportView.isShowing());
  });

  it('shows pwa wco if available', async () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = urlString`https://www.example.com`;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.resolves({url: URL, data: '{"display_override": ["window-controls-overlay"]}', errors: []});

    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    view = new Application.AppManifestView.AppManifestView(viewFunction);
    renderElementIntoDOM(view);

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
    const {windowControlsData} = await viewFunction.nextInput;

    assert.isTrue(windowControlsData?.hasWco);
  });

  it('can parse ‘sizes’-field', async () => {
    view = new Application.AppManifestView.AppManifestView(viewFunction);
    const parsed =
        view.parseSizes('512x512', 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html', []);
    const expected = [{
      width: 512,
      height: 512,
      formatted: '512×512px',
    } as Application.AppManifestView.ParsedSize];
    assert.deepEqual(parsed, expected);
  });

  it('can handle missing ‘sizes’-field', async () => {
    view = new Application.AppManifestView.AppManifestView(viewFunction);
    const parsed = view.parseSizes(
        undefined as unknown as string, 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html', []);
    assert.deepEqual(parsed, []);
  });

  async function renderWithWarnings(manifest: string): Promise<string[]> {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const URL = urlString`${window.location.origin}`;
    const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
    fetchAppManifest.resolves({url: URL, data: manifest, errors: []});

    sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
    sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

    SDK.PageResourceLoader.PageResourceLoader.instance({
      forceNew: true,
      loadOverride: async url => {
        const res = await fetch(url);
        return {
          content: await res.bytes(),
          success: true,
          errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
        };
      }
    });

    view = new Application.AppManifestView.AppManifestView(viewFunction);
    renderElementIntoDOM(view);

    const {warnings, errors, imageErrors} = await viewFunction.nextInput;

    return [...warnings ?? [], ...errors?.map(error => error.message) ?? [], ...imageErrors ?? []];
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
    assert.deepEqual(actual, expected);
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
    assert.deepEqual(actual, expected);
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
    assert.deepEqual(actual, expected);
  });

  it('displays "form-factor", "platform" and "label" properties for screenshots', async () => {
    const emptyView = new UI.EmptyWidget.EmptyWidget('', '');
    const reportView = new UI.ReportView.ReportView('');
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const viewInput = {
      reportView,
      emptyView,
      screenshotsSections: [],
      screenshotsData: {
        screenshots: [{
          screenshot: {
            src: FIXTURES_320X320_URL,
            type: 'image/png',
            sizes: '320x320',
            form_factor: 'wide',
            label: 'Dummy Screenshot',
            platform: 'windows'
          },
          processedImage: {
            imageResourceErrors: [],
            squareSizedIconAvailable: true,
            naturalWidth: 320,
            naturalHeight: 320,
            title: '320×320px\nimage/png',
            imageSrc:
                'data:application/octet-stream;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFABAMAAAA/vriZAAAAG1BMVEUAAAD///+fn59fX19/f3/f39+/v78/Pz8fHx82YA2fAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADR0lEQVR4nO3Yy1PaUBTHcQSRLHvABJbio3YJ04fbMsW2S9OnS2JH6hJqHV3GqpU/u3lCwJuQEByczvezgOTknvCbQJIbCgUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJbv0l51gmQVebvqCMkImNckYLOh2KwsqqQemNWTD6i9HCR9xOoDzvkIAmZAwLyeVMCRnfIjZoujuL3kCLjdChbWd5yX0q5z7dsT+RRcXbTt9JcZ7b2Ivh+uvTGdtd3E7nRkK1goG87Lhl7QLHEYtlcMLtTdbtfa7LoinTNFren2yU9/42tvRfRWXPfiAduyM7rvyHEkoCYhfdI4W7yQL1fajSXeQVuX6oE9Ot9z25XdiwcsecdAs6qRgIV+v28azkv/JNI5XSzJZ6/BrLtvbd32xty04roXDjj0k5XFjgQszP8NDoNId95hMo9jB+YMKKa/XvKTpQ9o1QtBY8tta8UOzBvQCOu9TAEr4/2YPfcnaD9awHBP1lGmgEUJryidxuMGDAN1GpkClsdn6HXN/Z4HcQNzBwz33M4W8Lo6jlqNfuHLDxjW2/VMAdu1cGnD3Y9Vixu4qoCderhUdL/sobx47IDDbAEjp4sbsGLKD/tpBdS/BkxvF3+cG9uOrRi4soAy4RVunTmH0Xo4cGUBa5djQem3Jfryp1uLBuwoNmuHUnswcGUB64rNhU54WV1GwLVcAds1xWbnjtLLHdBcTsDJnWSK1cgfsBcmyhWwbCg2Tw5sjoD+rMXdR66Axdn5S7CX/AGbz/z3iiQHVJ2mkeKD6cF0QGV3OuGXcDcnYFt1mkaKlvo0rid0p3Pt/3g0cy854HBT0Rwphs8kUzTzKKE7naIf4UKfcx1cUz0zRorr8j0I5QStfPSX/4bPJsrudDQxnIvpLzmbE7AoZ87r1XRztNjxn9lvmt5DkzeXuTWrSd0pXYh+cirVeXcSzZRvz2d/aNGiM8MyTrZPxT1oTl367vJWUndK3l8W1YE/E44P6E6gRGY/Ilosef+Z+P/OVA69ec2+cmBm590Pdoph993uQXLxPLJy/6r7bhA3EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/9E/taiqMl6Q6aMAAAAASUVORK5CYII=',
            imageUrl: FIXTURES_320X320_URL,
          }
        }],
        imageResourceErrors: [],
        warnings: [],
      }
    };
    const viewOutput = {scrollToSection: new Map(), focusOnSection: new Map()};
    Application.AppManifestView.DEFAULT_VIEW(viewInput, viewOutput, container);
    await assertScreenshot('application/app_manifest_view_screenshots.png');
  });
});
