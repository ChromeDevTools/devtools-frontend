// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';

const {assert} = chai;

describe('NonDomState', () => {
  it('registers, unregisters and returns loggables', () => {
    const parent = {};
    const child = {};
    VisualLogging.NonDomState.registerLoggable(parent, {ve: 1, context: '1'});
    VisualLogging.NonDomState.registerLoggable(child, {ve: 1, context: '2'}, parent);

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomState().loggables, [
      {loggable: parent, config: {ve: 1, context: '1'}, parent: undefined},
      {loggable: child, config: {ve: 1, context: '2'}, parent: parent},
    ]);

    VisualLogging.NonDomState.unregisterLoggable(child);

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomState().loggables, [
      {loggable: parent, config: {ve: 1, context: '1'}, parent: undefined},
    ]);
    VisualLogging.NonDomState.unregisterLoggable(parent);
  });

  it('prevents external changes to the registry', () => {
    const loggable = {};
    VisualLogging.NonDomState.registerLoggable(loggable, {ve: 1, context: '1'});

    const loggables = VisualLogging.NonDomState.getNonDomState().loggables;
    loggables.pop();

    assert.sameDeepMembers(VisualLogging.NonDomState.getNonDomState().loggables, [
      {loggable: loggable, config: {ve: 1, context: '1'}, parent: undefined},
    ]);
    VisualLogging.NonDomState.unregisterLoggable(loggable);
  });
});
