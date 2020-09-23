// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import './SDKModel.js';
import './CSSMetadata.js';
import '../generated/SupportedCSSProperties.js';
import './ProfileTreeModel.js';
import './NetworkRequest.js';
import './NetworkManager.js';
import './RuntimeModel.js';

import * as ChildTargetManager from './ChildTargetManager.js';
import * as CompilerSourceMappingContentProvider from './CompilerSourceMappingContentProvider.js';
import * as Connections from './Connections.js';
import * as ConsoleModel from './ConsoleModel.js';
import * as ContentSecurityPolicyIssue from './ContentSecurityPolicyIssue.js';
import * as Cookie from './Cookie.js';
import * as CookieModel from './CookieModel.js';
import * as CookieParser from './CookieParser.js';
import * as CPUProfileDataModel from './CPUProfileDataModel.js';
import * as CPUProfilerModel from './CPUProfilerModel.js';
import * as CSSFontFace from './CSSFontFace.js';
import * as CSSMatchedStyles from './CSSMatchedStyles.js';
import * as CSSMedia from './CSSMedia.js';
import * as CSSMetadata from './CSSMetadata.js';
import * as CSSModel from './CSSModel.js';
import * as CSSProperty from './CSSProperty.js';
import * as CSSPropertyParser from './CSSPropertyParser.js';
import * as CSSRule from './CSSRule.js';
import * as CSSStyleDeclaration from './CSSStyleDeclaration.js';
import * as CSSStyleSheetHeader from './CSSStyleSheetHeader.js';
import * as DebuggerModel from './DebuggerModel.js';
import * as DOMDebuggerModel from './DOMDebuggerModel.js';
import * as DOMModel from './DOMModel.js';
import * as EmulationModel from './EmulationModel.js';
import * as FilmStripModel from './FilmStripModel.js';
import * as FrameManager from './FrameManager.js';
import * as HARLog from './HARLog.js';
import * as HeapProfilerModel from './HeapProfilerModel.js';
import * as HeavyAdIssue from './HeavyAdIssue.js';
import * as IOModel from './IOModel.js';
import * as IsolateManager from './IsolateManager.js';
import * as Issue from './Issue.js';
import * as IssuesModel from './IssuesModel.js';
import * as LayerTreeBase from './LayerTreeBase.js';
import * as LogModel from './LogModel.js';
import * as MixedContentIssue from './MixedContentIssue.js';
import * as NetworkLog from './NetworkLog.js';
import * as NetworkManager from './NetworkManager.js';
import * as NetworkRequest from './NetworkRequest.js';
import * as OverlayModel from './OverlayModel.js';
import * as PageResourceLoader from './PageResourceLoader.js';
import * as PaintProfiler from './PaintProfiler.js';
import * as PerformanceMetricsModel from './PerformanceMetricsModel.js';
import * as ProfileTreeModel from './ProfileTreeModel.js';
import * as RemoteObject from './RemoteObject.js';
import * as Resource from './Resource.js';
import * as ResourceTreeModel from './ResourceTreeModel.js';
import * as RuntimeModel from './RuntimeModel.js';
import * as SameSiteCookieIssue from './SameSiteCookieIssue.js';
import * as ScreenCaptureModel from './ScreenCaptureModel.js';
import * as Script from './Script.js';
import * as SDKModel from './SDKModel.js';
import * as SecurityOriginManager from './SecurityOriginManager.js';
import * as ServerTiming from './ServerTiming.js';
import * as ServiceWorkerCacheModel from './ServiceWorkerCacheModel.js';
import * as ServiceWorkerManager from './ServiceWorkerManager.js';
import * as SourceMap from './SourceMap.js';
import * as SourceMapManager from './SourceMapManager.js';
import * as TracingManager from './TracingManager.js';
import * as TracingModel from './TracingModel.js';
import * as WebAuthnModel from './WebAuthnModel.js';

// We need to force creation of the FrameManager early to make sure no issues are missed.
FrameManager.FrameManager.instance();
// We need to force creation of the NetworkLog early to make sure no requests are missed.
NetworkLog.NetworkLog.instance();

export {
  ChildTargetManager,
  CompilerSourceMappingContentProvider,
  Connections,
  ConsoleModel,
  ContentSecurityPolicyIssue,
  Cookie,
  CookieModel,
  CookieParser,
  CPUProfileDataModel,
  CPUProfilerModel,
  CSSFontFace,
  CSSMatchedStyles,
  CSSMedia,
  CSSMetadata,
  CSSModel,
  CSSProperty,
  CSSPropertyParser,
  CSSRule,
  CSSStyleDeclaration,
  CSSStyleSheetHeader,
  DebuggerModel,
  DOMDebuggerModel,
  DOMModel,
  EmulationModel,
  FilmStripModel,
  FrameManager,
  HARLog,
  HeapProfilerModel,
  HeavyAdIssue,
  IOModel,
  IsolateManager,
  Issue,
  IssuesModel,
  LayerTreeBase,
  LogModel,
  MixedContentIssue,
  NetworkLog,
  NetworkManager,
  NetworkRequest,
  OverlayModel,
  PageResourceLoader,
  PaintProfiler,
  PerformanceMetricsModel,
  ProfileTreeModel,
  RemoteObject,
  Resource,
  ResourceTreeModel,
  RuntimeModel,
  SameSiteCookieIssue,
  ScreenCaptureModel,
  Script,
  SDKModel,
  SecurityOriginManager,
  ServerTiming,
  ServiceWorkerCacheModel,
  ServiceWorkerManager,
  SourceMap,
  SourceMapManager,
  TracingManager,
  TracingModel,
  WebAuthnModel
};
