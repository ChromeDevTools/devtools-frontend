// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';

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

    describe('isNodeEntry', () => {
      it('returns true for node_app', () => {
        assert.isTrue(Root.Runtime.isNodeEntry('/bundled/node_app.html'));
        assert.isTrue(Root.Runtime.isNodeEntry('/node_app'));
      });

      it('returns true for js_app', () => {
        assert.isTrue(Root.Runtime.isNodeEntry('/bundled/js_app.html'));
        assert.isTrue(Root.Runtime.isNodeEntry('/js_app'));
      });

      it('returns false for other entries', () => {
        assert.isFalse(Root.Runtime.isNodeEntry('/bundled/inspector.html'));
        assert.isFalse(Root.Runtime.isNodeEntry('/inspector'));
      });
    });
  });

  it('allConfigurableExperiments returns all registered experiments', () => {
    Root.Runtime.experiments.register(
        Root.ExperimentNames.ExperimentName.FONT_EDITOR, 'font editor' as Platform.UIString.LocalizedString);
    Root.Runtime.experiments.register(
        Root.ExperimentNames.ExperimentName.APCA, 'apca' as Platform.UIString.LocalizedString);

    const experiments = Root.Runtime.experiments.allConfigurableExperiments();

    assert.deepEqual(
        experiments.map(experiment => experiment.name),
        [Root.ExperimentNames.ExperimentName.FONT_EDITOR, Root.ExperimentNames.ExperimentName.APCA]);
  });

  describe('ExperimentsSupport', () => {
    it('throws for unknown experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      assert.throws(() => support.isEnabled('test-experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('throws if registering the same experiment twice', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      assert.throws(() => {
        support.register(
            'experiment' as Root.ExperimentNames.ExperimentName,
            'experiment title' as Platform.UIString.LocalizedString);
      });
    });

    it('registers a host experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.registerHostExperiment({
        name: 'experiment' as Root.ExperimentNames.ExperimentName,
        title: 'experiment title',
        aboutFlag: 'about:flag',
        isEnabled: false,
      });
      assert.isFalse(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables a host experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.registerHostExperiment({
        name: 'experiment' as Root.ExperimentNames.ExperimentName,
        title: 'experiment title',
        aboutFlag: 'about:flag',
        isEnabled: false,
      });
      support.setEnabled('experiment' as Root.ExperimentNames.ExperimentName, true);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables a host experiment via initialization', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.registerHostExperiment({
        name: 'experiment' as Root.ExperimentNames.ExperimentName,
        title: 'experiment title',
        aboutFlag: 'about:flag',
        isEnabled: true,
      });
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables a host experiment for test', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.registerHostExperiment({
        name: 'experiment' as Root.ExperimentNames.ExperimentName,
        title: 'experiment title',
        aboutFlag: 'about:flag',
        isEnabled: false,
      });
      assert.isFalse(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
      support.enableForTest('experiment' as Root.ExperimentNames.ExperimentName);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('throws if registering a host experiment with the same name as an existing experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      assert.throws(() => {
        support.registerHostExperiment({
          name: 'experiment' as Root.ExperimentNames.ExperimentName,
          title: 'experiment title',
          aboutFlag: 'about:flag',
          isEnabled: false,
        });
      });
    });

    it('throws if registering a host experiment with the same name as an existing host experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.registerHostExperiment({
        name: 'experiment' as Root.ExperimentNames.ExperimentName,
        title: 'experiment title',
        aboutFlag: 'about:flag',
        isEnabled: false,
      });
      assert.throws(() => {
        support.registerHostExperiment({
          name: 'experiment' as Root.ExperimentNames.ExperimentName,
          title: 'experiment title',
          aboutFlag: 'about:flag',
          isEnabled: false,
        });
      });
    });
  });
});
