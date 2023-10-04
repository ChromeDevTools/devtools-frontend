// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Profiler from '../../panels/profiler/profiler.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */
export const CPUProfilerTestRunner = {};

CPUProfilerTestRunner.startProfilerTest = function(callback) {
  TestRunner.addResult('Profiler was enabled.');
  TestRunner.addSniffer(
      Profiler.ProfilesPanel.JSProfilerPanel.instance(), 'addProfileHeader', CPUProfilerTestRunner.profileHeaderAdded,
      true);
  TestRunner.addSniffer(
      Profiler.ProfileView.ProfileView.prototype, 'refresh', CPUProfilerTestRunner.profileViewRefresh, true);
  TestRunner.safeWrap(callback)();
};

CPUProfilerTestRunner.completeProfilerTest = function() {
  TestRunner.addResult('');
  TestRunner.addResult('Profiler was disabled.');
  TestRunner.completeTest();
};

CPUProfilerTestRunner.runProfilerTestSuite = function(testSuite) {
  const testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      CPUProfilerTestRunner.completeProfilerTest();
      return;
    }

    const nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  CPUProfilerTestRunner.startProfilerTest(runner);
};

CPUProfilerTestRunner.showProfileWhenAdded = function(title) {
  CPUProfilerTestRunner.showProfileWhenAdded = title;
};

CPUProfilerTestRunner.profileHeaderAdded = function(profile) {
  if (CPUProfilerTestRunner.showProfileWhenAdded === profile.title) {
    Profiler.ProfilesPanel.JSProfilerPanel.instance().showProfile(profile);
  }
};

CPUProfilerTestRunner.waitUntilProfileViewIsShown = function(title, callback) {
  callback = TestRunner.safeWrap(callback);
  const profilesPanel = Profiler.ProfilesPanel.JSProfilerPanel.instance();

  if (profilesPanel.visibleView && profilesPanel.visibleView.profile &&
      profilesPanel.visibleView.profileHeader.title === title) {
    callback(profilesPanel.visibleView);
  } else {
    CPUProfilerTestRunner.waitUntilProfileViewIsShownCallback = {title: title, callback: callback};
  }
};

CPUProfilerTestRunner.profileViewRefresh = function() {
  if (CPUProfilerTestRunner.waitUntilProfileViewIsShownCallback &&
      CPUProfilerTestRunner.waitUntilProfileViewIsShownCallback.title === this.profileHeader.title) {
    const callback = CPUProfilerTestRunner.waitUntilProfileViewIsShownCallback;
    delete CPUProfilerTestRunner.waitUntilProfileViewIsShownCallback;
    callback.callback(this);
  }
};
