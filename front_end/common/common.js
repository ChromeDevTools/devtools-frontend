// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../platform/platform.js';

import * as App from './App.js';
import * as AppProvider from './AppProvider.js';
import * as CharacterIdMap from './CharacterIdMap.js';
import * as Color from './Color.js';
import * as Console from './Console.js';
import * as EventTarget from './EventTarget.js';
import * as JavaScriptMetaData from './JavaScriptMetaData.js';
import * as Linkifier from './Linkifier.js';
import * as ObjectWrapper from './Object.js';
import * as ParsedURL from './ParsedURL.js';
import * as Progress from './Progress.js';
import * as QueryParamHandler from './QueryParamHandler.js';
import * as ResourceType from './ResourceType.js';
import * as Revealer from './Revealer.js';
import * as Runnable from './Runnable.js';
import * as SegmentedRange from './SegmentedRange.js';
import * as Settings from './Settings.js';
import * as StringOutputStream from './StringOutputStream.js';
import * as TextDictionary from './TextDictionary.js';
import * as Throttler from './Throttler.js';
import * as Trie from './Trie.js';
import * as UIString from './UIString.js';
import * as Worker from './Worker.js';

export const ls = UIString.ls;

/**
 * @type {!Settings.Settings}
 */
export let settings;

export {
  App,
  AppProvider,
  CharacterIdMap,
  Color,
  Console,
  EventTarget,
  JavaScriptMetaData,
  Linkifier,
  ObjectWrapper,
  ParsedURL,
  Progress,
  QueryParamHandler,
  ResourceType,
  Revealer,
  Runnable,
  SegmentedRange,
  Settings,
  StringOutputStream,
  TextDictionary,
  Throttler,
  Trie,
  UIString,
  Worker,
};
