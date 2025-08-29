// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * This file is automatically loaded and run by Karma because it automatically
 * loads and injects all *.js files it finds.
 */

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Root from '../core/root/root.js';
import * as Trace from '../models/trace/trace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as UI from '../ui/legacy/legacy.js';
import * as ThemeSupport from '../ui/legacy/theme_support/theme_support.js';

import {cleanTestDOM, raf, setupTestDOM} from './DOMHelpers.js';
import {createFakeSetting, resetHostConfig} from './EnvironmentHelpers.js';
import {
  checkForPendingActivity,
  startTrackingAsyncActivity,
  stopTrackingAsyncActivity,
} from './TrackAsyncOperations.js';

const style = document.createElement('style');
style.innerText =
    '@import url(\'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap\');';
document.head.append(style);
document.documentElement.classList.add('platform-screenshot-test');

const documentBodyElements = new Set<Element>();

// Warm-up fonts to be readily available.
before(async () => {
  const div = document.createElement('div');
  div.style.fontFamily = 'roboto';
  // Some latin characters to trigger the latin font file to be loaded.
  // Additional non-lating characters can be included if needed.
  div.innerText = 'abc';
  // eslint-disable-next-line rulesdir/no-document-body-mutation
  document.body.append(div);
  await document.fonts.ready;
  div.remove();
});

beforeEach(async () => {
  resetHostConfig();
  for (const child of document.body.children) {
    documentBodyElements.add(child);
  }
  await setupTestDOM();

  // Ensure that no trace data leaks between tests when testing the trace engine.
  for (const handler of Object.values(Trace.Handlers.ModelHandlers)) {
    handler.reset();
  }
  Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
  Timeline.Utils.SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();

  // Don't retain host binding listeners across tests. Set this up before initializing ThemeSupport as
  // ThemeSupport adds a host binding listener.
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();

  // Some unit tests exercise code that assumes a ThemeSupport instance is available.
  // Run this in a beforeEach in case an individual test overrides it.
  const setting = createFakeSetting('theme', 'default');
  ThemeSupport.ThemeSupport.instance({forceNew: true, setting});

  startTrackingAsyncActivity();
});

/**
 * If a widget creates a glass pane, it can get orphaned and not cleaned up correctly.
 */
function removeGlassPanes() {
  for (const pane of document.body.querySelectorAll('[data-devtools-glass-pane]')) {
    document.body.removeChild(pane);
  }
}
/**
 * If a text editor is created we create a special parent for the tooltip
 * This does not get cleared after render, but it's internals do.
 * So we need to manually remove it
 */
function removeTextEditorTooltip() {
  // Found in front_end/ui/components/text_editor/config.ts
  for (const pane of document.body.querySelectorAll('.editor-tooltip-host')) {
    document.body.removeChild(pane);
  }
}

afterEach(async function() {
  cleanTestDOM();
  removeGlassPanes();
  removeTextEditorTooltip();
  UI.ARIAUtils.LiveAnnouncer.removeAnnouncerElements(document.body);
  // Make sure all DOM clean up happens before the raf
  await raf();

  for (const child of document.body.children) {
    if (!documentBodyElements.has(child)) {
      console.error(`Test "${this.currentTest?.fullTitle()}" left DOM in document.body:`);
      console.error(child);
    }
  }
  for (const key of Object.keys(Root.Runtime.hostConfig)) {
    // @ts-expect-error
    delete Root.Runtime.hostConfig[key];
  }

  await checkForPendingActivity();
  resetHostConfig();
  sinon.restore();
  stopTrackingAsyncActivity();
  // Clear out any Sinon stubs or spies between individual tests.
});
