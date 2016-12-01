// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Shell.TestShell = class {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    runOnWindowLoad(this.initializeUnitTest.bind(this));
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  initializeUnitTest() {
    var globalStorage = new Common.SettingsStorage(
        {}, InspectorFrontendHost.setPreference, InspectorFrontendHost.removePreference,
        InspectorFrontendHost.clearPreferences);
    var storagePrefix = '';
    var localStorage = new Common.SettingsStorage({}, undefined, undefined, undefined, storagePrefix);
    Common.settings = new Common.Settings(globalStorage, localStorage);

    UI.viewManager = new UI.ViewManager();
    UI.initializeUIUtils(document, Common.settings.createSetting('uiTheme', 'default'));
    UI.installComponentRootStyles(/** @type {!Element} */ (document.body));

    UI.zoomManager = new UI.ZoomManager(self, InspectorFrontendHost);
    UI.inspectorView = UI.InspectorView.instance();
    UI.ContextMenu.initialize();
    UI.ContextMenu.installHandler(document);
    UI.Tooltip.installHandler(document);

    var rootView = new UI.RootView();
    UI.inspectorView.show(rootView.element);
    rootView.attachToDocument(document);
    TestRunner.executeTestScript();
  }
};

new Shell.TestShell();
