// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * This file is automatically loaded and run by Karma because it automatically
 * loads and injects all *.js files it finds.
 */
import {resetTestDOM} from '../helpers/DOMHelpers.js';

beforeEach(resetTestDOM);

/*
 * The getStylesheet helper in components reads styles out of the runtime cache.
 * In a proper build this is populated but in test runs because we don't load
 * all of DevTools it's not. Therefore we fetch all the CSS files and populate
 * the cache before any tests are run.
 *
 * The out/Release/gen/front_end URL is prepended so within the Karma config we can proxy
 * them through to the right place, respecting Karma's ROOT_DIRECTORY setting.
 */
const CSS_RESOURCES_TO_LOAD_INTO_RUNTIME = [
  '/front_end/ui/checkboxTextLabel.css',
  '/front_end/ui/closeButton.css',
  '/front_end/ui/confirmDialog.css',
  '/front_end/ui/dialog.css',
  '/front_end/ui/dropTarget.css',
  '/front_end/ui/emptyWidget.css',
  '/front_end/ui/filter.css',
  '/front_end/ui/glassPane.css',
  '/front_end/ui/infobar.css',
  '/front_end/ui/inlineButton.css',
  '/front_end/ui/inspectorCommon.css',
  '/front_end/ui/inspectorStyle.css',
  '/front_end/ui/inspectorSyntaxHighlight.css',
  '/front_end/ui/inspectorSyntaxHighlightDark.css',
  '/front_end/ui/inspectorViewTabbedPane.css',
  '/front_end/ui/listWidget.css',
  '/front_end/ui/popover.css',
  '/front_end/ui/progressIndicator.css',
  '/front_end/ui/radioButton.css',
  '/front_end/ui/remoteDebuggingTerminatedScreen.css',
  '/front_end/ui/reportView.css',
  '/front_end/ui/rootView.css',
  '/front_end/ui/searchableView.css',
  '/front_end/ui/slider.css',
  '/front_end/ui/smallBubble.css',
  '/front_end/ui/segmentedButton.css',
  '/front_end/ui/softContextMenu.css',
  '/front_end/ui/softDropDown.css',
  '/front_end/ui/softDropDownButton.css',
  '/front_end/ui/splitWidget.css',
  '/front_end/ui/toolbar.css',
  '/front_end/ui/suggestBox.css',
  '/front_end/ui/tabbedPane.css',
  '/front_end/ui/targetCrashedScreen.css',
  '/front_end/ui/textButton.css',
  '/front_end/ui/textPrompt.css',
  '/front_end/ui/tooltip.css',
  '/front_end/ui/treeoutline.css',
  '/front_end/ui/viewContainers.css',
  '/front_end/components/imagePreview.css',
  '/front_end/components/jsUtils.css',
  '/front_end/persistence/editFileSystemView.css',
  '/front_end/persistence/workspaceSettingsTab.css',
  '/front_end/console_counters/errorWarningCounter.css',
  '/front_end/mobile_throttling/throttlingSettingsTab.css',
  '/front_end/emulation/deviceModeToolbar.css',
  '/front_end/emulation/deviceModeView.css',
  '/front_end/emulation/devicesSettingsTab.css',
  '/front_end/emulation/inspectedPagePlaceholder.css',
  '/front_end/emulation/locationsSettingsTab.css',
  '/front_end/emulation/mediaQueryInspector.css',
  '/front_end/emulation/sensors.css',
  '/front_end/inspector_main/nodeIcon.css',
  '/front_end/inspector_main/renderingOptions.css',
  '/front_end/data_grid/dataGrid.css',
  '/front_end/help/releaseNote.css',
  '/front_end/object_ui/customPreviewComponent.css',
  '/front_end/object_ui/objectPopover.css',
  '/front_end/object_ui/objectPropertiesSection.css',
  '/front_end/object_ui/objectValue.css',
  '/front_end/console/consoleContextSelector.css',
  '/front_end/console/consolePinPane.css',
  '/front_end/console/consolePrompt.css',
  '/front_end/console/consoleSidebar.css',
  '/front_end/console/consoleView.css',
  '/front_end/cm/codemirror.css',
  '/front_end/text_editor/autocompleteTooltip.css',
  '/front_end/text_editor/cmdevtools.css',
];

interface KarmaConfig {
  config: {targetDir: string}
}

before(async function() {
  /* This value comes from the `client.targetDir` setting in `karma.conf.js` */
  const {targetDir} = ((globalThis as unknown as {__karma__: KarmaConfig}).__karma__).config;

  /* Larger than normal timeout because we've seen some slowness on the bots */
  this.timeout(10000);

  self.Runtime = self.Runtime || {cachedResources: {}};
  const allPromises = CSS_RESOURCES_TO_LOAD_INTO_RUNTIME.map(resourcePath => {
    const pathWithKarmaPrefix = `/base/${targetDir}${resourcePath}`;
    return fetch(pathWithKarmaPrefix).then(response => response.text()).then(cssText => {
      self.Runtime.cachedResources[resourcePath.replace('/front_end/', '')] = cssText;
    });
  });
  return Promise.all(allPromises);
});

after(() => {
  // @ts-expect-error cachedResources is readonly but we want to nuke it after test runs.
  self.Runtime.cachedResources = {};
});
