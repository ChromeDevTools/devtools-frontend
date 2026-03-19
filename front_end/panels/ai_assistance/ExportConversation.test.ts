// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';

import * as AiAssistancePanel from './ai_assistance.js';

describeWithEnvironment('Export Conversation as Markdown', () => {
  it('generates a filename based on the query', async () => {
    const fileManager = stubFileManager();
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    await Array.fromAsync(conversation.run('test query'));
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
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    await Array.fromAsync(conversation.run(
        'this is a very long title that should be truncated when exporting the conversation to a file'));
    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    sinon.assert.calledOnce(fileManager.close);
    const expectedSnakeCaseForPrompt = 'this_is_a_very_long_title_that_should_be_truncated_w';
    const [fileName] = fileManager.save.getCall(0).args;
    assert.strictEqual(fileName, `devtools_${expectedSnakeCaseForPrompt}.md`);
  });

  it('saves a markdown representation of the conversation', async () => {
    const fileManager = stubFileManager();
    const conversation = new AiAssistanceModel.AiConversation.AiConversation({
      type: AiAssistanceModel.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    sinon.stub(conversation, 'getConversationMarkdown').callsFake(() => {
      return 'FAKE CONVERSATION TEXT';
    });

    await Array.fromAsync(conversation.run('test query'));
    await AiAssistancePanel.ExportConversation.saveToDisk(conversation);
    sinon.assert.calledOnce(fileManager.save);
    sinon.assert.calledOnce(fileManager.close);
    const [, fileContents] = fileManager.save.getCall(0).args;
    const contents = fileContents as TextUtils.ContentData.ContentData;
    assert.strictEqual(contents.text, 'FAKE CONVERSATION TEXT');
  });
});
