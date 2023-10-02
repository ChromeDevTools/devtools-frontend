// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('ResourceUtils', () => {
  const displayNameForURL = (targetFactory: () => SDK.Target.Target) => {
    const INSPECTED_URL_SCHEME = 'http://';
    const INSPECTED_URL_DOMAIN = 'example.com';
    const OTHER_DOMAIN = 'example.org';
    const INSPECTED_URL_PATH_COMPONENTS = ['', 'foo', 'bar'] as Platform.DevToolsPath.UrlString[];
    const INSPECTED_URL_PATH = INSPECTED_URL_PATH_COMPONENTS.join('/') as Platform.DevToolsPath.UrlString;
    const INSPECTED_URL =
        INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + INSPECTED_URL_PATH as Platform.DevToolsPath.UrlString;

    const RESOURCE_URL = INSPECTED_URL + '?RESOURCE_URL' as Platform.DevToolsPath.UrlString;
    const RESOURCE = {displayName: 'RESOURCE_DISPLAY_NAME'} as SDK.Resource.Resource;
    const UI_SOURCE_CODE_URL = INSPECTED_URL + '?UI_SOURCE_CODE_URL' as Platform.DevToolsPath.UrlString;
    const UI_SOURCE_CODE = {displayName: () => 'UI_SOURCE_CODE_DISPLAY_NAME'} as Workspace.UISourceCode.UISourceCode;
    const QUERY_STRING = '?QUERY_STRING';
    const OTHER_PATH = '/OTHER/PATH';
    const INVALID_URL = ':~INVALID_URL~:' as Platform.DevToolsPath.UrlString;
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = targetFactory();
      target.setInspectedURL(INSPECTED_URL);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      sinon.stub(resourceTreeModel, 'resourceForURL').returns(null).withArgs(RESOURCE_URL).returns(RESOURCE);

      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      sinon.stub(workspace, 'uiSourceCodeForURL')
          .returns(null)
          .withArgs(RESOURCE_URL)
          .returns(UI_SOURCE_CODE)
          .withArgs(UI_SOURCE_CODE_URL)
          .returns(UI_SOURCE_CODE);
    });

    it('returns a resource name if available', async () => {
      assert.strictEqual(Bindings.ResourceUtils.displayNameForURL(RESOURCE_URL), RESOURCE.displayName);
    });

    it('returns a resource name if available', async () => {
      assert.strictEqual(Bindings.ResourceUtils.displayNameForURL(UI_SOURCE_CODE_URL), UI_SOURCE_CODE.displayName());
    });

    it('returns path relative to the last main URL component if it matches and does not have query string',
       async () => {
         assert.strictEqual(
             Bindings.ResourceUtils.displayNameForURL(INSPECTED_URL + QUERY_STRING as Platform.DevToolsPath.UrlString),
             INSPECTED_URL_PATH_COMPONENTS.slice(-1)[0] + QUERY_STRING as Platform.DevToolsPath.UrlString);
         assert.strictEqual(
             Bindings.ResourceUtils.displayNameForURL(INSPECTED_URL + OTHER_PATH as Platform.DevToolsPath.UrlString),
             INSPECTED_URL_PATH_COMPONENTS.slice(-1)[0] + OTHER_PATH as Platform.DevToolsPath.UrlString);
       });

    it('returns path relative to the main URL domain if it matches and does have query string', async () => {
      target.setInspectedURL(INSPECTED_URL + QUERY_STRING as Platform.DevToolsPath.UrlString);
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(INSPECTED_URL + QUERY_STRING as Platform.DevToolsPath.UrlString),
          INSPECTED_URL_PATH + QUERY_STRING as Platform.DevToolsPath.UrlString);
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(INSPECTED_URL + OTHER_PATH as Platform.DevToolsPath.UrlString),
          INSPECTED_URL_PATH + OTHER_PATH as Platform.DevToolsPath.UrlString);
    });

    it('returns path relative to the main URL domain if only domain matches', async () => {
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(
              INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + OTHER_PATH as Platform.DevToolsPath.UrlString),
          OTHER_PATH as Platform.DevToolsPath.UrlString);
    });

    it('returns path relative to the main URL domain if path partially matches', async () => {
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(
              INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + '/' + INSPECTED_URL_PATH_COMPONENTS[1] + '/' as
              Platform.DevToolsPath.UrlString),
          '/' + INSPECTED_URL_PATH_COMPONENTS[1] + '/' as Platform.DevToolsPath.UrlString);
    });

    it('returns main URL domain if it matches and the path is empty', async () => {
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(
              INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + '/' as Platform.DevToolsPath.UrlString),
          INSPECTED_URL_DOMAIN + '/' as Platform.DevToolsPath.UrlString);
    });

    it('strips scheme if domain does not match main URL', async () => {
      assert.strictEqual(
          Bindings.ResourceUtils.displayNameForURL(
              INSPECTED_URL_SCHEME + OTHER_DOMAIN + OTHER_PATH as Platform.DevToolsPath.UrlString),
          OTHER_DOMAIN + OTHER_PATH as Platform.DevToolsPath.UrlString);
    });

    it('returns URL as is if it cannot be parsed', async () => {
      assert.strictEqual(Bindings.ResourceUtils.displayNameForURL(INVALID_URL), INVALID_URL);
    });
  };

  describe('displayNameForURL without tab target', () => displayNameForURL(() => createTarget()));
  describe('displayNameForURL with tab target', () => displayNameForURL(() => {
                                                  const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                                  createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                                  return createTarget({parentTarget: tabTarget});
                                                }));
});
