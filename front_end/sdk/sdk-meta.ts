// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';


Common.Settings.registerSettingExtension({
  settingName: 'skipStackFramesPattern',
  settingType: Common.Settings.SettingTypeObject.REGEX,
  defaultValue: '',
});

Common.Settings.registerSettingExtension({
  settingName: 'skipContentScripts',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Preserve log upon navigation`,
  settingName: 'preserveConsoleLog',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Preserve log upon navigation`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not preserve log upon navigation`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.DEBUGGER,
  settingName: 'pauseOnExceptionEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Pause on exceptions`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not pause on exceptions`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'pauseOnCaughtException',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Disable JavaScript`,
  settingName: 'javaScriptDisabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  order: 1,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Disable JavaScript`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Enable JavaScript`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Disable async stack traces`,
  settingName: 'disableAsyncStackTraces',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  order: 2,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Do not capture async stack traces`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Capture async stack traces`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.DEBUGGER,
  settingName: 'breakpointsActive',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.ELEMENTS,
  title: (): Platform.UIString.LocalizedString => ls`Show rulers`,
  settingName: 'showMetricsRulers',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GRID,
  title: (): Platform.UIString.LocalizedString => ls`Show area names`,
  settingName: 'showGridAreas',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show grid named areas`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not show grid named areas`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GRID,
  title: (): Platform.UIString.LocalizedString => ls`Show track sizes`,
  settingName: 'showGridTrackSizes',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show grid track sizes`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not show grid track sizes`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GRID,
  title: (): Platform.UIString.LocalizedString => ls`Extend grid lines`,
  settingName: 'extendGridLines',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Extend grid lines`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not extend grid lines`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.GRID,
  title: (): Platform.UIString.LocalizedString => ls`Show line labels`,
  settingName: 'showGridLineLabels',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Hide line labels`,
      text: (): Platform.UIString.LocalizedString => ls`Hide line labels`,
      value: 'none',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Show line numbers`,
      text: (): Platform.UIString.LocalizedString => ls`Show line numbers`,
      value: 'lineNumbers',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Show line names`,
      text: (): Platform.UIString.LocalizedString => ls`Show line names`,
      value: 'lineNames',
    },
  ],
  defaultValue: 'lineNumbers',
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showPaintRects',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show paint flashing rectangles`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide paint flashing rectangles`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showLayoutShiftRegions',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show layout shift regions`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide layout shift regions`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showAdHighlights',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Highlight ad frames`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not highlight ad frames`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showDebugBorders',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show layer borders`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide layer borders`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showWebVitals',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show Core Web Vitals overlay`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide Core Web Vitals overlay`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showFPSCounter',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show frames per second (FPS) meter`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide frames per second (FPS) meter`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showScrollBottleneckRects',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show scroll performance bottlenecks`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide scroll performance bottlenecks`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'showHitTestBorders',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show hit-test borders`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide hit-test borders`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  title: (): Platform.UIString.LocalizedString => ls`Emulate a focused page`,
  settingName: 'emulatePageFocus',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Emulate a focused page`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate a focused page`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'emulatedCSSMedia',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate CSS media type`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: '',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS print media type`,
      text: (): Platform.UIString.LocalizedString => ls`print`,
      value: 'print',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS screen media type`,
      text: (): Platform.UIString.LocalizedString => ls`screen`,
      value: 'screen',
    },
  ],
  tags: [
    (): Platform.UIString.LocalizedString => ls`query`,
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate CSS media type`,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'emulatedCSSMediaFeaturePrefersColorScheme',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate CSS prefers-color-scheme`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: '',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS prefers-color-scheme: light`,
      text: (): Platform.UIString.LocalizedString => ls`prefers-color-scheme: light`,
      value: 'light',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS prefers-color-scheme: dark`,
      text: (): Platform.UIString.LocalizedString => ls`prefers-color-scheme: dark`,
      value: 'dark',
    },
  ],
  tags: [
    (): Platform.UIString.LocalizedString => ls`query`,
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate CSS media feature prefers-color-scheme`,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'emulatedCSSMediaFeaturePrefersReducedMotion',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate CSS prefers-reduced-motion`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: '',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS prefers-reduced-motion: reduce`,
      text: (): Platform.UIString.LocalizedString => ls`prefers-reduced-motion: reduce`,
      value: 'reduce',
    },
  ],
  tags: [
    (): Platform.UIString.LocalizedString => ls`query`,
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate CSS media feature prefers-reduced-motion`,
});

Common.Settings.registerSettingExtension({
  settingName: 'emulatedCSSMediaFeaturePrefersReducedData',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate CSS prefers-reduced-data`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: '',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS prefers-reduced-data: reduce`,
      text: (): Platform.UIString.LocalizedString => ls`prefers-reduced-data: reduce`,
      value: 'reduce',
    },
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate CSS media feature prefers-reduced-data`,
});

Common.Settings.registerSettingExtension({
  settingName: 'emulatedCSSMediaFeatureColorGamut',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate CSS color-gamut`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: '',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS color-gamut: srgb`,
      text: (): Platform.UIString.LocalizedString => ls`color-gamut: srgb`,
      value: 'srgb',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS color-gamut: p3`,
      text: (): Platform.UIString.LocalizedString => ls`color-gamut: p3`,
      value: 'p3',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate CSS color-gamut: rec2020`,
      text: (): Platform.UIString.LocalizedString => ls`color-gamut: rec2020`,
      value: 'rec2020',
    },
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate CSS media feature color-gamut`,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'emulatedVisionDeficiency',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: 'none',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not emulate any vision deficiency`,
      text: (): Platform.UIString.LocalizedString => ls`No emulation`,
      value: 'none',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate blurred vision`,
      text: (): Platform.UIString.LocalizedString => ls`Blurred vision`,
      value: 'blurredVision',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate protanopia`,
      text: (): Platform.UIString.LocalizedString => ls`Protanopia`,
      value: 'protanopia',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate deuteranopia`,
      text: (): Platform.UIString.LocalizedString => ls`Deuteranopia`,
      value: 'deuteranopia',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate tritanopia`,
      text: (): Platform.UIString.LocalizedString => ls`Tritanopia`,
      value: 'tritanopia',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Emulate achromatopsia`,
      text: (): Platform.UIString.LocalizedString => ls`Achromatopsia`,
      value: 'achromatopsia',
    },
  ],
  tags: [
    (): Platform.UIString.LocalizedString => ls`query`,
  ],
  title: (): Platform.UIString.LocalizedString => ls`Emulate vision deficiencies`,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'localFontsDisabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Disable local fonts`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Enable local fonts`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'avifFormatDisabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Disable AVIF format`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Enable AVIF format`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.RENDERING,
  settingName: 'webpFormatDisabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Disable WebP format`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Enable WebP format`,
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.CONSOLE,
  title: (): Platform.UIString.LocalizedString => ls`Enable custom formatters`,
  settingName: 'customFormatters',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Enable network request blocking`,
  settingName: 'requestBlockingEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable network request blocking`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable network request blocking`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.NETWORK,
  title: (): Platform.UIString.LocalizedString => ls`Disable cache (while DevTools is open)`,
  settingName: 'cacheDisabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  order: 0,
  defaultValue: false,
  userActionCondition: 'hasOtherClients',
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Disable cache (while DevTools is open)`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Enable cache`,
    },
  ],
});
