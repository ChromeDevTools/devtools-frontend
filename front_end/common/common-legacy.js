// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../platform/platform.js';

import * as AppModule from './App.js';
import * as AppProviderModule from './AppProvider.js';
import * as CharacterIdMapModule from './CharacterIdMap.js';
import * as ColorModule from './Color.js';
import * as ConsoleModule from './Console.js';
import * as ContentProviderModule from './ContentProvider.js';
import * as EventTargetModule from './EventTarget.js';
import * as JavaScriptMetaDataModule from './JavaScriptMetaData.js';
import * as LinkifierModule from './Linkifier.js';
import * as ObjectModule from './Object.js';
import * as ParsedURLModule from './ParsedURL.js';
import * as ProgressModule from './Progress.js';
import * as QueryParamHandlerModule from './QueryParamHandler.js';
import * as ResourceTypeModule from './ResourceType.js';
import * as RevealerModule from './Revealer.js';
import * as RunnableModule from './Runnable.js';
import * as SegmentedRangeModule from './SegmentedRange.js';
import * as SettingsModule from './Settings.js';
import * as StaticContentProviderModule from './StaticContentProvider.js';
import * as StringOutputStreamModule from './StringOutputStream.js';
import * as TextDictionaryModule from './TextDictionary.js';
import * as ThrottlerModule from './Throttler.js';
import * as TrieModule from './Trie.js';
import * as UIStringModule from './UIString.js';
import * as WorkerModule from './Worker.js';

const App = Object.assign(AppModule.App, AppModule);
const AppProvider = Object.assign(AppProviderModule.AppProvider, AppProviderModule);
const CharacterIdMap = Object.assign(CharacterIdMapModule.CharacterIdMap, CharacterIdMapModule);
const Color = Object.assign(ColorModule.Color, ColorModule);
const Console = Object.assign(ConsoleModule.Console, ConsoleModule);
const ContentProvider = Object.assign(ContentProviderModule.ContentProvider, ContentProviderModule);
const EventTarget = Object.assign(EventTargetModule.EventTarget, EventTargetModule);
const JavaScriptMetaData = Object.assign(JavaScriptMetaDataModule.JavaScriptMetaData, JavaScriptMetaDataModule);
const Linkifier = Object.assign(LinkifierModule.Linkifier, LinkifierModule);
const ObjectWrapper = Object.assign(ObjectModule.ObjectWrapper, ObjectModule);
const ParsedURL = Object.assign(ParsedURLModule.ParsedURL, ParsedURLModule);
const Progress = Object.assign(ProgressModule.Progress, ProgressModule);
const QueryParamHandler = Object.assign(QueryParamHandlerModule.QueryParamHandler, QueryParamHandlerModule);
const ResourceType = Object.assign(ResourceTypeModule.ResourceType, ResourceTypeModule);
const Revealer = Object.assign(RevealerModule.Revealer, RevealerModule);
const Runnable = Object.assign(RunnableModule.Runnable, RunnableModule);
const SegmentedRange = Object.assign(SegmentedRangeModule.SegmentedRange, SegmentedRangeModule);
const Settings = Object.assign(SettingsModule.Settings, SettingsModule);
const StaticContentProvider =
    Object.assign(StaticContentProviderModule.StaticContentProvider, StaticContentProviderModule);
const StringOutputStream = Object.assign(StringOutputStreamModule.StringOutputStream, StringOutputStreamModule);
const TextDictionary = Object.assign(TextDictionaryModule.TextDictionary, TextDictionaryModule);
const Throttler = Object.assign(ThrottlerModule.Throttler, ThrottlerModule);
const Trie = Object.assign(TrieModule.Trie, TrieModule);
const UIString = Object.assign(UIStringModule.UIString, UIStringModule);
const Worker = Object.assign(WorkerModule.WorkerWrapper, WorkerModule);

export {
  App,
  AppProvider,
  CharacterIdMap,
  Color,
  Console,
  ContentProvider,
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
  StaticContentProvider,
  StringOutputStream,
  TextDictionary,
  Throttler,
  Trie,
  UIString,
  Worker,
};
