// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from './visual_logging-testing.js';

describe('NonDomState', () => {
  it('registers, unregisters and returns loggables', () => {
    const parent = {};
    const child = {};
    const size = new DOMRect(0, 0, 100, 100);
    VisualLogging.NonDomState.registerLoggable(parent, {ve: 1, context: '1'});
    VisualLogging.NonDomState.registerLoggable(child, {ve: 1, context: '2'}, parent, size);

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(), [
      {loggable: parent, config: {ve: 1, context: '1'}, parent: undefined, size: undefined},
    ]);
    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(parent), [
      {loggable: child, config: {ve: 1, context: '2'}, parent, size},
    ]);

    VisualLogging.NonDomState.unregisterLoggables(parent);

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(parent), []);
    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(), [
      {loggable: parent, config: {ve: 1, context: '1'}, parent: undefined, size: undefined},
    ]);
    VisualLogging.NonDomState.unregisterLoggables();
    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(), []);
  });

  it('prevents external changes to the registry', () => {
    const loggable = {};
    VisualLogging.NonDomState.registerLoggable(loggable, {ve: 1, context: '1'});

    const loggables = VisualLogging.NonDomState.getNonDomLoggables();
    loggables.pop();

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomLoggables(), [
      {loggable, config: {ve: 1, context: '1'}, parent: undefined, size: undefined},
    ]);
    VisualLogging.NonDomState.unregisterLoggables();
  });
});
