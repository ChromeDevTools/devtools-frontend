// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDKModule from './sdk.js';

self.SDK = self.SDK || {};
SDK = SDK || {};

/** @constructor */
SDK.CPUProfileDataModel = SDKModule.CPUProfileDataModel.CPUProfileDataModel;

/** @constructor */
SDK.CPUProfileNode = SDKModule.CPUProfileDataModel.CPUProfileNode;

/** @constructor */
SDK.CPUProfilerModel = SDKModule.CPUProfilerModel.CPUProfilerModel;

/** @enum {symbol} */
SDK.CPUProfilerModel.Events = SDKModule.CPUProfilerModel.Events;

/** @constructor */
SDK.CSSMatchedStyles = SDKModule.CSSMatchedStyles.CSSMatchedStyles;

/** @enum {string} */
SDK.CSSMatchedStyles.PropertyState = SDKModule.CSSMatchedStyles.PropertyState;

/** @constructor */
SDK.CSSMediaQuery = SDKModule.CSSMedia.CSSMediaQuery;

/** @constructor */
SDK.CSSMediaQueryExpression = SDKModule.CSSMedia.CSSMediaQueryExpression;

/** @constructor */
SDK.CSSMedia = SDKModule.CSSMedia.CSSMedia;

SDK.CSSMedia.Source = SDKModule.CSSMedia.Source;

/** @constructor */
SDK.CSSMetadata = SDKModule.CSSMetadata.CSSMetadata;

SDK.CSSMetadata.VariableRegex = SDKModule.CSSMetadata.VariableRegex;
SDK.CSSMetadata.URLRegex = SDKModule.CSSMetadata.URLRegex;
SDK.CSSMetadata.GridAreaRowRegex = SDKModule.CSSMetadata.GridAreaRowRegex;

SDK.cssMetadata = SDKModule.CSSMetadata.cssMetadata;

/** @constructor */
SDK.CSSModel = SDKModule.CSSModel.CSSModel;

/** @enum {symbol} */
SDK.CSSModel.Events = SDKModule.CSSModel.Events;

/** @constructor */
SDK.CSSModel.Edit = SDKModule.CSSModel.Edit;

/** @constructor */
SDK.CSSModel.InlineStyleResult = SDKModule.CSSModel.InlineStyleResult;

/** @constructor */
SDK.CSSLocation = SDKModule.CSSModel.CSSLocation;

/** @constructor */
SDK.CSSProperty = SDKModule.CSSProperty.CSSProperty;

/** @constructor */
SDK.CSSRule = SDKModule.CSSRule.CSSRule;

/** @constructor */
SDK.CSSStyleRule = SDKModule.CSSRule.CSSStyleRule;

/** @constructor */
SDK.CSSKeyframesRule = SDKModule.CSSRule.CSSKeyframesRule;

/** @constructor */
SDK.CSSKeyframeRule = SDKModule.CSSRule.CSSKeyframeRule;

/** @constructor */
SDK.CSSStyleDeclaration = SDKModule.CSSStyleDeclaration.CSSStyleDeclaration;

/** @enum {string} */
SDK.CSSStyleDeclaration.Type = SDKModule.CSSStyleDeclaration.Type;

/** @constructor */
SDK.CSSStyleSheetHeader = SDKModule.CSSStyleSheetHeader.CSSStyleSheetHeader;

/** @constructor */
SDK.ChildTargetManager = SDKModule.ChildTargetManager.ChildTargetManager;

/** @constructor */
SDK.CompilerSourceMappingContentProvider =
    SDKModule.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider;

/** @constructor */
SDK.MainConnection = SDKModule.Connections.MainConnection;

/** @constructor */
SDK.WebSocketConnection = SDKModule.Connections.WebSocketConnection;

/** @constructor */
SDK.StubConnection = SDKModule.Connections.StubConnection;

/** @constructor */
SDK.ParallelConnection = SDKModule.Connections.ParallelConnection;

SDK.initMainConnection = SDKModule.Connections.initMainConnection;

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

SDK.ConsoleMessage.MessageSourceDisplayName = SDKModule.ConsoleModel.MessageSourceDisplayName;

/** @constructor */
SDK.Cookie = SDKModule.Cookie.Cookie;

/**
 * @enum {number}
 */
SDK.Cookie.Type = SDKModule.Cookie.Type;

/**
 * @enum {string}
 */
SDK.Cookie.Attributes = SDKModule.Cookie.Attributes;

/** @constructor */
SDK.CookieModel = SDKModule.CookieModel.CookieModel;

/** @constructor */
SDK.CookieParser = SDKModule.CookieParser.CookieParser;

