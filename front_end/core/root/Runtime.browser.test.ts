// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';

import * as Root from './root.js';

describe('Runtime', () => {
  it('getChromeVersion result has the correct shape', () => {
    assert.isTrue(/^\d{3}\.0\.0\.0$/.test(Root.Runtime.getChromeVersion()));
  });

  // These tests are browser specific because they use localStorage.
  describe('ExperimentsSupport', () => {
    beforeEach(() => {
      self?.localStorage?.removeItem('experiments');
    });

    it('registers an experiment', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      assert.isFalse(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
      support.setEnabled('experiment' as Root.ExperimentNames.ExperimentName, true);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables an experiment by default', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      support.enableExperimentsByDefault(['experiment' as Root.ExperimentNames.ExperimentName]);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables an experiment via the server', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      support.setServerEnabledExperiments(['experiment' as Root.ExperimentNames.ExperimentName]);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });

    it('enables an experiment for test', () => {
      const support = new Root.Runtime.ExperimentsSupport();
      support.register(
          'experiment' as Root.ExperimentNames.ExperimentName, 'experiment title' as Platform.UIString.LocalizedString);
      assert.isFalse(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
      support.enableForTest('experiment' as Root.ExperimentNames.ExperimentName);
      assert.isTrue(support.isEnabled('experiment' as Root.ExperimentNames.ExperimentName));
    });
  });
});
