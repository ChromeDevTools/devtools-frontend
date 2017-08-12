// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

CoverageTestRunner.startCoverage = function() {
  UI.viewManager.showView('coverage');
  var coverageView = self.runtime.sharedInstance(Coverage.CoverageView);
  coverageView._startRecording();
};

CoverageTestRunner.stopCoverage = function() {
  var coverageView = self.runtime.sharedInstance(Coverage.CoverageView);
  return coverageView._stopRecording();
};

CoverageTestRunner.sourceDecorated = async function(source) {
  await UI.inspectorView.showPanel('sources');
  var decoratePromise = TestRunner.addSnifferPromise(Coverage.CoverageView.LineDecorator.prototype, '_innerDecorate');
  var sourceFrame = await new Promise(fulfill => SourcesTestRunner.showScriptSource(source, fulfill));
  await decoratePromise;
  return sourceFrame;
};

CoverageTestRunner.dumpDecorations = async function(source) {
  var sourceFrame = await CoverageTestRunner.sourceDecorated(source);
  CoverageTestRunner.dumpDecorationsInSourceFrame(sourceFrame);
};

CoverageTestRunner.findCoverageNodeForURL = function(url) {
  var coverageListView = self.runtime.sharedInstance(Coverage.CoverageView)._listView;
  var rootNode = coverageListView._dataGrid.rootNode();

  for (var child of rootNode.children) {
    if (child._coverageInfo.url().endsWith(url))
      return child;
  }

  return null;
};

CoverageTestRunner.dumpDecorationsInSourceFrame = function(sourceFrame) {
  var markerMap = new Map([['used', '+'], ['unused', '-']]);
  var codeMirror = sourceFrame.textEditor.codeMirror();

  for (var line = 0; line < codeMirror.lineCount(); ++line) {
    var text = codeMirror.getLine(line);
    var markerType = ' ';
    var lineInfo = codeMirror.lineInfo(line);

    if (!lineInfo)
      continue;

    var gutterElement = lineInfo.gutterMarkers && lineInfo.gutterMarkers['CodeMirror-gutter-coverage'];

    if (gutterElement) {
      var markerClass = /^text-editor-coverage-(\w*)-marker$/.exec(gutterElement.classList)[1];
      markerType = markerMap.get(markerClass) || gutterElement.classList;
    }

    TestRunner.addResult(`${line}: ${markerType} ${text}`);
  }
};

CoverageTestRunner.dumpCoverageListView = function() {
  var coverageListView = self.runtime.sharedInstance(Coverage.CoverageView)._listView;
  var dataGrid = coverageListView._dataGrid;
  dataGrid.updateInstantly();

  for (var child of dataGrid.rootNode().children) {
    var data = child._coverageInfo;
    var url = TestRunner.formatters.formatAsURL(data.url());

    if (url.endsWith('-test.js') || url.endsWith('.html'))
      continue;

    var type = Coverage.CoverageListView._typeToString(data.type());
    TestRunner.addResult(`${url} ${type} used: ${data.usedSize()} unused: ${data.unusedSize()} total: ${data.size()}`);
  }
};
