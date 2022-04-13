// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../front_end/core/platform/platform.js';
import * as TextUtils from '../../../../front_end/models/text_utils/text_utils.js';
import * as Bindings from '../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../front_end/models/workspace/workspace.js';

export function createUISourceCode(options: {
  url: Platform.DevToolsPath.UrlString,
  content?: string, mimeType: string,
  projectType?: Workspace.Workspace.projectTypes,
  projectId?: string,
  fileSystemPath?: string,
}): {
  project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
  uiSourceCode: Workspace.UISourceCode.UISourceCode,
} {
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
      workspace, options.projectId || 'PROJECT_ID', Workspace.Workspace.projectTypes.Formatter, 'Test project',
      false /* isServiceProject*/);
  const resourceType = Common.ResourceType.ResourceType.fromMimeType(options.mimeType);
  const uiSourceCode =
      project.createUISourceCode(options.url, resourceType || Workspace.Workspace.projectTypes.FileSystem);
  const contentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
      options.url, resourceType, options.content || '');
  project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null /* metadata*/, options.mimeType);
  if (options.fileSystemPath) {
    // @ts-ignore
    project.fileSystemPath = () => options.fileSystemPath;
    // @ts-ignore
    project.fileSystemBaseURL = options.fileSystemPath + '/';
  }
  return {uiSourceCode, project};
}
