// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiHistoryStorage', () => {
  const agent1: AiAssistance.SerializedAgent = {
    id: 'id1',
    type: AiAssistance.AgentType.STYLING,
    history: [],
  };
  const agent2: AiAssistance.SerializedAgent = {
    id: 'id2',
    type: AiAssistance.AgentType.FILE,
    history: [],
  };
  const agent3: AiAssistance.SerializedAgent = {
    id: 'id3',
    type: AiAssistance.AgentType.NETWORK,
    history: [],
  };

  beforeEach(() => {
    let data: Record<string, string> = {};
    const dummyStorage = new Common.Settings.SettingsStorage({}, {
      get(setting) {
        return Promise.resolve(data[setting]);
      },
      set(setting, value) {
        data[setting] = value;
      },
      clear() {
        data = {};
      },
      remove(setting) {
        delete data[setting];
      },
      register(_setting) {},
    });
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });
  });

  function getStorage() {
    return AiAssistance.AiHistoryStorage.instance(true);
  }

  it('should create and retrieve history entry', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    assert.deepEqual(
        storage.getHistory(),
        [{
          id: 'id1',
          type: 'freestyler' as AiAssistance.AgentType,
          history: [],
        }],
    );
    await storage.upsertHistoryEntry(agent2);
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.AgentType,
            history: [],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should update history entries correctly', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry({
      ...agent1,
      history: [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'text',
        },
      ],
    });
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.AgentType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.AgentType,
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
            type: 'freestyler' as AiAssistance.AgentType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.AgentType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should delete a single entry', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry(agent3);
    await storage.deleteHistoryEntry('id2');
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.AgentType,
            history: [

            ],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.AgentType,
            history: [],
          },
        ],
    );
  });

  it('should delete all entries', async () => {
    const storage = getStorage();
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
