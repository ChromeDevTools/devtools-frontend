// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';

const sheetsCache = new Map<string, {sheets: CSSStyleSheet[]}>();

/**
 * Helper for importing a legacy stylesheet into a component.
 *
 * Given a path to a stylesheet, it returns a CSSStyleSheet that can then be
 * adopted by your component.
 */
export function legacyGetStyleSheets(path: string): CSSStyleSheet[] {
  const cachedResult = sheetsCache.get(path);
  if (cachedResult) {
    return cachedResult.sheets;
  }

  const content = Root.Runtime.cachedResources.get(path) || '';
  if (!content) {
    throw new Error(`${path} not preloaded.`);
  }
  const originalStylesheet = new CSSStyleSheet();
  originalStylesheet.replaceSync(content);
  sheetsCache.set(path, {sheets: [originalStylesheet]});
  return [originalStylesheet];
}

/*
 * This is now legacy. Please do not add any more CSS Files to this list. Refer to
 * https://crbug.com/1106746 for the new way of implementing CSS in DevTools.
 *
 * The legacyGetStylesheet helper in components reads styles out of the runtime cache.
 * In a proper build this is populated but in test runs because we don't load
 * all of DevTools it's not. Therefore we fetch the required CSS files and populate
 * the cache before any tests are run.
 *
 * The out/Release/gen/front_end URL is prepended so within the Karma config we can proxy
 * them through to the right place, respecting Karma's ROOT_DIRECTORY setting.
 */
export const CSS_RESOURCES_TO_LOAD_INTO_RUNTIME = [
  'ui/legacy/inspectorCommon.css',
  'ui/legacy/textButton.css',
  'ui/legacy/themeColors.css',
  'ui/legacy/inspectorSyntaxHighlight.css',
  'ui/legacy/progressIndicator.css',
  'panels/application/serviceWorkerUpdateCycleView.css',
  'ui/legacy/tabbedPane.css',
  'ui/legacy/components/inline_editor/colorSwatch.css',
  'ui/legacy/glassPane.css',
  'ui/legacy/suggestBox.css',
  'ui/legacy/treeoutline.css',
  'ui/legacy/softContextMenu.css',
  'ui/legacy/splitWidget.css',
  'ui/legacy/components/source_frame/jsonView.css',
  'ui/legacy/searchableView.css',
  'ui/legacy/toolbar.css',
];
