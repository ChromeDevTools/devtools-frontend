// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDKModule from './sdk.js';

self.SDK = self.SDK || {};
SDK = SDK || {};

/** @constructor */
SDK.CPUProfileDataModel = SDKModule.CPUProfileDataModel.CPUProfileDataModel;

/** @constructor */
SDK.CPUProfilerModel = SDKModule.CPUProfilerModel.CPUProfilerModel;

SDK.cssMetadata = SDKModule.CSSMetadata.cssMetadata;

/** @constructor */
SDK.CSSModel = SDKModule.CSSModel.CSSModel;

/** @enum {symbol} */
SDK.CSSModel.Events = SDKModule.CSSModel.Events;

/** @constructor */
SDK.CSSLocation = SDKModule.CSSModel.CSSLocation;

/** @constructor */
SDK.CSSProperty = SDKModule.CSSProperty.CSSProperty;

/** @constructor */
SDK.CSSStyleDeclaration = SDKModule.CSSStyleDeclaration.CSSStyleDeclaration;

/** @enum {string} */
SDK.CSSStyleDeclaration.Type = SDKModule.CSSStyleDeclaration.Type;

/** @constructor */
SDK.MainConnection = SDKModule.Connections.MainConnection;

/** @constructor */
SDK.ConsoleModel = SDKModule.ConsoleModel.ConsoleModel;

/** @constructor */
SDK.ConsoleMessage = SDKModule.ConsoleModel.ConsoleMessage;

/** @enum {symbol} */
SDK.ConsoleModel.Events = SDKModule.ConsoleModel.Events;

/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageSource = SDKModule.ConsoleModel.MessageSource;

/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageType = SDKModule.ConsoleModel.MessageType;

/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageLevel = SDKModule.ConsoleModel.MessageLevel;

/** @constructor */
SDK.Cookie = SDKModule.Cookie.Cookie;

/** @constructor */
SDK.CookieReference = SDKModule.Cookie.CookieReference;

/** @constructor */
SDK.CookieParser = SDKModule.CookieParser.CookieParser;

/** @constructor */
SDK.DOMDebuggerModel = SDKModule.DOMDebuggerModel.DOMDebuggerModel;

/** @constructor */
SDK.DOMModel = SDKModule.DOMModel.DOMModel;

/** @enum {symbol} */
SDK.DOMModel.Events = SDKModule.DOMModel.Events;

/** @constructor */
SDK.DeferredDOMNode = SDKModule.DOMModel.DeferredDOMNode;

/** @constructor */
SDK.DOMDocument = SDKModule.DOMModel.DOMDocument;

/** @constructor */
SDK.DOMNode = SDKModule.DOMModel.DOMNode;

/** @constructor */
SDK.DebuggerModel = SDKModule.DebuggerModel.DebuggerModel;

/** @enum {string} */
SDK.DebuggerModel.PauseOnExceptionsState = SDKModule.DebuggerModel.PauseOnExceptionsState;

/** @enum {symbol} */
SDK.DebuggerModel.Events = SDKModule.DebuggerModel.Events;

/** @enum {string} */
SDK.DebuggerModel.BreakReason = SDKModule.DebuggerModel.BreakReason;

/** @constructor */
SDK.DebuggerModel.Location = SDKModule.DebuggerModel.Location;

/** @constructor */
SDK.DebuggerModel.CallFrame = SDKModule.DebuggerModel.CallFrame;

/** @constructor */
SDK.DebuggerPausedDetails = SDKModule.DebuggerModel.DebuggerPausedDetails;

/** @constructor */
SDK.HARLog = SDKModule.HARLog.HARLog;

/** @constructor */
SDK.HARLog.Entry = SDKModule.HARLog.Entry;

/** @constructor */
SDK.HeapProfilerModel = SDKModule.HeapProfilerModel.HeapProfilerModel;

/** @constructor */
SDK.IsolateManager = SDKModule.IsolateManager.IsolateManager;

/** @constructor */
SDK.IsolateManager.MemoryTrend = SDKModule.IsolateManager.MemoryTrend;

/** @constructor */
SDK.Issue = SDKModule.Issue.Issue;

/** @constructor */
SDK.NetworkLog = SDKModule.NetworkLog.NetworkLog;

SDK.NetworkLog.Events = SDKModule.NetworkLog.Events;

/** @constructor */
SDK.NetworkManager = SDKModule.NetworkManager.NetworkManager;

/** @enum {symbol} */
SDK.NetworkManager.Events = SDKModule.NetworkManager.Events;

/** @type {!SDKModule.NetworkManager.Conditions} */
SDK.NetworkManager.OfflineConditions = SDKModule.NetworkManager.OfflineConditions;

