// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

SecurityTestRunner.dumpSecurityPanelSidebarOrigins = function() {
  for (var key in Security.SecurityPanelSidebarTree.OriginGroupName) {
    var originGroupName = Security.SecurityPanelSidebarTree.OriginGroupName[key];
    var originGroup = Security.SecurityPanel._instance()._sidebarTree._originGroups.get(originGroupName);

    if (originGroup.hidden)
      continue;

    TestRunner.addResult('Group: ' + originGroupName);
    var originTitles = originGroup.childrenListElement.getElementsByClassName('title');

    for (var originTitle of originTitles)
      TestRunner.dumpDeepInnerHTML(originTitle);
  }
};

SecurityTestRunner.dispatchRequestFinished = function(request) {
  TestRunner.networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
};
