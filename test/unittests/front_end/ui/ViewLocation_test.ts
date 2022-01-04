// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/legacy/legacy.js';
import type * as Platform from '../../../../front_end/core/platform/platform.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

describeWithEnvironment('ViewLocation', () => {
  let tabbedLocation: UI.View.TabbedViewLocation;
  let viewManager: UI.ViewManager.ViewManager;
  before(async () => {
    ['first', 'second', 'third', 'fourth'].forEach(title => {
      UI.ViewManager.registerViewExtension({
        // @ts-ignore
        location: 'mock-location',
        id: title,
        title: () => title as Platform.UIString.LocalizedString,
        commandPrompt: () => title as Platform.UIString.LocalizedString,
        persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
        async loadView() {
          return new UI.Widget.Widget();
        },
      });
    });
    viewManager = UI.ViewManager.ViewManager.instance({forceNew: true});
    tabbedLocation = viewManager.createTabbedLocation(undefined, 'mock-location', true, true);
  });

  it('Creates an empty tabbed location', () => {
    assert.deepEqual(tabbedLocation.tabbedPane().tabIds(), []);
  });

  it('Adds a tab for a selected view', () => {
    void viewManager.showView('first');
    void viewManager.showView('second');
    void viewManager.showView('third');

    assert.deepEqual(tabbedLocation.tabbedPane().tabIds(), ['first', 'second', 'third']);
  });

  it('Prepends a tab correctly', () => {
    const thirdTab = tabbedLocation.tabbedPane().tabsById.get('third');
    if (!thirdTab) {
      throw new Error('Could not find a tab');
    }
    tabbedLocation.tabbedPane().insertBefore(thirdTab, 0);
    assert.deepEqual(tabbedLocation.tabbedPane().tabIds(), ['third', 'first', 'second']);
  });

  it('Appends a tab correctly', () => {
    void viewManager.showView('fourth');
    assert.deepEqual(tabbedLocation.tabbedPane().tabIds(), ['third', 'first', 'second', 'fourth']);
  });

  it('Closes a tab correctly', () => {
    tabbedLocation.tabbedPane().closeTab('second');
    assert.deepEqual(tabbedLocation.tabbedPane().tabIds(), ['third', 'first', 'fourth']);
  });
});
