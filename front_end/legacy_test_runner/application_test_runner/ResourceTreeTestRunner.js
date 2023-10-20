// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Application from '../../panels/application/application.js';
import * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';
import {SourcesTestRunner} from '../sources_test_runner/sources_test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const dumpResources = function(formatter) {
  const results = [];

  function formatterWrapper(resource) {
    if (formatter) {
      results.push({resource: resource, text: formatter(resource)});
    } else {
      results.push({resource: resource, text: resource.url});
    }
  }

  TestRunner.resourceTreeModel.forAllResources(formatterWrapper);

  function comparator(result1, result2) {
    return result1.resource.url.localeCompare(result2.resource.url);
  }

  results.sort(comparator);

  for (let i = 0; i < results.length; ++i) {
    TestRunner.addResult(results[i].text);
  }
};

export const dumpResourcesURLMap = function() {
  const results = [];
  TestRunner.resourceTreeModel.forAllResources(collect);

  function collect(resource) {
    results.push({url: resource.url, resource: TestRunner.resourceTreeModel.resourceForURL(resource.url)});
  }

  function comparator(result1, result2) {
    if (result1.url > result2.url) {
      return 1;
    }

    if (result2.url > result1.url) {
      return -1;
    }

    return 0;
  }

  results.sort(comparator);

  for (let i = 0; i < results.length; ++i) {
    TestRunner.addResult(results[i].url + ' == ' + results[i].resource.url);
  }
};

let testSourceNavigator;

export const dumpResourcesTree = function() {
  function dump(treeItem, prefix) {
    if (typeof treeItem.resetBubble === 'function') {
      treeItem.resetBubble();
    }

    TestRunner.addResult(prefix + treeItem.listItemElement.textContent);
    treeItem.expand();
    const children = treeItem.children();

    for (let i = 0; children && i < children.length; ++i) {
      dump(children[i], prefix + '    ');
    }
  }

  dump(Application.ResourcesPanel.ResourcesPanel.instance().sidebar.resourcesSection.treeElement, '');

  if (!testSourceNavigator) {
    testSourceNavigator = new Sources.SourcesNavigator.NetworkNavigatorView();
    testSourceNavigator.show(UI.InspectorView.InspectorView.instance().element);
  }

  SourcesTestRunner.dumpNavigatorViewInAllModes(testSourceNavigator);
};

export const dumpResourceTreeEverything = function() {
  function format(resource) {
    return resource.resourceType().name() + ' ' + resource.url;
  }

  TestRunner.addResult('Resources:');
  dumpResources(format);
  TestRunner.addResult('');
  TestRunner.addResult('Resources URL Map:');
  dumpResourcesURLMap();
  TestRunner.addResult('');
  TestRunner.addResult('Resources Tree:');
  dumpResourcesTree();
};
