// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from './root.js';

describe('Runtime', () => {
  beforeEach(() => {
    Root.Runtime.experiments.clearForTest();
  });

  describe('Module', () => {
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
  });

  it('allConfigurableExperiments returns all registered experiments', () => {
    Root.Runtime.experiments.register('example', 'example');
    Root.Runtime.experiments.register('configurable', 'configurable');

    const experiments = Root.Runtime.experiments.allConfigurableExperiments();

    assert.deepStrictEqual(experiments.map(experiment => experiment.name), ['example', 'configurable']);
  });
});
