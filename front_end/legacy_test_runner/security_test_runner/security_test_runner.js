// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Security from '../../panels/security/security.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */
export const SecurityTestRunner = {};

SecurityTestRunner.dumpSecurityPanelSidebarOrigins = function() {
  const sidebar = Security.SecurityPanel.SecurityPanel.instance().sidebar;
  sidebar.performUpdate();
  const tree = sidebar.contentElement.querySelector('devtools-tree');
  if (!tree) {
    return;
  }
  // @ts-ignore
  const root = tree.templateRoot || tree.shadowRoot || tree;
  const groups = root.querySelectorAll('.security-sidebar-origins');
  for (const group of groups) {
    if (group.hasAttribute('hidden') || group.classList.contains('hidden')) {
      continue;
    }
    const titleElement =
        group.querySelector('.security-sidebar-origins-title') || group.querySelector('.tree-element-title');
    const title = titleElement ? titleElement.textContent.trim() : group.textContent.trim();
    TestRunner.addResult('Group: ' + title);
    const originContainer = group.querySelector('ul[role="group"]') || group.nextElementSibling;
    if (!originContainer) {
      continue;
    }
    const originItems = originContainer.querySelectorAll('.security-sidebar-tree-item');
    for (const originItem of originItems) {
      const spans = originItem.getElementsByTagName('span');
      for (const span of spans) {
        if (!span.classList.contains('tree-element-title')) {
          TestRunner.dumpDeepInnerHTML(span);
        }
      }
    }
  }
};

/**
 * @param {SDK.NetworkRequest.NetworkRequest} request
 */
SecurityTestRunner.dispatchRequestFinished = function(request) {
  // @ts-ignore
  TestRunner.networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
};
