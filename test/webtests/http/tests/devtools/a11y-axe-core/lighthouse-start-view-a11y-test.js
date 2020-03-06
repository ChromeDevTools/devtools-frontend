// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests accessibility in the lighthouse start view using the axe-core linter.\n');
  await TestRunner.loadModule('axe_core_test_runner');
  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');
  await AxeCoreTestRunner.runValidation(LighthouseTestRunner.getContainerElement());
  TestRunner.completeTest();
})();
