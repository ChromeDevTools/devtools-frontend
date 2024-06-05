// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../models/trace/trace.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as ModificationsManager from './modifications_manager.js';

describe('ModificationsManager', () => {
  it('applies modifications when present in a trace file', async function() {
    await TraceLoader.traceEngine(null, 'web-dev-modifications.json.gz');
    const modificationsManager = ModificationsManager.ModificationsManager.ModificationsManager.activeManager();
    if (!modificationsManager) {
      throw new Error('Modifications manager does not exist.');
    }
    modificationsManager.applyModificationsIfPresent();
    const entriesFilter = modificationsManager.getEntriesFilter();
    assert.strictEqual(entriesFilter.expandableEntries().length, 1);
    assert.strictEqual(entriesFilter.invisibleEntries().length, 42);
    assert.deepEqual(modificationsManager.getTimelineBreadcrumbs().initialBreadcrumb, {
      'window': {'min': 967569605481, 'max': 967573120579, 'range': 3515098},
      'child':
          {'window': {'min': 967569967927.7909, 'max': 967571964564.4985, 'range': 1996636.7076416016}, 'child': null},
    } as TraceEngine.Types.File.Breadcrumb);
  });

  it('generates a serializable modifications json ', async function() {
    await TraceLoader.traceEngine(null, 'web-dev-modifications.json.gz');
    const modificationsManager = ModificationsManager.ModificationsManager.ModificationsManager.activeManager();
    if (!modificationsManager) {
      throw new Error('Modifications manager does not exist.');
    }
    modificationsManager.applyModificationsIfPresent();
    const entriesFilter = modificationsManager.getEntriesFilter();
    const modifications = modificationsManager.toJSON();
    assert.strictEqual(entriesFilter.expandableEntries().length, 1);
    assert.strictEqual(modifications.entriesModifications.expandableEntries.length, 1);
    assert.strictEqual(modifications.entriesModifications.hiddenEntries.length, 42);
    assert.deepEqual(modifications.initialBreadcrumb, {
      'window': {'min': 967569605481, 'max': 967573120579, 'range': 3515098},
      'child':
          {'window': {'min': 967569967927.7909, 'max': 967571964564.4985, 'range': 1996636.7076416016}, 'child': null},
    } as TraceEngine.Types.File.Breadcrumb);
  });
});
