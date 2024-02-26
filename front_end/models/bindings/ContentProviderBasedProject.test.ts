// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import {createContentProviderUISourceCodes} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

type UrlString = Platform.DevToolsPath.UrlString;

describe('ContentProviderBasedProject', () => {
  beforeEach(() => {
    Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  });

  describe('findFilesMatchingSearchRequest', () => {
    it('filters UISourceCodes based on search query', async () => {
      const {project, uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/a.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "foo"\n',
          },
          {
            url: 'http://example.com/b.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "bar"\n',
          },
        ],
      });
      const searchConfig = new Workspace.SearchConfig.SearchConfig('foo', false, false);

      const result =
          await project.findFilesMatchingSearchRequest(searchConfig, uiSourceCodes, new Common.Progress.Progress());

      assert.hasAllKeys(result, [uiSourceCodes[0]]);
    });

    it('only includes files if all query parts are found in that file', async () => {
      const {project, uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/a.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "foo"\n',
          },
          {
            url: 'http://example.com/b.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "bar"\n',
          },
        ],
      });
      const searchConfig = new Workspace.SearchConfig.SearchConfig('"bar""line"', false, false);

      const result =
          await project.findFilesMatchingSearchRequest(searchConfig, uiSourceCodes, new Common.Progress.Progress());

      assert.hasAllKeys(result, [uiSourceCodes[1]]);
    });

    it('does include search matches in the result', async () => {
      const {project, uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/a.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "foo"\n',
          },
          {
            url: 'http://example.com/b.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "bar"\n',
          },
        ],
      });
      const searchConfig = new Workspace.SearchConfig.SearchConfig('line', false, false);

      const result =
          await project.findFilesMatchingSearchRequest(searchConfig, uiSourceCodes, new Common.Progress.Progress());

      assert.hasAllKeys(result, uiSourceCodes);
      assert.deepEqual(
          result.get(uiSourceCodes[0]),
          [{lineNumber: 0, lineContent: 'Single line with "foo"', columnNumber: 7, matchLength: 4}]);
      assert.deepEqual(
          result.get(uiSourceCodes[1]),
          [{lineNumber: 0, lineContent: 'Single line with "bar"', columnNumber: 7, matchLength: 4}]);
    });

    it('updates the progress per file', async () => {
      const {project, uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/a.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "foo"\n',
          },
          {
            url: 'http://example.com/b.js' as UrlString,
            mimeType: 'text/javascript',
            content: 'Single line with "bar"\n',
          },
        ],
      });
      const searchConfig = new Workspace.SearchConfig.SearchConfig('foo', false, false);
      const progress = sinon.spy(new Common.Progress.Progress());

      await project.findFilesMatchingSearchRequest(searchConfig, uiSourceCodes, progress);

      assert.isTrue(progress.setTotalWork.calledOnceWithExactly(2));
      assert.isTrue(progress.incrementWorked.calledTwice);
      assert.isTrue(progress.done.calledOnce);
    });
  });
});
