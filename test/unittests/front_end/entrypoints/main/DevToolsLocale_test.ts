// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Main from '../../../../../front_end/entrypoints/main/main.js';
import {createFakeSetting} from '../../helpers/EnvironmentHelpers.js';

describe('DevToolsLocale', () => {
  const languageSetting = createFakeSetting('language', 'de-AT');

  it('chooses navigator.language if setting is "browserLanguage"', () => {
    languageSetting.set('browserLanguage');
    const devToolsLocale =
        Main.DevToolsLocale.DevToolsLocale.instance({create: true, languageSetting, navigatorLanguage: 'en-GB'});

    assert.strictEqual(devToolsLocale.locale, 'en-GB');
  });

  it('chooses setting language if setting has any other value than "browserLanguage"', () => {
    languageSetting.set('zh');
    const devToolsLocale =
        Main.DevToolsLocale.DevToolsLocale.instance({create: true, languageSetting, navigatorLanguage: 'en-GB'});

    assert.strictEqual(devToolsLocale.locale, 'zh');
  });

  it('falls back to en-US should navigator.language be empty', () => {
    languageSetting.set('browserLanguage');
    const devToolsLocale =
        Main.DevToolsLocale.DevToolsLocale.instance({create: true, languageSetting, navigatorLanguage: ''});

    assert.strictEqual(devToolsLocale.locale, 'en-US');
  });
});
