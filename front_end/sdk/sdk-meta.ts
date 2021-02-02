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
