// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';

import * as Freestyler from './ai_assistance.js';

describeWithEnvironment('Freestyler.AiHistoryStorage', () => {
  const agent1: Freestyler.SerializedAgent = {
    id: 'id1',
    type: Freestyler.AgentType.STYLING,
    history: [],
  };
  const agent2: Freestyler.SerializedAgent = {
    id: 'id2',
    type: Freestyler.AgentType.FILE,
    history: [],
  };
  const agent3: Freestyler.SerializedAgent = {
    id: 'id3',
    type: Freestyler.AgentType.NETWORK,
    history: [],
  };

  afterEach(() => {
    Freestyler.AiHistoryStorage.instance().clearForTest();
  });

  it('should create and retrieve history entry', async () => {
    const storage = Freestyler.AiHistoryStorage.instance();
    await storage.upsertHistoryEntry(agent1);
    assert.deepEqual(
        storage.getHistory(),
        [{
          id: 'id1',
          type: 'freestyler' as Freestyler.AgentType,
          history: [],
        }],
    );
    await storage.upsertHistoryEntry(agent2);
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as Freestyler.AgentType,
            history: [],
          },
          {
            id: 'id2',
            type: 'drjones-file' as Freestyler.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should update history entries correctly', async () => {
    const storage = Freestyler.AiHistoryStorage.instance();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry({
      ...agent1,
      history: [
        {
          type: Freestyler.ResponseType.USER_QUERY,
          query: 'text',
        },
      ],
    });
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as Freestyler.AgentType,
            history: [
              {
                type: Freestyler.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as Freestyler.AgentType,
            history: [],
          },
        ],
    );

    await storage.upsertHistoryEntry(agent3);
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as Freestyler.AgentType,
            history: [
              {
                type: Freestyler.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as Freestyler.AgentType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as Freestyler.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should delete a single entry', async () => {
    const storage = Freestyler.AiHistoryStorage.instance();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry(agent3);
    await storage.deleteHistoryEntry('id2');
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as Freestyler.AgentType,
            history: [

            ],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as Freestyler.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should delete all entries', async () => {
    const storage = Freestyler.AiHistoryStorage.instance();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry(agent3);
    await storage.deleteAll();
    assert.deepEqual(
        storage.getHistory(),
        [],
    );
  });
});
