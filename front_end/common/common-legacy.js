// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CommonModule from './common.js';

self.Common = self.Common || {};
Common = Common || {};

/**
 * @interface
 */
Common.App = CommonModule.App.App;

/**
 * @interface
 */
Common.AppProvider = CommonModule.AppProvider.AppProvider;

/**
 * @constructor
 */
Common.CharacterIdMap = CommonModule.CharacterIdMap.CharacterIdMap;

/**
 * @constructor
 */
Common.Color = CommonModule.Color.Color;

Common.Color.Regex = CommonModule.Color.Regex;

/**
 * @enum {string}
 */
Common.Color.Format = CommonModule.Color.Format;
Common.Color.Nicknames = CommonModule.Color.Nicknames;
Common.Color.PageHighlight = CommonModule.Color.PageHighlight;

/**
 * @constructor
 */
Common.Color.Generator = CommonModule.Color.Generator;

Common.console = new CommonModule.Console.Console();

/**
 * @constructor
 */
Common.Console = CommonModule.Console.Console;

/** @enum {symbol} */
Common.Console.Events = CommonModule.Console.Events;

/**
 * @enum {string}
 */
Common.Console.MessageLevel = CommonModule.Console.MessageLevel;

/**
 * @constructor
 */
Common.Console.Message = CommonModule.Console.Message;

/**
 * @interface
 */
Common.ContentProvider = CommonModule.ContentProvider.ContentProvider;

/**
 * @constructor
 */
Common.ContentProvider.SearchMatch = CommonModule.ContentProvider.SearchMatch;
Common.ContentProvider.performSearchInContent = CommonModule.ContentProvider.performSearchInContent;
Common.ContentProvider.contentAsDataURL = CommonModule.ContentProvider.contentAsDataURL;

/**
 * @interface
 */
Common.EventTarget = CommonModule.EventTarget.EventTarget;

/**
 * @interface
 */
Common.JavaScriptMetadata = CommonModule.JavaScriptMetaData.JavaScriptMetaData;

/**
 * @interface
 */
Common.Linkifier = CommonModule.Linkifier.Linkifier;

/**
 * @constructor
 */
Common.Object = CommonModule.ObjectWrapper.ObjectWrapper;

/**
 * @constructor
 */
Common.ParsedURL = CommonModule.ParsedURL.ParsedURL;

/**
 * @interface
 */
Common.Progress = CommonModule.Progress.Progress;

/**
 * @constructor
 */
Common.CompositeProgress = CommonModule.Progress.CompositeProgress;

/**
 * @constructor
 */
Common.ProgressProxy = CommonModule.Progress.ProgressProxy;

/**
 * @interface
 */
Common.QueryParamHandler = CommonModule.QueryParamHandler.QueryParamHandler;

/**
 * @enum {!ResourceType}
 */
Common.resourceTypes = CommonModule.ResourceType.resourceTypes;

/**
 * @enum {!ResourceCategory}
 */
Common.resourceCategories = CommonModule.ResourceType.resourceCategories;

/**
 * @constructor
 */
Common.ResourceType = CommonModule.ResourceType.ResourceType;

/**
 * @interface
 */
Common.Revealer = CommonModule.Revealer.Revealer;
Common.Revealer.reveal = CommonModule.Revealer.reveal;
Common.Revealer.revealDestination = CommonModule.Revealer.revealDestination;

/**
 * @interface
 */
Common.Runnable = CommonModule.Runnable.Runnable;

/**
 * @constructor
 */
Common.Segment = CommonModule.SegmentedRange.Segment;

/**
 * @constructor
 */
Common.SegmentedRange = CommonModule.SegmentedRange.SegmentedRange;

/**
 * @constructor
 */
Common.Settings = CommonModule.Settings.Settings;

/**
 * @constructor
 */
Common.SettingsStorage = CommonModule.Settings.SettingsStorage;

/**
 * @constructor
 */
Common.Setting = CommonModule.Settings.Setting;

Common.settingForTest = CommonModule.Settings.settingForTest;

/**
 * @constructor
 */
Common.VersionController = CommonModule.Settings.VersionController;
Common.moduleSetting = CommonModule.Settings.moduleSetting;

/**
 * @enum {symbol}
 */
Common.SettingStorageType = CommonModule.Settings.SettingStorageType;

/**
 * @constructor
 */
Common.StaticContentProvider = CommonModule.StaticContentProvider.StaticContentProvider;

/**
 * @interface
 */
Common.OutputStream = CommonModule.StringOutputStream.OutputStream;
Common.StringOutputStream = CommonModule.StringOutputStream.StringOutputStream;

Common.TextDictionary = CommonModule.TextDictionary.TextDictionary;

Common.Throttler = CommonModule.Throttler.Throttler;

Common.Trie = CommonModule.Trie.Trie;

/**
 * @constructor
 */
Common.UIStringFormat = CommonModule.UIString.UIStringFormat;

Common.UIString = CommonModule.UIString.UIString;
Common.serializeUIString = CommonModule.UIString.serializeUIString;
Common.deserializeUIString = CommonModule.UIString.deserializeUIString;
Common.localize = CommonModule.UIString.localize;

/**
 * @constructor
 */
Common.Worker = CommonModule.Worker.WorkerWrapper;

/**
 * @typedef {{
  *    content: string,
  *    isEncoded: boolean,
  * }|{
  *    error: string,
  *    isEncoded: boolean,
  * }}
  */
Common.DeferredContent;

/**
 * @typedef {!{eventTarget: !Common.EventTarget, eventType: (string|symbol), thisObject: (!Object|undefined), listener: function(!Common.Event)}}
 */
Common.EventTarget.EventDescriptor;

/**
 * @typedef {!{data: *}}
 */
Common.Event;

/** @typedef {{tooltip: (string|undefined), preventKeyboardFocus: (boolean|undefined)}} */
Common.Linkifier.Options;

/**
 * @typedef {!{thisObject: (!Object|undefined), listener: function(!Common.Event), disposed: (boolean|undefined)}}
 */
Common.Object._listenerCallbackTuple;

/**
 * @type {!Common.Settings}
 */
Common.settings;

/** @typedef {function(!Error=)} */
Common.Throttler.FinishCallback;

/**
 * @param {!Array<string>|string} strings
 * @param {...*} vararg
 * @return {string}
 */
self.ls = CommonModule.UIString.ls;
