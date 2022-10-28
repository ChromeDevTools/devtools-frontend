// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Formatter from '../../../../../front_end/models/formatter/formatter.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {createContentProviderUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

describeWithEnvironment('SourceFormatter', () => {
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject;
  let sourceFormatter: Formatter.SourceFormatter.SourceFormatter;

  const DOCUMENT_URL = 'index.html' as Platform.DevToolsPath.UrlString;
  const PROJECT_ID = 'projectID';
  const MIME_TYPE = 'text/html';
  const RESOURCE_TYPE = Common.ResourceType.ResourceType.fromMimeType(MIME_TYPE);

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    ({project, uiSourceCode} = createContentProviderUISourceCode({
       url: DOCUMENT_URL,
       mimeType: MIME_TYPE,
       content: '<html><body></body></html>',
       projectType: Workspace.Workspace.projectTypes.Formatter,
       projectId: PROJECT_ID,
     }));
    sourceFormatter = Formatter.SourceFormatter.SourceFormatter.instance({forceNew: true});
  });

  it('can format a HTML document', async () => {
    const {formattedSourceCode} = await sourceFormatter.format(uiSourceCode);
    const formattedContent = await formattedSourceCode.requestContent();
    assert.strictEqual(formattedContent.content, `<html>
    <body></body>
</html>
`);
  });

  it('caches formatted documents', async () => {
    await sourceFormatter.format(uiSourceCode);
    assert.isTrue(sourceFormatter.hasFormatted(uiSourceCode));
  });

  it('removes cached formatted documents on request', async () => {
    const {formattedSourceCode} = await sourceFormatter.format(uiSourceCode);
    await sourceFormatter.discardFormattedUISourceCode(formattedSourceCode);
    assert.isFalse(sourceFormatter.hasFormatted(uiSourceCode));
  });

  it('ignores previously cached formatted documents if already removed from cache', async () => {
    const {formattedSourceCode} = await sourceFormatter.format(uiSourceCode);
    await sourceFormatter.discardFormattedUISourceCode(formattedSourceCode);
    assert.isFalse(sourceFormatter.hasFormatted(uiSourceCode));
    // Should already be removed and should gracefully handle a second removal
    await sourceFormatter.discardFormattedUISourceCode(formattedSourceCode);
    assert.isFalse(sourceFormatter.hasFormatted(uiSourceCode));
  });

  it('retrieves original source code from formatted version', async () => {
    const {formattedSourceCode} = await sourceFormatter.format(uiSourceCode);
    assert.strictEqual(sourceFormatter.getOriginalUISourceCode(formattedSourceCode), uiSourceCode);
  });

  it('can compute the original path of the source code from formatted output', async () => {
    const formattedResult = await sourceFormatter.format(uiSourceCode);
    assert.strictEqual(formattedResult.originalPath(), `${PROJECT_ID}:${DOCUMENT_URL}`);
  });

  it('can handle duplicate file names for different ui source code instances', async () => {
    const formattedResult = await sourceFormatter.format(uiSourceCode);
    assert.isTrue(formattedResult.formattedSourceCode.url().startsWith(`${DOCUMENT_URL}:formatted`));

    const duplicateUiSourceCode = project.createUISourceCode(DOCUMENT_URL, RESOURCE_TYPE);
    const secondContentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        DOCUMENT_URL, RESOURCE_TYPE, '<html>Second document</html>');
    project.addUISourceCodeWithProvider(duplicateUiSourceCode, secondContentProvider, null, MIME_TYPE);

    const duplicateFormattedResult = await sourceFormatter.format(duplicateUiSourceCode);
    assert.isTrue(duplicateFormattedResult.formattedSourceCode.url().startsWith(`${DOCUMENT_URL}:formatted`));

    assert.notStrictEqual(formattedResult, duplicateFormattedResult);
    // We created a new unique name for the newly formatted document
    assert.notStrictEqual(
        formattedResult.formattedSourceCode.url(), duplicateFormattedResult.formattedSourceCode.url());
    // Even though the original paths were equivalent
    assert.strictEqual(formattedResult.originalPath(), duplicateFormattedResult.originalPath());
  });
});
