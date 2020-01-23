// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WorkspaceModule from './workspace.js';

self.Workspace = self.Workspace || {};
Workspace = Workspace || {};

/** @constructor */
Workspace.FileManager = WorkspaceModule.FileManager.FileManager;

/** @enum {symbol} */
Workspace.FileManager.Events = WorkspaceModule.FileManager.Events;

/** @constructor */
Workspace.UISourceCode = WorkspaceModule.UISourceCode.UISourceCode;

/** @enum {symbol} */
Workspace.UISourceCode.Events = WorkspaceModule.UISourceCode.Events;

/** @constructor */
Workspace.UISourceCode.Message = WorkspaceModule.UISourceCode.Message;

/** @constructor */
Workspace.UISourceCode.LineMarker = WorkspaceModule.UISourceCode.LineMarker;

/** @constructor */
Workspace.UILocation = WorkspaceModule.UISourceCode.UILocation;

/** @constructor */
Workspace.UISourceCodeMetadata = WorkspaceModule.UISourceCode.UISourceCodeMetadata;

/** @constructor */
Workspace.Workspace = WorkspaceModule.Workspace.WorkspaceImpl;

/** @enum {symbol} */
Workspace.Workspace.Events = WorkspaceModule.Workspace.Events;

/** @interface */
Workspace.ProjectSearchConfig = WorkspaceModule.Workspace.ProjectSearchConfig;

/** @interface */
Workspace.Project = WorkspaceModule.Workspace.Project;

/** @enum {string} */
Workspace.projectTypes = WorkspaceModule.Workspace.projectTypes;

/** @constructor */
Workspace.ProjectStore = WorkspaceModule.Workspace.ProjectStore;

/**
 * @type {?Workspace.FileManager}
 */
Workspace.fileManager;

/**
 * @type {!Workspace.Workspace}
 */
self.Workspace.workspace;
