// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as AiAssistancePanel from './ai_assistance.js';

describe('Export Conversation as Markdown', () => {
  setupSettingsHooks();
  it('generates a filename based on the query', async () => {
    const fileManager = stubFileManager();
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [
        {
          type: AiAssistanceModel.AiAgent.ResponseType.USER_QUERY,
          query: 'test query',
        },
      ],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([]),
    });

    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    sinon.assert.calledOnce(fileManager.close);
    const expectedSnakeCaseForPrompt = 'test_query';
    const [fileName] = fileManager.save.getCall(0).args;
    assert.strictEqual(fileName, `devtools_${expectedSnakeCaseForPrompt}.md`);
  });

  it('truncates the filename if the prompt is large', async () => {
    const fileManager = stubFileManager();
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [
        {
          type: AiAssistanceModel.AiAgent.ResponseType.USER_QUERY,
          query: 'this is a very long title that should be truncated when exporting the conversation to a file',
        },
      ],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([]),
    });

    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    sinon.assert.calledOnce(fileManager.close);
    const expectedSnakeCaseForPrompt = 'this_is_a_very_long_title_that_should_be_truncated_';
    const [fileName] = fileManager.save.getCall(0).args;
    assert.strictEqual(fileName, `devtools_${expectedSnakeCaseForPrompt}.md`);
  });

  it('saves a markdown representation of the conversation', async () => {
    const fileManager = stubFileManager();
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [
        {
          type: AiAssistanceModel.AiAgent.ResponseType.USER_QUERY,
          query: 'test query',
        },
      ],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([]),
    });

    sinon.stub(conversation, 'getConversationMarkdown').callsFake(() => {
      return 'FAKE CONVERSATION TEXT';
    });

    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    sinon.assert.calledOnce(fileManager.close);
    const [, fileContents] = fileManager.save.getCall(0).args;
    const contents = fileContents as TextUtils.ContentData.ContentData;
    assert.strictEqual(contents.text, 'FAKE CONVERSATION TEXT');
  });

  it('truncates the filename title safely without splitting surrogate pairs or combining characters', async () => {
    const fileManager = stubFileManager();
    // 𠜎 is 2 code units, so prefix (9) + title (50) + suffix (3) = 62.
    // If we have a title of 'a' * 50 + '𠜎' (52 code units), it exceeds maxTitleLength (51).
    // Safe truncation should drop '𠜎' entirely, resulting in 50 'a's (50 code units).
    const longTitle = 'a'.repeat(50) + '𠜎';
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [
        {
          type: AiAssistanceModel.AiAgent.ResponseType.USER_QUERY,
          query: longTitle,
        },
      ],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    const [fileName] = fileManager.save.getCall(0).args;

    const expectedTitle = 'a'.repeat(50);
    assert.strictEqual(fileName, `devtools_${expectedTitle}.md`);
  });
});
