// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiHistoryStorage', () => {
  const agent1: AiAssistance.SerializedConversation = {
    id: 'id1',
    type: AiAssistance.ConversationType.STYLING,
    history: [],
  };
  const agent2: AiAssistance.SerializedConversation = {
    id: 'id2',
    type: AiAssistance.ConversationType.FILE,
    history: [],
  };
  const agent3: AiAssistance.SerializedConversation = {
    id: 'id3',
    type: AiAssistance.ConversationType.NETWORK,
    history: [],
  };
  const agent4: AiAssistance.SerializedConversation = {
    id: 'id4',
    type: AiAssistance.ConversationType.STYLING,
    history: [
      {
        type: AiAssistance.ResponseType.USER_QUERY,
        query: 'text',
        imageId: 'image-id1',
        imageInput: undefined,
      },
      {
        type: AiAssistance.ResponseType.ANSWER,
        text: 'answer',
        complete: true,
      },
      {
        type: AiAssistance.ResponseType.USER_QUERY,
        query: 'text',
        imageId: 'image-id2',
        imageInput: undefined,
      },
    ],
  };
  const serializedImage1: AiAssistance.SerializedImage = {
    id: 'image-id1',
    data: 'imageInput',
    mimeType: 'image/jpeg',
  };
  const serializedImage2: AiAssistance.SerializedImage = {
    id: 'image-id2',
    data: 'imageInput',
    mimeType: 'image/jpeg',
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

  function getStorage(maxStorageSize?: number) {
    return AiAssistance.AiHistoryStorage.instance({forceNew: true, maxStorageSize});
  }

  it('should create and retrieve history entry', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    assert.deepEqual(
        storage.getHistory(),
        [{
          id: 'id1',
          type: 'freestyler' as AiAssistance.ConversationType,
          history: [],
        }],
    );
    await storage.upsertHistoryEntry(agent2);
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
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
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
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
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
          },
        ],
    );
    assert.deepEqual(
        storage.getImageHistory(),
        [],
    );

    await storage.upsertImage(serializedImage1);
    await storage.upsertImage(serializedImage2);
    await storage.upsertHistoryEntry(agent4);
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
              },
            ],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id4',
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
                imageId: 'image-id1',
                imageInput: undefined,
              },
              {
                type: AiAssistance.ResponseType.ANSWER,
                text: 'answer',
                complete: true,
              },
              {
                type: AiAssistance.ResponseType.USER_QUERY,
                query: 'text',
                imageId: 'image-id2',
                imageInput: undefined,
              },
            ],
          },
        ],
    );
    assert.deepEqual(
        storage.getImageHistory(),
        [
          {
            id: 'image-id1',
            data: 'imageInput',
            mimeType: 'image/jpeg',
          },
          {
            id: 'image-id2',
            data: 'imageInput',
            mimeType: 'image/jpeg',
          }
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
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
          },
        ],
    );
  });

  it('should delete image history entry', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry(agent3);
    await storage.upsertImage(serializedImage1);
    await storage.upsertImage(serializedImage2);
    await storage.upsertHistoryEntry(agent4);
    await storage.deleteHistoryEntry('id4');
    assert.deepEqual(
        storage.getHistory(),
        [
          {
            id: 'id1',
            type: 'freestyler' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
          },
        ],
    );
    assert.deepEqual(
        storage.getImageHistory(),
        [],
    );
  });

  it('should delete all entries', async () => {
    const storage = getStorage();
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertHistoryEntry(agent3);
    await storage.upsertImage(serializedImage1);
    await storage.upsertImage(serializedImage2);
    await storage.upsertHistoryEntry(agent4);
    await storage.deleteAll();
    assert.deepEqual(
        storage.getHistory(),
        [],
    );
    assert.deepEqual(
        storage.getImageHistory(),
        [],
    );
  });

  it('should limit the amount of stored images', async () => {
    const storage = getStorage(2);

    await storage.upsertImage({
      id: 'image-id1',
      data: '1',
      mimeType: 'image/jpeg',
    });
    await storage.upsertHistoryEntry(agent1);
    await storage.upsertImage({
      id: 'image-id2',
      data: '2',
      mimeType: 'image/jpeg',
    });
    await storage.upsertImage({
      id: 'image-id3',
      data: '3',
      mimeType: 'image/jpeg',
    });
    await storage.upsertHistoryEntry(agent2);
    await storage.upsertImage({
      id: 'image-id4',
      data: '4',
      mimeType: 'image/jpeg',
    });
    await storage.upsertHistoryEntry(agent3);
    const imageHistory = storage.getImageHistory();
    const imageData1 = imageHistory.find(item => item.id === 'image-id1');
    const imageData2 = imageHistory.find(item => item.id === 'image-id2');
    const imageData3 = imageHistory.find(item => item.id === 'image-id3');
    const imageData4 = imageHistory.find(item => item.id === 'image-id4');

    assert.notExists(imageData1);
    assert.notExists(imageData2);
    assert.deepEqual(imageData3, {
      id: 'image-id3',
      data: '3',
      mimeType: 'image/jpeg',
    });
    assert.deepEqual(imageData4, {
      id: 'image-id4',
      data: '4',
      mimeType: 'image/jpeg',
    });
  });
});
