// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as QuickOpenModule from './quick_open.js';

self.QuickOpen = self.QuickOpen || {};
QuickOpen = QuickOpen || {};

/**
 * @constructor
 */
QuickOpen.CommandMenu = QuickOpenModule.CommandMenu.CommandMenu;

/**
 * @constructor
 */
QuickOpen.CommandMenu.Command = QuickOpenModule.CommandMenu.Command;

/**
 * @constructor
 */
QuickOpen.CommandMenu.ShowActionDelegate = QuickOpenModule.CommandMenu.ShowActionDelegate;

/**
 * @constructor
 */
QuickOpen.CommandMenuProvider = QuickOpenModule.CommandMenu.CommandMenuProvider;
QuickOpen.CommandMenuProvider.MaterialPaletteColors = QuickOpenModule.CommandMenu.MaterialPaletteColors;

QuickOpen.commandMenu = QuickOpenModule.CommandMenu.commandMenu;

/**
 * @constructor
 */
QuickOpen.FilteredListWidget = QuickOpenModule.FilteredListWidget.FilteredListWidget;

/**
 * @constructor
 */
QuickOpen.FilteredListWidget.Provider = QuickOpenModule.FilteredListWidget.Provider;

/**
 * @constructor
 */
QuickOpen.HelpQuickOpen = QuickOpenModule.HelpQuickOpen.HelpQuickOpen;

/**
 * @constructor
 */
QuickOpen.QuickOpen = QuickOpenModule.QuickOpen.QuickOpenImpl;

QuickOpen.QuickOpen._history = QuickOpenModule.QuickOpen.history;

/**
 * @constructor
 */
QuickOpen.QuickOpen.ShowActionDelegate = QuickOpenModule.QuickOpen.ShowActionDelegate;
