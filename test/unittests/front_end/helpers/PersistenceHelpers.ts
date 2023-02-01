// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';
import * as Workspace from '../../../../front_end/models/workspace/workspace.js';

import type * as Platform from '../../../../front_end/core/platform/platform.js';
import {createFileSystemUISourceCode} from './UISourceCodeHelpers.js';
import * as Protocol from '../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../front_end/core/platform/platform.js';
import type * as Persistence from '../../../../front_end/models/persistence/persistence.js';

import {
  dispatchEvent,
} from './MockConnection.js';

// This helper sets up a file system and a file system uiSourceCode that can be used for
// Persistence testing. As soon as a script is added that has the given `networkScriptUrl` and the `content`,
// PersistenceImpl will try to bind the network uiSourceCode with this file system uiSourceCode.
export function createFileSystemFileForPersistenceTests(
    fileSystemScript: {
      fileSystemFileUrl: Platform.DevToolsPath.UrlString,
      fileSystemPath: Platform.DevToolsPath.UrlString,
      type?: string,
    },
    networkScriptUrl: Platform.DevToolsPath.UrlString, content: string, target: SDK.Target.Target):
    {uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Persistence.FileSystemWorkspaceBinding.FileSystem} {
  // First, set up a network resource that is described by the networkScriptUrl. This resource
  // file is required for a binding to be created.
  const origin = Common.ParsedURL.ParsedURL.extractOrigin(networkScriptUrl);
  dispatchDocumentOpened(target, origin);
  const mimeType = 'text/javascript';
  const resource = createResourceInMainFrame(target, networkScriptUrl, mimeType, content);

  // Now create the file system uiSourceCode to match the same meta data and content as the
  // created network's resource file.
  const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
  return createFileSystemUISourceCode({
    url: fileSystemScript.fileSystemFileUrl,
    content,
    fileSystemPath: fileSystemScript.fileSystemPath,
    mimeType,
    metadata,
    autoMapping: true,
    type: fileSystemScript.type,
  });
}

function dispatchDocumentOpened(target: SDK.Target.Target, origin: Platform.DevToolsPath.UrlString) {
  dispatchEvent(target, 'Page.documentOpened', {
    frame: {
      id: 'main',
      loaderId: 'foo',
      url: `${origin}/index.html`,
      domainAndRegistry: 'site',
      securityOrigin: origin,
      mimeType: 'text/html',
      secureContextType: Protocol.Page.SecureContextType.Secure,
      crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
      gatedAPIFeatures: [],
    },
  });
}

function createResourceInMainFrame(
    target: SDK.Target.Target, networkScriptUrl: Platform.DevToolsPath.UrlString, mimeType: string, content: string) {
  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  assertNotNullOrUndefined(resourceTreeModel);

  const mainFrameId = 'main' as Protocol.Page.FrameId;
  const resource = new SDK.Resource.Resource(
      resourceTreeModel, null, networkScriptUrl, networkScriptUrl, mainFrameId, null,
      Common.ResourceType.ResourceType.fromMimeType('text/javascript'), mimeType, null, content.length);

  const frame = resourceTreeModel.frameForId(mainFrameId);
  assertNotNullOrUndefined(frame);
  frame.addResource(resource);
  return resource;
}
