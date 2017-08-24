// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

function getOutPath(inputPath) {
  const nonHttpLayoutTestPrefix = 'LayoutTests/inspector';
  const httpLayoutTestPrefix = 'LayoutTests/http/tests/inspector';
  const postfix = inputPath.indexOf(nonHttpLayoutTestPrefix) === -1 ?
      inputPath.slice(inputPath.indexOf(httpLayoutTestPrefix) + httpLayoutTestPrefix.length + 1) :
      inputPath.slice(inputPath.indexOf(nonHttpLayoutTestPrefix) + nonHttpLayoutTestPrefix.length + 1);
  const out = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', 'http', 'tests', 'devtools', postfix);
  return out;
}


function mapTestFilename(filename) {
  let namespacePrefix = path.basename(filename, '.js')
                            .split('-test')[0]
                            .split('-')
                            .map(a => a.substring(0, 1).toUpperCase() + a.substring(1))
                            .join('');
  let filenamePrefix = namespacePrefix;
  if (namespacePrefix === 'PageMock')
    namespacePrefix = '';
  if (namespacePrefix === 'SyntaxHighlight')
    namespacePrefix = '';
  if (namespacePrefix === 'Datagrid') {
    namespacePrefix = 'DataGrid';
    filenamePrefix = 'DataGrid';
  }
  if (namespacePrefix === 'TimelineData')
    namespacePrefix = 'Performance';
  if (namespacePrefix === 'StylesUpdateLinks')
    namespacePrefix = 'Elements';
  if (namespacePrefix === 'BreakpointManager')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'ElementsPanelShadowSelectionOnRefresh')
    namespacePrefix = 'Elements';

  if (namespacePrefix === 'ExtensionsNetwork')
    namespacePrefix = 'Extensions';
  if (namespacePrefix === 'CspInline')
    namespacePrefix = 'CSPInline';
  if (namespacePrefix === 'Debugger')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'Resources') {
    namespacePrefix = 'Application';
  }
  if (namespacePrefix === 'Appcache')
    namespacePrefix = 'Application';
  if (namespacePrefix === 'ResourceTree')
    namespacePrefix = 'Application';
  if (namespacePrefix === 'ServiceWorkers')
    namespacePrefix = 'Application';
  if (namespacePrefix === 'CacheStorage')
    namespacePrefix = 'Application';
  if (namespacePrefix === 'Indexeddb') {
    namespacePrefix = 'Application';
    filenamePrefix = 'IndexedDB';
  }
  if (namespacePrefix === 'Timeline')
    namespacePrefix = 'Performance';
  if (namespacePrefix === 'ProductRegistry')
    namespacePrefix = 'Network';
  if (namespacePrefix === 'Editor')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'Search')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'LiveEdit')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'Autocomplete')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'Changes')
    namespacePrefix = 'Sources';
  if (namespacePrefix === 'Persistence')
    namespacePrefix = 'Bindings';
  if (namespacePrefix === 'IsolatedFilesystem')
    namespacePrefix = 'Bindings';
  if (namespacePrefix === 'Automapping')
    namespacePrefix = 'Bindings';
  if (namespacePrefix === 'AccessibilityPane')
    namespacePrefix = 'Accessibility';
  if (namespacePrefix === 'EditDom') {
    namespacePrefix = 'Elements';
    filenamePrefix = 'EditDOM';
  }
  if (namespacePrefix === 'SetOuterHtml') {
    namespacePrefix = 'Elements';
    filenamePrefix = 'SetOuterHTML';
  }
  if (namespacePrefix === 'HeapSnapshot')
    namespacePrefix = 'Profiler';
  if (namespacePrefix === 'Sass') {
    namespacePrefix = 'SASS';
    filenamePrefix = 'SASS';
  }
  if (namespacePrefix === 'Editing') {
    namespacePrefix = 'SASS';
    filenamePrefix = 'SASSEditing'
  }
  if (namespacePrefix === 'ExtensionsAudits')
    namespacePrefix = 'Extensions';
  return {namespacePrefix, filenamePrefix};
}

module.exports = {
  getOutPath,
  mapTestFilename,
};
