// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../core/i18n/i18n.js';
// @ts-expect-error tsc doesn't like import assertions.
// eslint-disable-next-line  @devtools/es-modules-import
import EnUsLocaleData from '../core/i18n/locales/en-US.json' with { type: 'json' };
export async function initializeGlobalLocaleVars() {
    // Expose the locale.
    i18n.DevToolsLocale.DevToolsLocale.instance({
        create: true,
        data: {
            navigatorLanguage: 'en-US',
            settingLanguage: 'en-US',
            lookupClosestDevToolsLocale: () => 'en-US',
        },
    });
    if (i18n.i18n.hasLocaleDataForTest('en-US')) {
        return;
    }
    i18n.i18n.registerLocaleDataForTest('en-US', EnUsLocaleData);
}
export function deinitializeGlobalLocaleVars() {
    i18n.DevToolsLocale.DevToolsLocale.removeInstance();
}
export function describeWithLocale(title, fn) {
    return describe(title, function () {
        before(async () => await initializeGlobalLocaleVars());
        fn.call(this);
        after(deinitializeGlobalLocaleVars);
    });
}
describeWithLocale.only = function (title, fn) {
    // eslint-disable-next-line mocha/no-exclusive-tests
    return describe.only(title, function () {
        before(async () => await initializeGlobalLocaleVars());
        fn.call(this);
        after(deinitializeGlobalLocaleVars);
    });
};
describeWithLocale.skip = function (title, fn) {
    // eslint-disable-next-line @devtools/check-test-definitions
    return describe.skip(title, function () {
        fn.call(this);
    });
};
//# sourceMappingURL=LocaleHelpers.js.map