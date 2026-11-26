// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as InspectorMain from './inspector_main.js';

function option(value: string, label: string) {
  const text = i18n.i18n.lockedLazyString(label);
  return {value, title: text, text};
}

const RENDERING_UI_DESCRIPTORS: Array<{
  descriptor: Common.Settings.SettingDescriptor<string>,
  title: string,
  options: Array<[string, string]>,
}> =
    [
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor,
        title: 'Emulate CSS media feature prefers-color-scheme',
        options: [
          ['', 'No emulation'],
          ['light', 'prefers-color-scheme: light'],
          ['dark', 'prefers-color-scheme: dark'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaSettingDescriptor,
        title: 'Emulate CSS media type',
        options: [
          ['', 'No emulation'],
          ['print', 'print'],
          ['screen', 'screen'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeatureForcedColorsSettingDescriptor,
        title: 'Emulate CSS media feature forced-colors',
        options: [
          ['', 'No emulation'],
          ['active', 'forced-colors: active'],
          ['none', 'forced-colors: none'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeaturePrefersContrastSettingDescriptor,
        title: 'Emulate CSS media feature prefers-contrast',
        options: [
          ['', 'No emulation'],
          ['more', 'prefers-contrast: more'],
          ['less', 'prefers-contrast: less'],
          ['custom', 'prefers-contrast: custom'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor,
        title: 'Emulate CSS media feature prefers-reduced-motion',
        options: [
          ['', 'No emulation'],
          ['reduce', 'prefers-reduced-motion: reduce'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedDataSettingDescriptor,
        title: 'Emulate CSS media feature prefers-reduced-data',
        options: [
          ['', 'No emulation'],
          ['reduce', 'prefers-reduced-data: reduce'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedTransparencySettingDescriptor,
        title: 'Emulate CSS media feature prefers-reduced-transparency',
        options: [
          ['', 'No emulation'],
          ['reduce', 'prefers-reduced-transparency: reduce'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedCSSMediaFeatureColorGamutSettingDescriptor,
        title: 'Emulate CSS media feature color-gamut',
        options: [
          ['', 'No emulation'],
          ['srgb', 'color-gamut: srgb'],
          ['p3', 'color-gamut: p3'],
          ['rec2020', 'color-gamut: rec2020'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedVisionDeficiencySettingDescriptor,
        title: 'Emulate vision deficiencies',
        options: [
          ['none', 'No emulation'],
          ['blurredVision', 'Blurred vision'],
          ['reducedContrast', 'Reduced contrast'],
          ['protanopia', 'Protanopia (no red)'],
          ['deuteranopia', 'Deuteranopia (no green)'],
          ['tritanopia', 'Tritanopia (no blue)'],
          ['achromatopsia', 'Achromatopsia (no color)'],
        ],
      },
      {
        descriptor: SDK.SDKSettings.emulatedOSTextScaleSettingDescriptor,
        title: 'Emulate OS text scale',
        options: [
          ['', 'No emulation'],
          ['0.85', '85%'],
          ['1', '100% (default)'],
          ['1.15', '115%'],
          ['1.3', '130%'],
          ['1.5', '150%'],
          ['1.8', '180%'],
          ['2', '200%'],
          ['2.5', '250%'],
          ['3', '300%'],
          ['3.5', '350%'],
        ],
      },
    ];

function registerRenderingUIRegistrations(): void {
  for (const {descriptor, title, options} of RENDERING_UI_DESCRIPTORS) {
    SettingsUI.SettingUIRegistration.register(descriptor, {
      title: i18n.i18n.lockedLazyString(title),
      options: options.map(([value, label]) => option(value, label)),
    });
  }
}

describeWithEnvironment('RenderingOptions', () => {
  beforeEach(() => {
    registerRenderingUIRegistrations();
    const autoDarkModeSetting =
        Common.Settings.Settings.instance().resolve(SDK.SDKSettings.emulateAutoDarkModeSettingDescriptor);
    autoDarkModeSetting.setSettingType(Common.Settings.SettingType.BOOLEAN);
    autoDarkModeSetting.set(false);
  });

  describe('RenderingOptionsView', () => {
    describe('accessibility', () => {
      it('has no aXe violations', async () => {
        const widget = new InspectorMain.RenderingOptions.RenderingOptionsView();
        renderElementIntoDOM(widget);
        await UI.Widget.Widget.allUpdatesComplete;

        assert.exists(widget.contentElement.querySelector('[title="Paint flashing"]'));
        assert.exists(widget.contentElement.querySelector('[title="Disable WebP image format"]'));
        const select = widget.contentElement.querySelector('select');
        assert.isNotNull(select);
        assert.isNotEmpty(select.getAttribute('aria-label'));
        assert.isAbove(select.options.length, 0);
        assert.isEmpty(await getAxeViolations(widget.element));
      });
    });

    it('passes resolved settings to the view', async () => {
      const view = createViewFunctionStub(InspectorMain.RenderingOptions.RenderingOptionsView);
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      const input = await view.nextInput;
      const settings = Common.Settings.Settings.instance();
      assert.strictEqual(input.showPaintRectsSetting,
                         settings.resolve(SDK.SDKSettings.showPaintRectsSettingDescriptor));
      assert.strictEqual(input.showLayoutShiftRegionsSetting,
                         settings.resolve(SDK.SDKSettings.showLayoutShiftRegionsSettingDescriptor));
      assert.strictEqual(input.showDebugBordersSetting,
                         settings.resolve(SDK.SDKSettings.showDebugBordersSettingDescriptor));
      assert.strictEqual(input.showFPSCounterSetting,
                         settings.resolve(SDK.SDKSettings.showFPSCounterSettingDescriptor));
      assert.strictEqual(input.showScrollBottleneckRectsSetting,
                         settings.resolve(SDK.SDKSettings.showScrollBottleneckRectsSettingDescriptor));
      assert.strictEqual(input.showAdHighlightsSetting,
                         settings.resolve(SDK.SDKSettings.showAdHighlightsSettingDescriptor));
      assert.strictEqual(input.localFontsDisabledSetting,
                         settings.resolve(SDK.SDKSettings.localFontsDisabledSettingDescriptor));
      assert.strictEqual(input.emulatePageFocusSetting,
                         settings.resolve(SDK.SDKSettings.emulatePageFocusSettingDescriptor));
      assert.strictEqual(input.emulateAutoDarkModeSetting,
                         settings.resolve(SDK.SDKSettings.emulateAutoDarkModeSettingDescriptor));
      assert.strictEqual(input.prefersColorSchemeSetting,
                         settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor));
      assert.isFalse(input.prefersColorSchemeDisabled);
      assert.strictEqual(input.emulatedCSSMediaSetting,
                         settings.resolve(SDK.SDKSettings.emulatedCSSMediaSettingDescriptor));
      assert.strictEqual(input.forcedColorsSetting,
                         settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureForcedColorsSettingDescriptor));
      assert.strictEqual(
          input.prefersReducedMotionSetting,
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor));
      assert.strictEqual(input.colorGamutSetting,
                         settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureColorGamutSettingDescriptor));
      assert.strictEqual(input.visionDeficiencySetting,
                         settings.resolve(SDK.SDKSettings.emulatedVisionDeficiencySettingDescriptor));
      assert.strictEqual(input.osTextScaleSetting,
                         settings.resolve(SDK.SDKSettings.emulatedOSTextScaleSettingDescriptor));
      assert.strictEqual(input.avifFormatDisabledSetting,
                         settings.resolve(SDK.SDKSettings.avifFormatDisabledSettingDescriptor));
      assert.isNull(input.jpegXlFormatDisabledSetting);
      assert.strictEqual(input.webpFormatDisabledSetting,
                         settings.resolve(SDK.SDKSettings.webpFormatDisabledSettingDescriptor));

      widget.detach();
    });

    it('hides ad highlights setting when devToolsAdsPanel is enabled', async () => {
      updateHostConfig({devToolsAdsPanel: {enabled: true}});
      const view = createViewFunctionStub(InspectorMain.RenderingOptions.RenderingOptionsView);
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      const input = await view.nextInput;
      assert.isNull(input.showAdHighlightsSetting);

      widget.detach();
    });

    it('includes JPEG XL setting when devToolsJpegXlImageFormat is enabled', async () => {
      updateHostConfig({devToolsJpegXlImageFormat: {enabled: true}});
      const view = createViewFunctionStub(InspectorMain.RenderingOptions.RenderingOptionsView);
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      const input = await view.nextInput;
      assert.strictEqual(
          input.jpegXlFormatDisabledSetting,
          Common.Settings.Settings.instance().resolve(SDK.SDKSettings.jpegXlFormatDisabledSettingDescriptor));

      widget.detach();
    });

    it('updates prefersColorSchemeDisabled when emulateAutoDarkMode setting changes', async () => {
      const view = createViewFunctionStub(InspectorMain.RenderingOptions.RenderingOptionsView);
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      let input = await view.nextInput;
      assert.isFalse(input.prefersColorSchemeDisabled);

      const autoDarkModeSetting =
          Common.Settings.Settings.instance().resolve(SDK.SDKSettings.emulateAutoDarkModeSettingDescriptor);
      const nextInputPromise = view.nextInput;
      autoDarkModeSetting.set(true);
      input = await nextInputPromise;
      assert.isTrue(input.prefersColorSchemeDisabled);

      widget.detach();
    });

    it('records metric when emulatePageFocus changes', async () => {
      const actionTakenSpy = sinon.spy(Host.userMetrics, 'actionTaken');
      const view = createViewFunctionStub(InspectorMain.RenderingOptions.RenderingOptionsView);
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);

      const input = await view.nextInput;
      input.onEmulatePageFocusChange();

      sinon.assert.calledOnceWithExactly(actionTakenSpy,
                                         Host.UserMetrics.Action.ToggleEmulateFocusedPageFromRenderingTab);
      widget.detach();
    });

    it('sets jslog attribute on the widget host element', async () => {
      const widget = new InspectorMain.RenderingOptions.RenderingOptionsView();
      widget.markAsRoot();
      renderElementIntoDOM(widget);
      await widget.updateComplete;

      assert.strictEqual(widget.element.getAttribute('jslog'), 'Panel; context: rendering; track: resize');
      assert.strictEqual<Node|null>(widget.contentElement, widget.element.shadowRoot);

      widget.detach();
    });
  });

  describe('DEFAULT_VIEW', () => {
    function createViewInput(overrides: Partial<InspectorMain.RenderingOptions.ViewInput> = {}):
        InspectorMain.RenderingOptions.ViewInput {
      const settings = Common.Settings.Settings.instance();
      return {
        showPaintRectsSetting: createFakeSetting('show-paint-rects', false),
        showLayoutShiftRegionsSetting: createFakeSetting('show-layout-shift-regions', false),
        showDebugBordersSetting: createFakeSetting('show-debug-borders', false),
        showFPSCounterSetting: createFakeSetting('show-fps-counter', false),
        showScrollBottleneckRectsSetting: createFakeSetting('show-scroll-bottleneck-rects', false),
        showAdHighlightsSetting: createFakeSetting('show-ad-highlights', false),
        localFontsDisabledSetting: createFakeSetting('local-fonts-disabled', false),
        emulatePageFocusSetting: createFakeSetting('emulate-page-focus', false),
        onEmulatePageFocusChange: () => {},
        emulateAutoDarkModeSetting: createFakeSetting('emulate-auto-dark-mode', false),
        prefersColorSchemeSetting:
            settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor),
        prefersColorSchemeDisabled: false,
        emulatedCSSMediaSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaSettingDescriptor),
        forcedColorsSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureForcedColorsSettingDescriptor),
        prefersContrastSetting:
            settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersContrastSettingDescriptor),
        prefersReducedMotionSetting:
            settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor),
        prefersReducedDataSetting:
            settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedDataSettingDescriptor),
        prefersReducedTransparencySetting:
            settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedTransparencySettingDescriptor),
        colorGamutSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureColorGamutSettingDescriptor),
        visionDeficiencySetting: settings.resolve(SDK.SDKSettings.emulatedVisionDeficiencySettingDescriptor),
        osTextScaleSetting: settings.resolve(SDK.SDKSettings.emulatedOSTextScaleSettingDescriptor),
        avifFormatDisabledSetting: createFakeSetting('avif-format-disabled', false),
        jpegXlFormatDisabledSetting: createFakeSetting('jpeg-xl-format-disabled', false),
        webpFormatDisabledSetting: createFakeSetting('webp-format-disabled', false),
        ...overrides,
      };
    }

    it('renders checkboxes, subtitles, and select controls', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const onEmulatePageFocusChange = sinon.spy();
      const input = createViewInput({onEmulatePageFocusChange, prefersColorSchemeDisabled: true});

      InspectorMain.RenderingOptions.DEFAULT_VIEW(input, undefined, target);

      assert.include(target.getAttribute('jslog') ?? '', 'Panel; context: rendering; track: resize');

      const checkboxes = Array.from(target.querySelectorAll('devtools-checkbox'));
      assert.lengthOf(checkboxes, 12);
      assert.strictEqual(checkboxes[0].getAttribute('title'), 'Paint flashing');
      const subtitle = checkboxes[0].querySelector('.devtools-checkbox-subtitle');
      assert.isNotNull(subtitle);
      assert.include(subtitle.textContent ?? '', 'Highlights areas of the page (green)');

      const focusedPageCheckbox = checkboxes.find(cb => cb.getAttribute('title') === 'Emulate a focused page');
      assert.isDefined(focusedPageCheckbox);
      focusedPageCheckbox.dispatchEvent(new Event('change'));
      sinon.assert.calledOnce(onEmulatePageFocusChange);

      const selects = target.querySelectorAll('select');
      assert.lengthOf(selects, 10);
      assert.isTrue(selects[0].disabled);
    });

    it('omits conditional controls when their settings are null', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const input = createViewInput({
        showAdHighlightsSetting: null,
        prefersContrastSetting: null,
        prefersReducedDataSetting: null,
        jpegXlFormatDisabledSetting: null,
      });

      InspectorMain.RenderingOptions.DEFAULT_VIEW(input, undefined, target);

      const checkboxes = Array.from(target.querySelectorAll('devtools-checkbox'));
      assert.lengthOf(checkboxes, 10);
      assert.isUndefined(checkboxes.find(cb => cb.getAttribute('title') === 'Highlight ads'));
      assert.isUndefined(checkboxes.find(cb => cb.getAttribute('title') === 'Disable `JPEG XL` image format'));

      const selects = target.querySelectorAll('select');
      assert.lengthOf(selects, 8);
    });
  });

  describe('ReloadActionDelegate', () => {
    it('cycles prefers-color-scheme setting on rendering.toggle-prefers-color-scheme', () => {
      const setting = Common.Settings.Settings.instance().resolve(
          SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor);
      setting.set('');
      const delegate = new InspectorMain.RenderingOptions.ReloadActionDelegate();
      const context = UI.Context.Context.instance();

      assert.isTrue(delegate.handleAction(context, 'rendering.toggle-prefers-color-scheme'));
      assert.strictEqual(setting.get(), 'light');

      assert.isTrue(delegate.handleAction(context, 'rendering.toggle-prefers-color-scheme'));
      assert.strictEqual(setting.get(), 'dark');

      assert.isTrue(delegate.handleAction(context, 'rendering.toggle-prefers-color-scheme'));
      assert.strictEqual(setting.get(), '');
    });
  });
});
