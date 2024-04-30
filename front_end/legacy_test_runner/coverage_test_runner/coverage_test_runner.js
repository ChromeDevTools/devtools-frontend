// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coverage from '../../panels/coverage/coverage.js';
import * as UI from '../../ui/legacy/legacy.js';
import {SourcesTestRunner} from '../sources_test_runner/sources_test_runner.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */
export const CoverageTestRunner = {};

/**
 * @param jsCoveragePerBlock - Collect per Block coverage if `true`, per function coverage otherwise.
 * @return {!Promise}
 */
CoverageTestRunner.startCoverage = async function(jsCoveragePerBlock) {
  UI.ViewManager.ViewManager.instance().showView('coverage');
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  await coverageView.startRecording({reload: false, jsCoveragePerBlock});
};

/**
 * @return {!Promise}
 */
CoverageTestRunner.stopCoverage = function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  return coverageView.stopRecording();
};

/**
 * @return {!Promise}
 */
CoverageTestRunner.suspendCoverageModel = async function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  await coverageView.model.preSuspendModel();
  await coverageView.model.suspendModel();
};

/**
 * @return {!Promise}
 */
CoverageTestRunner.resumeCoverageModel = async function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  await coverageView.model.resumeModel();
  await coverageView.model.postResumeModel();
};

/**
 * @return {!Promise}
 */
CoverageTestRunner.pollCoverage = async function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  // Make sure not to have two instances of _pollAndCallback running at the same time.
  await coverageView.model.currentPollPromise;
  return coverageView.model.pollAndCallback();
};

/**
 * @return {!Promise<Coverage.CoverageModel.CoverageModel>}
 */
CoverageTestRunner.getCoverageModel = function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  return coverageView.model;
};

/**
 * @return {!Promise<string>}
 */
CoverageTestRunner.exportReport = async function() {
  const coverageView = Coverage.CoverageView.CoverageView.instance();
  let data;
  await coverageView.model.exportReport({
    write: d => {
      data = d;
    },
    close: _ => 0
  });
  return data;
};

/**
 * @return {!Promise<!SourceFrame.SourceFrame>}
 */
CoverageTestRunner.sourceDecorated = async function(source) {
  await UI.InspectorView.InspectorView.instance().showPanel('sources');
  const decoratePromise = TestRunner.addSnifferPromise(Coverage.CoverageView.LineDecorator.prototype, 'innerDecorate');
  const sourceFrame = await SourcesTestRunner.showScriptSourcePromise(source);
  await decoratePromise;
  return sourceFrame;
};

CoverageTestRunner.dumpDecorations = async function(source) {
  const sourceFrame = await CoverageTestRunner.sourceDecorated(source);
  CoverageTestRunner.dumpDecorationsInSourceFrame(sourceFrame);
};

/**
 * @return {?DataGrid.DataGridNode}
 */
CoverageTestRunner.findCoverageNodeForURL = function(url) {
  const coverageListView = Coverage.CoverageView.CoverageView.instance().listView;
  const rootNode = coverageListView.dataGrid.rootNode();

  for (const child of rootNode.children) {
    if (child.coverageInfo.url().endsWith(url)) {
      return child;
    }
  }

  return null;
};

CoverageTestRunner.dumpDecorationsInSourceFrame = function(sourceFrame) {
  const markerMap = new Map([['used', '+'], ['unused', '-']]);
  const codeMirror = sourceFrame.textEditor.codeMirror();

  for (let line = 0; line < codeMirror.lineCount(); ++line) {
    const text = codeMirror.getLine(line);
    let markerType = ' ';
    const lineInfo = codeMirror.lineInfo(line);

    if (!lineInfo) {
      continue;
    }

    const gutterElement = lineInfo.gutterMarkers && lineInfo.gutterMarkers['CodeMirror-gutter-coverage'];

    if (gutterElement) {
      const markerClass = /^text-editor-coverage-(\w*)-marker$/.exec(gutterElement.classList)[1];
      markerType = markerMap.get(markerClass) || gutterElement.classList;
    }

    TestRunner.addResult(`${line}: ${markerType} ${text}`);
  }
};

CoverageTestRunner.dumpCoverageListView = function() {
  const coverageListView = Coverage.CoverageView.CoverageView.instance().listView;
  const dataGrid = coverageListView.dataGrid;
  dataGrid.updateInstantly();

  for (const child of dataGrid.rootNode().children) {
    const data = child.coverageInfo;
    const url = TestRunner.formatters.formatAsURL(data.url());

    if (url.startsWith('test://')) {
      continue;
    }

    const type = Coverage.CoverageListView.coverageTypeToString(data.type());
    TestRunner.addResult(`${url} ${type} used: ${data.usedSize()} unused: ${data.unusedSize()} total: ${data.size()}`);
  }
};
