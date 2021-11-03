// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  await TestRunner.loadTestModule('axe_core_test_runner');
  await TestRunner.loadTestModule('sources_test_runner');
  await TestRunner.loadLegacyModule('sources');

  TestRunner.addResult('Testing accessibility in the javascript breakpoints pane.');
  await SourcesTestRunner.startDebuggerTestPromise(true);
  await TestRunner.navigatePromise('../../sources/debugger/resources/set-breakpoint.html');
  const sourceFrame = await SourcesTestRunner.showScriptSourcePromise('set-breakpoint.html');

  TestRunner.addResult('Setting a breakpoint.');
  await SourcesTestRunner.createNewBreakpoint(sourceFrame, 13, '', true);
  await SourcesTestRunner.createNewBreakpoint(sourceFrame, 11, '', false);
  await UI.viewManager.showView('sources.jsBreakpoints');
  const breakpointsPaneElement = Sources.JavaScriptBreakpointsSidebarPane.instance().contentElement;

  TestRunner.addResult('Running axe on the javascript breakpoints pane.');
  await AxeCoreTestRunner.runValidation(breakpointsPaneElement);
  SourcesTestRunner.completeDebuggerTest();
})();