/** @constructor */
SDK.DOMDebuggerModel = SDKModule.DOMDebuggerModel.DOMDebuggerModel;

/** @enum {symbol} */
SDK.DOMDebuggerModel.Events = SDKModule.DOMDebuggerModel.Events;

/** @constructor */
SDK.DOMDebuggerModel.DOMBreakpoint = SDKModule.DOMDebuggerModel.DOMBreakpoint;

/** @constructor */
SDK.DOMDebuggerModel.EventListenerBreakpoint = SDKModule.DOMDebuggerModel.EventListenerBreakpoint;

/** @constructor */
SDK.EventListener = SDKModule.DOMDebuggerModel.EventListener;

/** @constructor */
SDK.DOMDebuggerManager = SDKModule.DOMDebuggerModel.DOMDebuggerManager;

/** @constructor */
SDK.DOMModel = SDKModule.DOMModel.DOMModel;

/** @enum {symbol} */
SDK.DOMModel.Events = SDKModule.DOMModel.Events;

/** @constructor */
SDK.DeferredDOMNode = SDKModule.DOMModel.DeferredDOMNode;

/** @constructor */
SDK.DOMNodeShortcut = SDKModule.DOMModel.DOMNodeShortcut;

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
SDK.DebuggerModel.BreakLocation = SDKModule.DebuggerModel.BreakLocation;

/** @constructor */
SDK.DebuggerModel.CallFrame = SDKModule.DebuggerModel.CallFrame;

/** @constructor */
SDK.DebuggerModel.Scope = SDKModule.DebuggerModel.Scope;

/** @constructor */
SDK.DebuggerPausedDetails = SDKModule.DebuggerModel.DebuggerPausedDetails;

/** @constructor */
SDK.EmulationModel = SDKModule.EmulationModel.EmulationModel;

/** @constructor */
SDK.EmulationModel.Geolocation = SDKModule.EmulationModel.Geolocation;

/** @constructor */
SDK.EmulationModel.DeviceOrientation = SDKModule.EmulationModel.DeviceOrientation;

/** @constructor */
SDK.FilmStripModel = SDKModule.FilmStripModel.FilmStripModel;

/** @constructor */
SDK.FilmStripModel.Frame = SDKModule.FilmStripModel.Frame;

/** @constructor */
SDK.HARLog = SDKModule.HARLog.HARLog;

/** @constructor */
SDK.HARLog.Entry = SDKModule.HARLog.Entry;

/** @constructor */
SDK.HeapProfilerModel = SDKModule.HeapProfilerModel.HeapProfilerModel;

/** @enum {symbol} */
SDK.HeapProfilerModel.Events = SDKModule.HeapProfilerModel.Events;

/** @constructor */
SDK.IsolateManager = SDKModule.IsolateManager.IsolateManager;

/** @interface */
SDK.IsolateManager.Observer = SDKModule.IsolateManager.Observer;

/** @enum {symbol} */
SDK.IsolateManager.Events = SDKModule.IsolateManager.Events;

SDK.IsolateManager.MemoryTrendWindowMs = SDKModule.IsolateManager.MemoryTrendWindowMs;

/** @constructor */
SDK.IsolateManager.Isolate = SDKModule.IsolateManager.Isolate;

/** @constructor */
SDK.IsolateManager.MemoryTrend = SDKModule.IsolateManager.MemoryTrend;

/** @constructor */
SDK.IssuesModel = SDKModule.IssuesModel.IssuesModel;

/** @constructor */
SDK.Issue = SDKModule.Issue.Issue;

/** @interface */
SDK.Layer = SDKModule.LayerTreeBase.Layer;

/** @constructor */
SDK.LayerTreeBase = SDKModule.LayerTreeBase.LayerTreeBase;

/** @constructor */
SDK.Layer.StickyPositionConstraint = SDKModule.LayerTreeBase.StickyPositionConstraint;

/** @constructor */
SDK.LogModel = SDKModule.LogModel.LogModel;

/** @enum {symbol} */
SDK.LogModel.Events = SDKModule.LogModel.Events;

/** @constructor */
SDK.NetworkLog = SDKModule.NetworkLog.NetworkLog;

/** @constructor */
SDK.NetworkLog.PageLoad = SDKModule.NetworkLog.PageLoad;

SDK.NetworkLog.Events = SDKModule.NetworkLog.Events;

/** @constructor */
SDK.NetworkManager = SDKModule.NetworkManager.NetworkManager;

/** @enum {symbol} */
SDK.NetworkManager.Events = SDKModule.NetworkManager.Events;

