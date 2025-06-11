// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('ResourceUtils', () => {
  const INSPECTED_URL_SCHEME = 'http://';
  const INSPECTED_URL_DOMAIN = 'example.com';
  const OTHER_DOMAIN = 'example.org';
  const INSPECTED_URL_PATH_COMPONENTS = ['', 'foo', 'bar'];
  const INSPECTED_URL_PATH = INSPECTED_URL_PATH_COMPONENTS.join('/');
  const INSPECTED_URL = urlString`${INSPECTED_URL_SCHEME}${INSPECTED_URL_DOMAIN}${INSPECTED_URL_PATH}`;
  const QUERY_STRING = '?QUERY_STRING';
  const OTHER_PATH = '/OTHER/PATH';
  const INVALID_URL = urlString`:~INVALID_URL~:`;
  let target: SDK.Target.Target;
  let resourceForURLStub: sinon.SinonStub;
  let uiSourceCodeForURLStub: sinon.SinonStub;

  describe('displayNameForURL', () => {
    const {displayNameForURL} = Bindings.ResourceUtils;

    beforeEach(() => {
      const tabTarget = createTarget({type: SDK.Target.Type.TAB});
      createTarget({parentTarget: tabTarget, subtype: 'prerender'});
      target = createTarget({parentTarget: tabTarget});
      target.setInspectedURL(INSPECTED_URL);
      resourceForURLStub = sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL').returns(null);
      uiSourceCodeForURLStub =
          sinon.stub(Workspace.Workspace.WorkspaceImpl.instance(), 'uiSourceCodeForURL').returns(null);
    });

    it('favors displayName from UISourceCode', () => {
      const resource = sinon.createStubInstance(SDK.Resource.Resource);
      resourceForURLStub.returns(resource);
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.displayName.returns('UI_SOURCE_CODE_DISPLAY_NAME');
      uiSourceCodeForURLStub.returns(uiSourceCode);

      assert.strictEqual(displayNameForURL(urlString`${INSPECTED_URL}${QUERY_STRING}`), 'UI_SOURCE_CODE_DISPLAY_NAME');
    });

    it('falls back to displayName from Resource', () => {
      const resource = sinon.createStubInstance(SDK.Resource.Resource);
      sinon.stub(resource, 'displayName').value('RESOURCE_DISPLAY_NAME');
      resourceForURLStub.returns(resource);

      assert.strictEqual(displayNameForURL(urlString`${INSPECTED_URL}${QUERY_STRING}`), 'RESOURCE_DISPLAY_NAME');
    });

    it('returns path relative to the last main URL component if it matches and does not have query string', () => {
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL}${QUERY_STRING}`),
          `${INSPECTED_URL_PATH_COMPONENTS.slice(-1)[0]}${QUERY_STRING}`);
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL}${OTHER_PATH}`),
          `${INSPECTED_URL_PATH_COMPONENTS.slice(-1)[0] + OTHER_PATH}`);
    });

    it('returns path relative to the main URL domain if it matches and does have query string', () => {
      target.setInspectedURL(urlString`${INSPECTED_URL}${QUERY_STRING}`);
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL}${QUERY_STRING}`), `${INSPECTED_URL_PATH}${QUERY_STRING}`);
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL}${OTHER_PATH}`), `${INSPECTED_URL_PATH}${OTHER_PATH}`);
    });

    it('returns path relative to the main URL domain if only domain matches', () => {
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + OTHER_PATH}`), `${OTHER_PATH}`);
    });

    it('returns path relative to the main URL domain if path partially matches', () => {
      assert.strictEqual(
          displayNameForURL(
              urlString`${INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + '/' + INSPECTED_URL_PATH_COMPONENTS[1] + '/'}`),
          `${'/' + INSPECTED_URL_PATH_COMPONENTS[1] + '/'}`);
    });

    it('returns main URL domain if it matches and the path is empty', () => {
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL_SCHEME + INSPECTED_URL_DOMAIN + '/'}`),
          `${INSPECTED_URL_DOMAIN + '/'}`);
    });

    it('strips scheme if domain does not match main URL', () => {
      assert.strictEqual(
          displayNameForURL(urlString`${INSPECTED_URL_SCHEME + OTHER_DOMAIN + OTHER_PATH}`),
          `${OTHER_DOMAIN + OTHER_PATH}`);
    });

    it('returns URL as is if it cannot be parsed', () => {
      assert.strictEqual(displayNameForURL(INVALID_URL), INVALID_URL);
    });
  });
});
