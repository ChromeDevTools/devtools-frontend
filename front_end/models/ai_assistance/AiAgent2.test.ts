// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Host from '../../core/host/host.js';
import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';

import * as AiAssistance from './ai_assistance.js';

function assertIsFunctionResponse(part: Host.AidaClient.Part): asserts part is Host.AidaClient.FunctionResponsePart {
  assert.isTrue('functionResponse' in part);
}

describe('AiAgent2', () => {
  it('can learn a skill', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    // We expect the generated skill file to be available because we built it.
    // If it fails, we might need to mock the import or ensure the build target runs.
    const result = await agent.learnSkill(['styling']);
    assert.isTrue(result.includes('You are a CSS expert'));
    assert.isTrue(agent.activeSkills.has('styling'));
  });

  it('prevents duplicate loading', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await agent.learnSkill(['styling']);
    const result = await agent.learnSkill(['styling']);

    assert.isTrue(result.includes('already loaded'));
  });

  it('handles invalid skill names gracefully', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    // @ts-expect-error
    const result = await agent.learnSkill(['non-existent-skill']);
    assert.isTrue(result.includes('Failed to load skill non-existent-skill'));
    assert.isTrue(result.includes('Valid skills are: styling'));
  });

  it('can run a conversation flow', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: 'This is the answer.',
    }]]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const responses = await Array.fromAsync(agent.run('question', {selected: null}));

    const answerResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.ANSWER);
    assert.isDefined(answerResponse);
    assert.propertyVal(answerResponse, 'text', 'This is the answer.');
  });

  it('handles learning skills correctly (UI step and AIDA response)', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: 'I have learned the styling skill.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const responses = await Array.fromAsync(agent.run('question', {selected: null}));

    // Verify UI step
    const titleResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.TITLE);
    assert.isDefined(titleResponse);
    assert.propertyVal(titleResponse, 'title', 'Learning skills: styling');

    // Verify AIDA response contains skill instructions
    sinon.assert.callCount(aidaClient.doConversation, 2);
    const secondCallArgs = aidaClient.doConversation.getCall(1).args[0];
    const functionResponsePart = secondCallArgs.current_message.parts[0];
    assertIsFunctionResponse(functionResponsePart);
    const functionResponse = functionResponsePart.functionResponse;
    assert.propertyVal(functionResponse, 'name', 'learnSkills');

    const responseObj = functionResponse.response as {result: string};
    assert.property(responseObj, 'result');
    assert.isTrue(responseObj.result.includes('You are a CSS expert'));
  });

  it('injects skills manifest into the query on the first enhanceQuery call only', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const firstQuery = await agent.enhanceQuery('test query');
    assert.isTrue(firstQuery.includes('Available skills:'));
    assert.isTrue(firstQuery.includes('styling: Helping with CSS and styling'));
    assert.isTrue(firstQuery.includes('User query: test query'));

    const secondQuery = await agent.enhanceQuery('second query');
    assert.strictEqual(secondQuery, 'second query');
  });
});
