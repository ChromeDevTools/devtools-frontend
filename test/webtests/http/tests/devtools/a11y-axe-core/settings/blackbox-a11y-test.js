// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests accessibility in IgnoreList view using the axe-core linter.');

  await TestRunner.loadTestModule('axe_core_test_runner');
  await UI.viewManager.showView('blackbox');
  const ignoreListWidget = await UI.viewManager.view('blackbox').widget();

  async function testAddPattern() {
    const addPatternButton = ignoreListWidget._defaultFocusedElement;
    // Make add pattern editor visible
    addPatternButton.click();

    const ignoreListInputs = ignoreListWidget._list._editor._controls;
    TestRunner.addResult(`Opened input box: ${Boolean(ignoreListInputs)}`);

    await AxeCoreTestRunner.runValidation(ignoreListWidget.contentElement);
  }

  async function testPatternList() {
    ignoreListWidget._list.appendItem('test*', true);
    TestRunner.addResult(`Added a pattern in the list: ${ignoreListWidget._list._items}`);
    await AxeCoreTestRunner.runValidation(ignoreListWidget.contentElement);
  }

  async function testPatternError() {
    const ignoreListEditor = ignoreListWidget._list._editor;
    const patternInput = ignoreListEditor._controls[0];
    // Blur patternInput to run validator
    patternInput.blur();

    const errorMessage = ignoreListEditor._errorMessageContainer.textContent;
    TestRunner.addResult(`Error message: ${errorMessage}`);

    await AxeCoreTestRunner.runValidation(ignoreListWidget.contentElement);
  }

  TestRunner.runAsyncTestSuite([testAddPattern, testPatternList, testPatternError]);
})();
