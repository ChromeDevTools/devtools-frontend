// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ConsoleModule from './console.js';

self.Console = self.Console || {};
Console = Console || {};

/**
 * @constructor
 */
Console.ConsoleContextSelector = ConsoleModule.ConsoleContextSelector.ConsoleContextSelector;

/**
 * @constructor
 */
Console.ConsoleFilter = ConsoleModule.ConsoleFilter.ConsoleFilter;

/** @enum {string} */
Console.ConsoleFilter.FilterType = ConsoleModule.ConsoleFilter.FilterType;

/**
 * @constructor
 */
Console.ConsolePanel = ConsoleModule.ConsolePanel.ConsolePanel;

/**
 * @constructor
 */
Console.ConsolePanel.WrapperView = ConsoleModule.ConsolePanel.WrapperView;

/**
 * @implements {Common.Revealer}
 */
Console.ConsolePanel.ConsoleRevealer = ConsoleModule.ConsolePanel.ConsoleRevealer;

/**
 * @constructor
 */
Console.ConsolePinPane = ConsoleModule.ConsolePinPane.ConsolePinPane;

/**
 * @constructor
 */
Console.ConsolePin = ConsoleModule.ConsolePinPane.ConsolePin;

/**
 * @constructor
 */
Console.ConsolePrompt = ConsoleModule.ConsolePrompt.ConsolePrompt;

Console.ConsolePrompt.Events = ConsoleModule.ConsolePrompt.Events;

/**
 * @constructor
 */
Console.ConsoleHistoryManager = ConsoleModule.ConsolePrompt.ConsoleHistoryManager;

/**
 * @constructor
 */
Console.ConsoleSidebar = ConsoleModule.ConsoleSidebar.ConsoleSidebar;

/** @enum {symbol} */
Console.ConsoleSidebar.Events = ConsoleModule.ConsoleSidebar.Events;

/**
 * @constructor
 */
Console.ConsoleSidebar.URLGroupTreeElement = ConsoleModule.ConsoleSidebar.URLGroupTreeElement;

/**
 * @constructor
 */
Console.ConsoleSidebar.FilterTreeElement = ConsoleModule.ConsoleSidebar.FilterTreeElement;

/**
 * @constructor
 */
Console.ConsoleView = ConsoleModule.ConsoleView.ConsoleView;

/** @constructor */
Console.ConsoleViewFilter = ConsoleModule.ConsoleView.ConsoleViewFilter;

/**
 * @implements {UI.ActionDelegate}
 */
Console.ConsoleView.ActionDelegate = ConsoleModule.ConsoleView.ActionDelegate;

/**
 * @constructor
 */
Console.ConsoleCommand = ConsoleModule.ConsoleView.ConsoleCommand;

/**
 * @constructor
 */
Console.ConsoleGroup = ConsoleModule.ConsoleView.ConsoleGroup;

/**
 * @implements {Console.ConsoleViewportElement}
 * @unrestricted
 * @constructor
 */
Console.ConsoleViewMessage = ConsoleModule.ConsoleViewMessage.ConsoleViewMessage;

/**
 * @constructor
 */
Console.ConsoleGroupViewMessage = ConsoleModule.ConsoleViewMessage.ConsoleGroupViewMessage;

/**
 * @const
 * @type {number}
 */
Console.ConsoleViewMessage.MaxLengthForLinks = ConsoleModule.ConsoleViewMessage.MaxLengthForLinks;
/** @suppress {accessControls} */
Console.ConsoleViewMessage._MaxTokenizableStringLength = ConsoleModule.ConsoleViewMessage._MaxTokenizableStringLength;
/** @suppress {accessControls} */
Console.ConsoleViewMessage._LongStringVisibleLength = ConsoleModule.ConsoleViewMessage._LongStringVisibleLength;

/**
 * @constructor
 */
Console.ConsoleViewport = ConsoleModule.ConsoleViewport.ConsoleViewport;

/**
 * @interface
 */
Console.ConsoleViewportProvider = ConsoleModule.ConsoleViewport.ConsoleViewportProvider;

/**
 * @interface
 */
Console.ConsoleViewportElement = ConsoleModule.ConsoleViewport.ConsoleViewportElement;

/**
 * @typedef {{messageIndex: number, matchIndex: number}}
 */
Console.ConsoleView.RegexMatchRange;
