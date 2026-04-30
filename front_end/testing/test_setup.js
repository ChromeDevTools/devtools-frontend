// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * This file is automatically loaded and run by Karma because it automatically
 * loads and injects all *.js files it finds.
 */
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Trace from '../models/trace/trace.js';
import * as TraceSourceMapsResolver from '../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
import * as ThemeSupport from '../ui/legacy/theme_support/theme_support.js';
import { cleanTestDOM, setupTestDOM } from './DOMHooks.js';
import { createFakeSetting, resetHostConfig } from './EnvironmentHelpers.js';
import { TraceLoader } from './TraceLoader.js';
import { checkForPendingActivity, startTrackingAsyncActivity, stopTrackingAsyncActivity, } from './TrackAsyncOperations.js';
const LOADING_TIMEOUT = 5_000;
async function setupTestFont() {
    document.documentElement.classList.add('platform-screenshot-test');
    await new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject('Failing loading the fonts from the network'), LOADING_TIMEOUT);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap';
        link.onload = ev => {
            clearTimeout(timer);
            resolve(ev);
        };
        document.head.appendChild(link);
    });
    const loadFontsPromise = Promise
        .all([
        document.fonts.load('400 16px "Roboto"'), // Normal
        document.fonts.load('500 16px "Roboto"'), // Medium
        document.fonts.load('700 16px "Roboto"'), // Bold
        document.fonts.load('italic 400 16px "Roboto"'),
        document.fonts.load('italic 500 16px "Roboto"'),
        document.fonts.load('italic 700 16px "Roboto"'),
    ])
        .then(async () => {
        return await document.fonts.ready;
    });
    await Promise.race([
        loadFontsPromise,
        new Promise((_res, rej) => setTimeout(() => rej('Failing loading the fonts from the network'), LOADING_TIMEOUT)),
    ]);
}
before(async function () {
    // All setup function should manage their own timeout
    this.timeout(0);
    await setupTestFont();
    // There is no way to provide after each file run via a test set up file.
    // What we do instead is add and after all in all global test suits
    // This is as close as we can get to after each file.
    this.test?.parent?.suites.forEach(function (suite) {
        suite.afterAll(function () {
            TraceLoader.resetCache();
        });
    });
});
beforeEach(async function () {
    if (this.currentTest) {
        this.currentTest.hasExclusiveTests = this.currentTest.parent?.hasOnly?.();
    }
    stopTrackingAsyncActivity();
    resetHostConfig();
    // Clear out any Sinon stubs or spies between individual tests.
    sinon.restore();
    await setupTestDOM();
    // Ensure that no trace data leaks between tests when testing the trace engine.
    for (const handler of Object.values(Trace.Handlers.ModelHandlers)) {
        handler.reset();
    }
    Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
    TraceSourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
    // Don't retain host binding listeners across tests. Set this up before initializing ThemeSupport as
    // ThemeSupport adds a host binding listener.
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
    // Some unit tests exercise code that assumes a ThemeSupport instance is available.
    // Run this in a beforeEach in case an individual test overrides it.
    const setting = createFakeSetting('ui-theme', 'default');
    ThemeSupport.ThemeSupport.instance({ forceNew: true, setting });
    startTrackingAsyncActivity();
});
afterEach(async function () {
    cleanTestDOM(this.currentTest?.fullTitle());
    await checkForPendingActivity(this.currentTest?.fullTitle());
    stopTrackingAsyncActivity();
    // Clear out any Sinon stubs or spies between individual tests.
    sinon.clock?.runToLast();
    sinon.restore();
});
//# sourceMappingURL=test_setup.js.map