/** @type {!SDKModule.NetworkManager.Conditions} */
SDK.NetworkManager.Fast3GConditions = SDKModule.NetworkManager.Fast3GConditions;

/** @constructor */
SDK.NetworkDispatcher = SDKModule.NetworkManager.NetworkDispatcher;

/** @constructor */
SDK.MultitargetNetworkManager = SDKModule.NetworkManager.MultitargetNetworkManager;

/** @constructor */
SDK.MultitargetNetworkManager.InterceptedRequest = SDKModule.NetworkManager.InterceptedRequest;

/** @constructor */
SDK.NetworkRequest = SDKModule.NetworkRequest.NetworkRequest;

/** @enum {symbol} */
SDK.NetworkRequest.Events = SDKModule.NetworkRequest.Events;

/** @enum {string} */
SDK.NetworkRequest.WebSocketFrameType = SDKModule.NetworkRequest.WebSocketFrameType;

/** @constructor */
SDK.OverlayModel = SDKModule.OverlayModel.OverlayModel;

/** @constructor */
SDK.PerformanceMetricsModel = SDKModule.PerformanceMetricsModel.PerformanceMetricsModel;

/** @constructor */
SDK.ProfileTreeModel = SDKModule.ProfileTreeModel.ProfileTreeModel;

/** @constructor */
SDK.RemoteObject = SDKModule.RemoteObject.RemoteObject;

/** @constructor */
SDK.Resource = SDKModule.Resource.Resource;

/** @constructor */
SDK.ResourceTreeModel = SDKModule.ResourceTreeModel.ResourceTreeModel;

/** @enum {symbol} */
SDK.ResourceTreeModel.Events = SDKModule.ResourceTreeModel.Events;

/** @constructor */
SDK.ResourceTreeFrame = SDKModule.ResourceTreeModel.ResourceTreeFrame;

/** @constructor */
SDK.RuntimeModel = SDKModule.RuntimeModel.RuntimeModel;

/** @enum {symbol} */
SDK.RuntimeModel.Events = SDKModule.RuntimeModel.Events;

/** @constructor */
SDK.ExecutionContext = SDKModule.RuntimeModel.ExecutionContext;

/** @constructor */
SDK.Script = SDKModule.Script.Script;

/** @constructor */
SDK.SecurityOriginManager = SDKModule.SecurityOriginManager.SecurityOriginManager;

/** @enum {symbol} */
SDK.SecurityOriginManager.Events = SDKModule.SecurityOriginManager.Events;

/** @constructor */
SDK.ServiceWorkerCacheModel = SDKModule.ServiceWorkerCacheModel.ServiceWorkerCacheModel;

/** @constructor */
SDK.ServiceWorkerManager = SDKModule.ServiceWorkerManager.ServiceWorkerManager;

/** @interface */
SDK.SourceMap = SDKModule.SourceMap.SourceMap;

/** @constructor */
SDK.TextSourceMap = SDKModule.SourceMap.TextSourceMap;

/** @constructor */
SDK.SourceMapManager = SDKModule.SourceMapManager.SourceMapManager;

SDK.SourceMapManager.Events = SDKModule.SourceMapManager.Events;

/** @constructor */
SDK.Target = SDKModule.SDKModel.Target;

/**
 * @enum {string}
 */
SDK.Target.Type = SDKModule.SDKModel.Type;

/** @constructor */
SDK.TargetManager = SDKModule.SDKModel.TargetManager;

/** @enum {symbol} */
SDK.TargetManager.Events = SDKModule.SDKModel.Events;

/** @interface */
SDK.TargetManager.Observer = SDKModule.SDKModel.Observer;

/** @constructor */
SDK.TracingManager = SDKModule.TracingManager.TracingManager;

/** @constructor */
SDK.TracingModel = SDKModule.TracingModel.TracingModel;

SDK.TracingModel.Phase = SDKModule.TracingModel.Phase;
SDK.TracingModel.LegacyTopLevelEventCategory = SDKModule.TracingModel.LegacyTopLevelEventCategory;
SDK.TracingModel.DevToolsMetadataEventCategory = SDKModule.TracingModel.DevToolsMetadataEventCategory;

/** @constructor */
SDK.TracingModel.Event = SDKModule.TracingModel.Event;

self.SDK.targetManager = SDKModule.SDKModel.TargetManager.instance();
self.SDK.isolateManager = new SDKModule.IsolateManager.IsolateManager();
self.SDK.domModelUndoStack = new SDKModule.DOMModel.DOMModelUndoStack();
self.SDK.networkLog = new SDKModule.NetworkLog.NetworkLog();
