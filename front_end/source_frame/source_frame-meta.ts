// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

export const UIStrings = {
  /**
  *@description Title of a setting under the Sources category in Settings
  */
  defaultIndentation: 'Default indentation:',
  /**
  *@description Title of a setting under the Sources category that can be invoked through the Command Menu
  */
  setIndentationToSpaces: 'Set indentation to 2 spaces',
  /**
  *@description A drop-down menu option to set indentation to 2 spaces
  */
  Spaces: '2 spaces',
  /**
  *@description Title of a setting under the Sources category that can be invoked through the Command Menu
  */
  setIndentationToFSpaces: 'Set indentation to 4 spaces',
  /**
  *@description A drop-down menu option to set indentation to 4 spaces
  */
  fSpaces: '4 spaces',
  /**
  *@description Title of a setting under the Sources category that can be invoked through the Command Menu
  */
  setIndentationToESpaces: 'Set indentation to 8 spaces',
  /**
  *@description A drop-down menu option to set indentation to 8 spaces
  */
  eSpaces: '8 spaces',
  /**
  *@description Title of a setting under the Sources category that can be invoked through the Command Menu
  */
  setIndentationToTabCharacter: 'Set indentation to tab character',
  /**
  *@description A drop-down menu option to set indentation to tab character
  */
  tabCharacter: 'Tab character',
};
const str_ = i18n.i18n.registerUIStrings('source_frame/source_frame-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: i18nString(UIStrings.defaultIndentation),
  settingName: 'textEditorIndent',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: '    ',
  options: [
    {
      title: i18nString(UIStrings.setIndentationToSpaces),
      text: i18nString(UIStrings.Spaces),
      value: '  ',
    },
    {
      title: i18nString(UIStrings.setIndentationToFSpaces),
      text: i18nString(UIStrings.fSpaces),
      value: '    ',
    },
    {
      title: i18nString(UIStrings.setIndentationToESpaces),
      text: i18nString(UIStrings.eSpaces),
      value: '        ',
    },
    {
      title: i18nString(UIStrings.setIndentationToTabCharacter),
      text: i18nString(UIStrings.tabCharacter),
      value: '\t',
    },
  ],
});
