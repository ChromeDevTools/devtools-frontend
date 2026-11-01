// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithEnvironment('RenderingOptions', () => {
  beforeEach(() => {
    const autoDarkModeSetting =
        Common.Settings.Settings.instance().resolve(SDK.SDKSettings.emulateAutoDarkModeSettingDescriptor);
    autoDarkModeSetting.setSettingType(Common.Settings.SettingType.BOOLEAN);
    autoDarkModeSetting.set(false);
  });

  describe('RenderingOptionsView', () => {
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
        prefersReducedTransparencySetting: null,
        jpegXlFormatDisabledSetting: null,
      });

      InspectorMain.RenderingOptions.DEFAULT_VIEW(input, undefined, target);

      const checkboxes = Array.from(target.querySelectorAll('devtools-checkbox'));
      assert.lengthOf(checkboxes, 10);
      assert.isUndefined(checkboxes.find(cb => cb.getAttribute('title') === 'Highlight ads'));
      assert.isUndefined(checkboxes.find(cb => cb.getAttribute('title') === 'Disable `JPEG XL` image format'));

      const selects = target.querySelectorAll('select');
      assert.lengthOf(selects, 7);
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
