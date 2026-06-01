// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';

import * as AiAssistance from './ai_assistance.js';

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
});
