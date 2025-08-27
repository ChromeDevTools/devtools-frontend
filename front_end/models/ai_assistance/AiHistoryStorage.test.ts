// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {SnapshotTester} from '../../testing/SnapshotTester.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiHistoryStorage', () => {
  const agent1: AiAssistance.SerializedConversation = {
    id: 'id1',
    type: AiAssistance.ConversationType.STYLING,
    history: [],
    isExternal: false,
  };
  const agent2: AiAssistance.SerializedConversation = {
    id: 'id2',
    type: AiAssistance.ConversationType.FILE,
    history: [],
    isExternal: false,
  };
  const agent3: AiAssistance.SerializedConversation = {
    id: 'id3',
    type: AiAssistance.ConversationType.NETWORK,
    history: [],
    isExternal: false,
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
    isExternal: false,
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
          isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
            isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
            isExternal: false,
          },
          {
            id: 'id2',
            type: 'drjones-file' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
          },
          {
            id: 'id3',
            type: 'drjones-network-request' as AiAssistance.ConversationType,
            history: [],
            isExternal: false,
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
    const historyDeletedPromise = storage.once('AiHistoryDeleted' as AiAssistance.Events.HISTORY_DELETED);
    await storage.deleteAll();
    assert.deepEqual(
        storage.getHistory(),
        [],
    );
    assert.deepEqual(
        storage.getImageHistory(),
        [],
    );
    await historyDeletedPromise;
  });

  it('should limit the amount of stored images', async () => {
    const MAX_STORAGE_SIZE = 2;
    const storage = getStorage(MAX_STORAGE_SIZE);

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

  describe('Conversation', () => {
    describe('title', () => {
      it('should return undefined if there is not USER_QUERY entry in history', () => {
        const conversation = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, []);

        assert.isUndefined(conversation.title);
      });

      it('should return full title if the first USER_QUERY is less than 80 characters', () => {
        const conversation = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [{
                                                             type: AiAssistance.ResponseType.USER_QUERY,
                                                             query: 'this is less than 80',
                                                           }]);

        assert.strictEqual(conversation.title, 'this is less than 80');
      });

      it('should return first 80 characters of the title with ellipis if the first USER_QUERY is more than 80 characters',
         () => {
           const conversation = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [
             {
               type: AiAssistance.ResponseType.USER_QUERY,
               query:
                   'this is more than 80 characters because I\'m just going to keep typing words and words and words until it\'s really, really long, see?',
             }
           ]);

           assert.strictEqual(
               conversation.title,
               'this is more than 80 characters because I\'m just going to keep typing words and …');
         });
    });

    describe('addHistoryItem', () => {
      const historyItem1: AiAssistance.ResponseData = {
        type: AiAssistance.ResponseType.USER_QUERY,
        query: 'text',
        imageInput: {
          inlineData: {
            data: '1',
            mimeType: 'image/jpeg',
          }
        },
        imageId: 'image-id1',
      };
      const historyItem2: AiAssistance.ResponseData = {
        type: AiAssistance.ResponseType.USER_QUERY,
        query: 'text',
        imageInput: {
          inlineData: {
            data: '2',
            mimeType: 'image/jpeg',
          }
        },
        imageId: 'image-id2',
      };

      it('should store images and text conversation separately', async () => {
        const storage = getStorage();
        sinon.stub(AiAssistance.AiHistoryStorage, 'instance').returns(storage);
        const conversation1 = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [], 'id1', false);
        await conversation1.addHistoryItem(historyItem1);
        const conversation2 = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [], 'id2', false);
        await conversation2.addHistoryItem(historyItem2);

        const imageHistory = storage.getImageHistory();
        assert.lengthOf(imageHistory, 2);
        assert.deepEqual(imageHistory[0], {
          id: 'image-id1',
          data: '1',
          mimeType: 'image/jpeg',
        });
        assert.deepEqual(imageHistory[1], {
          id: 'image-id2',
          data: '2',
          mimeType: 'image/jpeg',
        });

        const historyWithoutImages = storage.getHistory();
        assert.lengthOf(historyWithoutImages, 2);
        assert.deepEqual(historyWithoutImages[0], {
          id: 'id1',
          type: AiAssistance.ConversationType.STYLING,
          history: [{
            type: AiAssistance.ResponseType.USER_QUERY,
            query: 'text',
            imageId: 'image-id1',
          }],
          isExternal: false,
        });
        assert.deepEqual(historyWithoutImages[1], {
          id: 'id2',
          type: AiAssistance.ConversationType.STYLING,
          history: [{
            type: AiAssistance.ResponseType.USER_QUERY,
            query: 'text',
            imageInput: undefined,
            imageId: 'image-id2',
          }],
          isExternal: false,
        });
      });

      it('should have empty image data for image not present in history', async () => {
        const MAX_STORAGE_SIZE = 1;
        const storage = getStorage(MAX_STORAGE_SIZE);
        sinon.stub(AiAssistance.AiHistoryStorage, 'instance').returns(storage);
        const conversation1 = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [], 'id1', false);
        await conversation1.addHistoryItem(historyItem1);
        const conversation2 = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, [], 'id2', false);
        await conversation2.addHistoryItem(historyItem2);

        const imageHistory = storage.getImageHistory();
        assert.lengthOf(imageHistory, 1);
        const historyWithoutImages = storage.getHistory();
        assert.lengthOf(historyWithoutImages, 2);
        const conversationFromHistory =
            historyWithoutImages.map(item => AiAssistance.Conversation.fromSerializedConversation(item));
        assert.lengthOf(conversationFromHistory, 2);
        assert.deepEqual(conversationFromHistory[0].history, [{
                           type: AiAssistance.ResponseType.USER_QUERY,
                           query: 'text',
                           imageInput: {
                             inlineData: {
                               data: AiAssistance.NOT_FOUND_IMAGE_DATA,
                               mimeType: 'image/jpeg',
                             }
                           },
                           imageId: 'image-id1',
                         }]);
        assert.deepEqual(conversationFromHistory[1].history, [{
                           type: AiAssistance.ResponseType.USER_QUERY,
                           query: 'text',
                           imageInput: {
                             inlineData: {
                               data: '2',
                               mimeType: 'image/jpeg',
                             }
                           },
                           imageId: 'image-id2',
                         }]);
      });
    });
  });

  describe('getConversationMarkdown', () => {
    let snapshotTester: SnapshotTester;
    before(async () => {
      snapshotTester = new SnapshotTester(import.meta);
      await snapshotTester.load();
    });

    after(async () => {
      await snapshotTester.finish();
    });

    it('should generate markdown from a conversation', function() {
      const fakeTime = new Date('2024-01-01T00:00:00.000Z');
      const clock = sinon.useFakeTimers(fakeTime);

      const history: AiAssistance.ResponseData[] = [
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'What is the color of the sky?',
        },
        {
          type: AiAssistance.ResponseType.CONTEXT,
          title: 'Analyzing context',
          details: [
            {title: 'Detail 1', text: 'Some detail'},
            {title: 'Detail 2', text: 'const a = 1;', codeLang: 'js'},
          ],
        },
        {
          type: AiAssistance.ResponseType.TITLE,
          title: 'Thinking about it',
        },
        {
          type: AiAssistance.ResponseType.THOUGHT,
          thought: 'The user is asking about colors.',
        },
        {
          type: AiAssistance.ResponseType.ACTION,
          code: 'console.log("blue")',
          output: 'blue',
          canceled: false,
        },
        {
          type: AiAssistance.ResponseType.ACTION,
          code: 'console.log("red")',
          output: 'Error: User denied code execution with side effects',
          canceled: true,
        },
        {
          type: AiAssistance.ResponseType.ACTION,
          code: 'console.log("no output")',
          canceled: false,
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'The sky is blue.',
          complete: true,
        },
        {
          type: AiAssistance.ResponseType.USER_QUERY,
          query: 'And what about this image?',
          imageInput: {inlineData: {data: 'test', mimeType: 'image/png'}},
        },
        {
          type: AiAssistance.ResponseType.ANSWER,
          text: 'This image contains a red apple.',
          complete: true,
        },
      ];
      const conversation = new AiAssistance.Conversation(AiAssistance.ConversationType.STYLING, history);
      const markdown = conversation.getConversationMarkdown();

      snapshotTester.assert(this, markdown);
      clock.restore();
    });
  });
});
