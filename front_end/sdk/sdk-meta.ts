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