/** @type {!SDKModule.NetworkManager.Conditions} */
SDK.NetworkManager.NoThrottlingConditions = SDKModule.NetworkManager.NoThrottlingConditions;

/** @type {!SDKModule.NetworkManager.Conditions} */
SDK.NetworkManager.OfflineConditions = SDKModule.NetworkManager.OfflineConditions;

/** @type {!SDKModule.NetworkManager.Conditions} */
SDK.NetworkManager.Slow3GConditions = SDKModule.NetworkManager.Slow3GConditions;

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
SDK.NetworkRequest.InitiatorType = SDKModule.NetworkRequest.InitiatorType;

/** @enum {string} */
SDK.NetworkRequest.WebSocketFrameType = SDKModule.NetworkRequest.WebSocketFrameType;

SDK.NetworkRequest.cookieBlockedReasonToUiString = SDKModule.NetworkRequest.cookieBlockedReasonToUiString;
SDK.NetworkRequest.setCookieBlockedReasonToUiString = SDKModule.NetworkRequest.setCookieBlockedReasonToUiString;
SDK.NetworkRequest.cookieBlockedReasonToAttribute = SDKModule.NetworkRequest.cookieBlockedReasonToAttribute;
SDK.NetworkRequest.setCookieBlockedReasonToAttribute = SDKModule.NetworkRequest.setCookieBlockedReasonToAttribute;

/** @constructor */
SDK.OverlayModel = SDKModule.OverlayModel.OverlayModel;

/** @enum {symbol} */
SDK.OverlayModel.Events = SDKModule.OverlayModel.Events;

/**
 * @interface
 */
SDK.OverlayModel.Highlighter = SDKModule.OverlayModel.Highlighter;

/** @constructor */
SDK.PaintProfilerModel = SDKModule.PaintProfiler.PaintProfilerModel;

/** @constructor */
SDK.PaintProfilerSnapshot = SDKModule.PaintProfiler.PaintProfilerSnapshot;

/** @constructor */
SDK.PaintProfilerLogItem = SDKModule.PaintProfiler.PaintProfilerLogItem;

/** @constructor */
SDK.PerformanceMetricsModel = SDKModule.PerformanceMetricsModel.PerformanceMetricsModel;

/** @constructor */
SDK.ProfileTreeModel = SDKModule.ProfileTreeModel.ProfileTreeModel;

/** @constructor */
SDK.ProfileNode = SDKModule.ProfileTreeModel.ProfileNode;

/** @constructor */
SDK.RemoteObject = SDKModule.RemoteObject.RemoteObject;

/** @constructor */
SDK.RemoteObjectImpl = SDKModule.RemoteObject.RemoteObjectImpl;

/** @constructor */
SDK.ScopeRemoteObject = SDKModule.RemoteObject.ScopeRemoteObject;

/** @constructor */
SDK.ScopeRef = SDKModule.RemoteObject.ScopeRef;

/** @constructor */
SDK.RemoteObjectProperty = SDKModule.RemoteObject.RemoteObjectProperty;

/** @constructor */
SDK.LocalJSONObject = SDKModule.RemoteObject.LocalJSONObject;

/** @constructor */
SDK.RemoteArray = SDKModule.RemoteObject.RemoteArray;

/** @constructor */
SDK.RemoteFunction = SDKModule.RemoteObject.RemoteFunction;

/** @constructor */
SDK.Resource = SDKModule.Resource.Resource;

/** @constructor */
SDK.ResourceTreeModel = SDKModule.ResourceTreeModel.ResourceTreeModel;

/** @enum {symbol} */
SDK.ResourceTreeModel.Events = SDKModule.ResourceTreeModel.Events;

/** @constructor */
SDK.ResourceTreeFrame = SDKModule.ResourceTreeModel.ResourceTreeFrame;

/** @constructor */
SDK.PageDispatcher = SDKModule.ResourceTreeModel.PageDispatcher;

/** @constructor */
SDK.RuntimeModel = SDKModule.RuntimeModel.RuntimeModel;

/** @enum {symbol} */
SDK.RuntimeModel.Events = SDKModule.RuntimeModel.Events;

/** @constructor */
SDK.ExecutionContext = SDKModule.RuntimeModel.ExecutionContext;

/** @constructor */
SDK.SDKModel = SDKModule.SDKModel.SDKModel;

/** @constructor */
SDK.ScreenCaptureModel = SDKModule.ScreenCaptureModel.ScreenCaptureModel;

/** @constructor */
SDK.Script = SDKModule.Script.Script;

SDK.Script.sourceURLRegex = SDKModule.Script.sourceURLRegex;

