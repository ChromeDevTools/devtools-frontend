// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertElement, getCleanTextContentFromElements} from '../../helpers/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('AppManifestView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let emptyView: UI.EmptyWidget.EmptyWidget;
    let reportView: UI.ReportView.ReportView;
    let throttler: Common.Throttler.Throttler;
    let view: Application.AppManifestView.AppManifestView;
    beforeEach(() => {
      stubNoopSettings();
      target = targetFactory();
      emptyView = new UI.EmptyWidget.EmptyWidget('');
      reportView = new UI.ReportView.ReportView('');
      throttler = new Common.Throttler.Throttler(0);
    });

    afterEach(() => {
      view.detach();
    });

    it('shows report view once manifest available', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const URL = 'http://example.com' as Platform.DevToolsPath.UrlString;
      const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
      fetchAppManifest.onCall(0).resolves({url: URL, data: null, errors: []});
      fetchAppManifest.onCall(1).resolves({url: URL, data: '{}', errors: []});
      sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
      sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      view.markAsRoot();
      view.show(document.body);

      await new Promise(resolve => {
        view.addEventListener(Application.AppManifestView.Events.ManifestDetected, resolve, {once: true});
      });
      assert.isTrue(emptyView.isShowing());
      assert.isFalse(reportView.isShowing());

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
      await new Promise(resolve => {
        view.addEventListener(Application.AppManifestView.Events.ManifestDetected, resolve, {once: true});
      });
      assert.isFalse(emptyView.isShowing());
      assert.isTrue(reportView.isShowing());
    });

    it('shows pwa wco if available', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

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
        view.addEventListener(Application.AppManifestView.Events.ManifestDetected, resolve, {once: true});
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
          undefined as unknown as string, 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html',
          []);
      assert.deepStrictEqual(parsed, []);
    });

    async function renderWithWarnings(manifest: string): Promise<string[]> {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const URL = window.location.origin as Platform.DevToolsPath.UrlString;
      const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
      fetchAppManifest.resolves({url: URL, data: manifest, errors: []});

      sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
      sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      view.markAsRoot();
      view.show(document.body);

      await new Promise(resolve => {
        view.addEventListener(Application.AppManifestView.Events.ManifestRendered, resolve, {once: true});
      });

      const warningSection = reportView.element.shadowRoot?.querySelector('.report-section');
      assertNotNullOrUndefined(warningSection);
      const warnings = warningSection.querySelectorAll<HTMLDivElement>('.report-row');
      assertNotNullOrUndefined(warnings);
      return Array.from(warnings).map(warning => warning.textContent || '');
    }

    it('displays warnings for too many shortcuts and not enough screenshots', async () => {
      const actual = await renderWithWarnings(`{
        "shortcuts" : [
          {
            "name": "Today's agenda",
            "url": "/today",
            "description": "List of events planned for today",
            "icons": [{ "src": "/fixtures/images/96x96.png", "sizes": "96x96" }]
          },
          {
            "name": "New event",
            "url": "/create/event",
            "icons": [{ "src": "/fixtures/images/96x96.png", "sizes": "96x96" }]
          },
          {
            "name": "New reminder",
            "url": "/create/reminder",
            "icons": [{ "src": "/fixtures/images/96x96.png", "sizes": "96x96" }]
          },
          {
            "name": "Delete event",
            "url": "/delete/reminder",
            "icons": [{ "src": "/fixtures/images/96x96.png", "sizes": "96x96" }]
          },
          {
            "name": "Delete reminder",
            "url": "/delete/reminder",
            "icons": [{ "src": "/fixtures/images/96x96.png", "sizes": "96x96" }]
          }
        ]
      }`);
      const expected = [
        'The maximum number of shortcuts is platform dependent. Some shortcuts may be not available.',
        'Richer PWA Install UI won’t be available on desktop. Please add at least one screenshot with the "form_factor" set to "wide".',
        'Richer PWA Install UI won’t be available on mobile. Please add at least one screenshot for which "form_factor" is not set or set to a value other than "wide".',
        'Most operating systems require square icons. Please include at least one square icon in the array.',
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('displays warnings for too many mobile screenshots', async () => {
      const actual = await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320"
          }
        ]
      }`);
      const expected = [
        'Richer PWA Install UI won’t be available on desktop. Please add at least one screenshot with the "form_factor" set to "wide".',
        'No more than 5 screenshots will be displayed on mobile. The rest will be ignored.',
        'Most operating systems require square icons. Please include at least one square icon in the array.',
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('displays warnings for too many desktop screenshots and wrong aspect ratio', async () => {
      const actual = await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/640x320.png",
            "type": "image/png",
            "sizes": "640x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          },
          {
            "src": "/fixtures/images/320x320.png",
            "type": "image/png",
            "sizes": "320x320",
            "form_factor": "wide"
          }
        ]
      }`);
      const expected = [
        'All screenshots with the same "form_factor" must have the same aspect ratio as the first screenshot with that "form_factor". Some screenshots will be ignored.',
        'Richer PWA Install UI won’t be available on mobile. Please add at least one screenshot for which "form_factor" is not set or set to a value other than "wide".',
        'No more than 8 screenshots will be displayed on desktop. The rest will be ignored.',
        'Most operating systems require square icons. Please include at least one square icon in the array.',
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('displays "form-factor", "platform" and "label" properties for screenshots', async () => {
      await renderWithWarnings(`{
        "screenshots": [
          {
            "src": "/fixtures/images/320x320.png",
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
      assertElement(screenshotSection, HTMLDivElement);
      assert.deepStrictEqual(
          getCleanTextContentFromElements(screenshotSection, '.report-field-name').slice(0, 3),
          ['Form factor', 'Label', 'Platform']);
      assert.deepStrictEqual(
          getCleanTextContentFromElements(screenshotSection, '.report-field-value').slice(0, 3),
          ['wide', 'Dummy Screenshot', 'windows']);
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
