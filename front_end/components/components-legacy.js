// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentsModule from './components.js';

self.Components = self.Components || {};
Components = Components || {};

/** @constructor */
Components.DockController = ComponentsModule.DockController.DockController;

Components.DockController.State = ComponentsModule.DockController.State;

/** @enum {symbol} */
Components.DockController.Events = ComponentsModule.DockController.Events;

/** @constructor */
Components.DockController.ToggleDockActionDelegate = ComponentsModule.DockController.ToggleDockActionDelegate;

/** @constructor */
Components.DockController.CloseButtonProvider = ComponentsModule.DockController.CloseButtonProvider;

/** @constructor */
Components.ImagePreview = ComponentsModule.ImagePreview.ImagePreview;

Components.JSPresentationUtils = {};

Components.JSPresentationUtils.buildStackTracePreviewContents =
    ComponentsModule.JSPresentationUtils.buildStackTracePreviewContents;

/** @constructor */
Components.Linkifier = ComponentsModule.Linkifier.Linkifier;

/** @constructor */
Components.Linkifier.LinkContextMenuProvider = ComponentsModule.Linkifier.LinkContextMenuProvider;

/** @constructor */
Components.Linkifier.LinkHandlerSettingUI = ComponentsModule.Linkifier.LinkHandlerSettingUI;

/** @constructor */
Components.Linkifier.ContentProviderContextMenuProvider = ComponentsModule.Linkifier.ContentProviderContextMenuProvider;

/** @interface */
Components.LinkDecorator = ComponentsModule.Linkifier.LinkDecorator;

Components.reload = ComponentsModule.Reload.reload;

/** @constructor */
Components.TargetDetachedDialog = ComponentsModule.TargetDetachedDialog.TargetDetachedDialog;

/**
 * @type {!Components.DockController}
 */
Components.dockController;

/**
 * @typedef {{
  *     icon: ?UI.Icon,
  *     enableDecorator: boolean,
  *     uiLocation: ?Workspace.UILocation,
  *     liveLocation: ?Bindings.LiveLocation,
  *     url: ?string,
  *     lineNumber: ?number,
  *     columnNumber: ?number,
  *     revealable: ?Object,
  *     fallback: ?Element
  * }}
  */
Components._LinkInfo;

/**
 * @typedef {{
 *     text: (string|undefined),
 *     className: (string|undefined),
 *     lineNumber: (number|undefined),
 *     columnNumber: (number|undefined),
 *     preventClick: (boolean|undefined),
 *     maxLength: (number|undefined),
 *     tabStop: (boolean|undefined),
 *     bypassURLTrimming: (boolean|undefined)
 * }}
 */
Components.LinkifyURLOptions;

/**
 * @typedef {{
 *     className: (string|undefined),
 *     columnNumber: (number|undefined),
 *     tabStop: (boolean|undefined)
 * }}
 */
Components.LinkifyOptions;

/**
 * @typedef {{
 *     maxLength: (number|undefined),
 *     title: (string|undefined),
 *     href: (string|undefined),
 *     preventClick: (boolean|undefined),
 *     tabStop: (boolean|undefined),
 *     bypassURLTrimming: (boolean|undefined)
 * }}
 */
Components._CreateLinkOptions;

/**
 * @typedef {function(!Common.ContentProvider, number)}
 */
Components.Linkifier.LinkHandler;

/**
 * @typedef {{
 *   stackTrace: (!Protocol.Runtime.StackTrace|undefined),
 *   contentUpdated: (function()|undefined),
 *   tabStops: (boolean|undefined)
 * }}
 */
Components.JSPresentationUtils.Options;