/** @constructor */
SDK.SecurityOriginManager = SDKModule.SecurityOriginManager.SecurityOriginManager;

/** @enum {symbol} */
SDK.SecurityOriginManager.Events = SDKModule.SecurityOriginManager.Events;

/** @constructor */
SDK.ServerTiming = SDKModule.ServerTiming.ServerTiming;

/** @constructor */
SDK.ServiceWorkerCacheModel = SDKModule.ServiceWorkerCacheModel.ServiceWorkerCacheModel;

/** @enum {symbol} */
SDK.ServiceWorkerCacheModel.Events = SDKModule.ServiceWorkerCacheModel.Events;

/** @constructor */
SDK.ServiceWorkerCacheModel.Cache = SDKModule.ServiceWorkerCacheModel.Cache;

/** @constructor */
SDK.ServiceWorkerManager = SDKModule.ServiceWorkerManager.ServiceWorkerManager;

/** @enum {symbol} */
SDK.ServiceWorkerManager.Events = SDKModule.ServiceWorkerManager.Events;

/** @constructor */
SDK.ServiceWorkerVersion = SDKModule.ServiceWorkerManager.ServiceWorkerVersion;

/** @constructor */
SDK.ServiceWorkerRegistration = SDKModule.ServiceWorkerManager.ServiceWorkerRegistration;

/** @interface */
SDK.SourceMap = SDKModule.SourceMap.SourceMap;

/** @constructor */
SDK.SourceMapEntry = SDKModule.SourceMap.SourceMapEntry;

/** @constructor */
SDK.TextSourceMap = SDKModule.SourceMap.TextSourceMap;

/** @constructor */
SDK.WasmSourceMap = SDKModule.SourceMap.WasmSourceMap;

/** @constructor */
SDK.SourceMap.EditResult = SDKModule.SourceMap.EditResult;

/** @constructor */
SDK.SourceMapManager = SDKModule.SourceMapManager.SourceMapManager;

SDK.SourceMapManager.Events = SDKModule.SourceMapManager.Events;

/** @constructor */
SDK.Target = SDKModule.SDKModel.Target;

/**
 * @enum {number}
 */
SDK.Target.Capability = SDKModule.SDKModel.Capability;

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

/** @interface */
SDK.SDKModelObserver = SDKModule.SDKModel.SDKModelObserver;

/** @constructor */
SDK.TracingManager = SDKModule.TracingManager.TracingManager;

/** @interface */
SDK.TracingManagerClient = SDKModule.TracingManager.TracingManagerClient;

/** @constructor */
SDK.TracingModel = SDKModule.TracingModel.TracingModel;

SDK.TracingModel.Phase = SDKModule.TracingModel.Phase;
SDK.TracingModel.MetadataEvent = SDKModule.TracingModel.MetadataEvent;
SDK.TracingModel.LegacyTopLevelEventCategory = SDKModule.TracingModel.LegacyTopLevelEventCategory;
SDK.TracingModel.DevToolsMetadataEventCategory = SDKModule.TracingModel.DevToolsMetadataEventCategory;
SDK.TracingModel.DevToolsTimelineEventCategory = SDKModule.TracingModel.DevToolsTimelineEventCategory;

/** @constructor */
SDK.TracingModel.Event = SDKModule.TracingModel.Event;

/** @constructor */
SDK.TracingModel.ObjectSnapshot = SDKModule.TracingModel.ObjectSnapshot;

/** @constructor */
SDK.TracingModel.AsyncEvent = SDKModule.TracingModel.AsyncEvent;

/** @constructor */
SDK.TracingModel.Process = SDKModule.TracingModel.Process;

/** @constructor */
SDK.TracingModel.Thread = SDKModule.TracingModel.Thread;

/** @interface */
SDK.BackingStorage = SDKModule.TracingModel.BackingStorage;

/** @type {function({target: !SDK.Target, waitingForDebugger: boolean})|undefined} */
SDK.ChildTargetManager._attachCallback;

/**
 * @type {!SDK.ConsoleModel}
 */
SDK.consoleModel;

/** @type {!SDK.DOMDebuggerManager} */
self.SDK.domDebuggerManager;

/**
 * @type {!SDK.MultitargetNetworkManager}
 */
SDK.multitargetNetworkManager;

self.SDK.targetManager = new SDKModule.SDKModel.TargetManager();
self.SDK.isolateManager = new SDKModule.IsolateManager.IsolateManager();
self.SDK.domModelUndoStack = new SDKModule.DOMModel.DOMModelUndoStack();
self.SDK.networkLog = new SDKModule.NetworkLog.NetworkLog();
