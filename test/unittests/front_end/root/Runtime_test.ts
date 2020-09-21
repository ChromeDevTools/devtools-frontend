// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../front_end/root/root.js';

const {assert} = chai;

const BASE_MODULE_NAME = 'testModule';
const BASE_URL = `${window.location.origin}/${BASE_MODULE_NAME}/`;

describe('Runtime', () => {
  describe('Module', () => {
    let module: Root.Runtime.Module;
    before(() => {
      module = new Root.Runtime.Module(Root.Runtime.Runtime.instance({forceNew: true, moduleDescriptors: []}), {
        name: BASE_MODULE_NAME,
        extensions: [],
        dependencies: [],
        scripts: [],
        modules: [],
        resources: [],
        condition: undefined,
        experiment: null,
      });
    });

    describe('getRemoteBase', () => {
      const bundled = 'devtools://devtools/bundled/devtools_app.html';
      const version = '@ffe848af6a5df4fa127e2929331116b7f9f1cb30';
      const remoteOrigin = 'https://chrome-devtools-frontend.appspot.com/';
      const remote = `${remoteOrigin}serve_file/${version}/`;
      const fullLocation = `${bundled}?remoteBase=${remote}&can_dock=true&dockSide=undocked`;

      it('provides remote base info', () => {
        assert.deepEqual(Root.Runtime.getRemoteBase(fullLocation), {
          version,
          base: `devtools://devtools/remote/serve_file/${version}/`,
        });
      });

      it('returns null when no remote base is provided', () => {
        assert.isNull(Root.Runtime.getRemoteBase(bundled));
      });

      it('returns null when a remote base with no version provided.', () => {
        assert.isNull(Root.Runtime.getRemoteBase(`${bundled}?remoteBase=${remoteOrigin}`));
      });
    });

    describe('can substitute URLs', () => {
      it('as regular string', () => {
        const regularString = 'no url here';
        assert.strictEqual(regularString, module.substituteURL(regularString));
      });

      it('with empty @url', () => {
        assert.strictEqual(BASE_URL, module.substituteURL('@url()'));
      });

      it('with single file', () => {
        assert.strictEqual(`${BASE_URL}file.js`, module.substituteURL('@url(file.js)'));
      });

      it('with surrounding text', () => {
        assert.strictEqual(
            `before ${BASE_URL}long/path/to/the/file.png after`,
            module.substituteURL('before @url(long/path/to/the/file.png) after'));
      });

      it('with multiple URLs', () => {
        assert.strictEqual(
            `${BASE_URL}first.png ${BASE_URL}second.gif`, module.substituteURL('@url(first.png) @url(second.gif)'));
      });

      it('with multiple URLs with text around', () => {
        assert.strictEqual(
            `a lot of ${BASE_URL}stuff in a ${BASE_URL}singleline and more url() @@url (not/a/resource.gif)`,
            module.substituteURL(
                'a lot of @url(stuff) in a @url(single)line and more url() @@url (not/a/resource.gif)'));
      });
    });
  });
});
