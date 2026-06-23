// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as Greendev from '../../greendev/greendev.js';
import {type AiAgent, GreenDevAgent} from '../ai_assistance.js';

describeWithEnvironment('GreenDevAgent', () => {
  it('sends a prompt and gets a response', async () => {
    const agent = new GreenDevAgent.GreenDevAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'Hello from GreenDevAgent',
      }]]),
    });

    const response = await Array.fromAsync(agent.run('Hello', {selected: null}));
    const lastResponse = response.at(-1);
    assert.exists(lastResponse);
    assert.strictEqual(lastResponse.type, 'answer');
    assert.strictEqual((lastResponse as AiAgent.AnswerResponse).text, 'Hello from GreenDevAgent');
  });

  it('is only enabled when beyondStyling prototype is enabled', () => {
    const isEnabledStub = sinon.stub();
    // Stub the `instance` method to avoid instantiating the real `Prototypes`
    // class, which can cause issues in the test environment.
    const instanceStub = sinon.stub(Greendev.Prototypes, 'instance').returns({
      isEnabled: isEnabledStub,
    } as unknown as Greendev.Prototypes);

    try {
      isEnabledStub.withArgs('beyondStylingGemini').returns(true);
      isEnabledStub.withArgs('beyondStylingAntigravity').returns(false);
      assert.isTrue(GreenDevAgent.GreenDevAgent.isEnabled());

      isEnabledStub.withArgs('beyondStylingGemini').returns(false);
      isEnabledStub.withArgs('beyondStylingAntigravity').returns(true);
      assert.isTrue(GreenDevAgent.GreenDevAgent.isEnabled());

      isEnabledStub.withArgs('beyondStylingGemini').returns(false);
      isEnabledStub.withArgs('beyondStylingAntigravity').returns(false);
      assert.isFalse(GreenDevAgent.GreenDevAgent.isEnabled());
    } finally {
      instanceStub.restore();
    }
  });
});
