// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import type * as LHModel from '../lighthouse/lighthouse.js';
import type * as Trace from '../trace/trace.js';

import * as AiAssistance from './ai_assistance.js';
// TODO(nvitkov): crbug.com/468942591 Fix the target for this import
import type {Skill, SkillName} from './skills/Skill.js';
import {SKILLS} from './skills/SkillRegistry.js';

function assertIsFunctionResponse(part: Host.AidaClient.Part): asserts part is Host.AidaClient.FunctionResponsePart {
  assert.isTrue('functionResponse' in part);
}

function getFunctionDeclarations(
    aidaClient: sinon.SinonStubbedInstance<Host.AidaClient.AidaClient>,
    callIndex: number,
    ): Host.AidaClient.FunctionDeclaration[] {
  sinon.assert.callCount(aidaClient.doConversation, callIndex + 1);
  const callArgs = aidaClient.doConversation.getCall(callIndex).args[0];
  return callArgs.function_declarations ?? [];
}

/**
 * Helper to mock the skills registry for an agent.
 * Since the agent expects a full `Record<SkillName, Skill>`, but individual tests only
 * need to mock a subset of skills, we use this helper to cast a partial set of skills
 * to the full record type and assign it to the agent. This prevents tests from
 * breaking when new skills are added to the global registry.
 */
function mockSkills(agent: AiAssistance.AiAgent2.AiAgent2, skills: Partial<Record<SkillName, Skill>>): void {
  agent.getSkills = () => skills as unknown as Record<SkillName, Skill>;
}

describeWithEnvironment('AiAgent2', () => {
  it('registers all expected skills', () => {
    assert.deepEqual(Object.keys(SKILLS).sort(),
                     ['styling', 'network', 'accessibility', 'performance', 'storage', 'sources'].sort());
  });

  it('accepts changeManager in options and passes it to tools', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'executeJavaScript', args: {action: 'console.log(1)'}}],
      }],
      [{
        explanation: 'Done',
      }],
    ]);
    const changeManager = new AiAssistance.ChangeManager.ChangeManager();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, changeManager});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.changeManager, changeManager);
  });

  it('can learn a skill', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    // We expect the generated skill file to be available because we built it.
    // If it fails, we might need to mock the import or ensure the build target runs.
    const result = await agent.learnSkill(['styling']);
    assert.isTrue(result.includes(SKILLS.styling.instructions));
    assert.isTrue(agent.activeSkills.has('styling'));
  });

  it('prevents duplicate loading', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await agent.learnSkill(['styling']);
    const result = await agent.learnSkill(['styling']);

    assert.strictEqual(
        result,
        'Error: Skill \'styling\' is already loaded. Call its tools directly instead of invoking learnSkills for \'styling\' again.');
  });

  it('handles invalid skill names gracefully', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    mockSkills(agent, {
      styling: SKILLS.styling,
    });

    // @ts-expect-error
    const result = await agent.learnSkill(['non-existent-skill']);
    assert.strictEqual(result, 'Failed to load skill non-existent-skill. Valid skills are: styling.');
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

    sinon.assert.callCount(aidaClient.doConversation, 1);
    const callArgs = aidaClient.doConversation.getCall(0).args[0];
    assert.propertyVal(callArgs, 'client_feature', Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT);
  });

  it('parses and yields follow-up suggestions from model response', async () => {
    const aidaClient = mockAidaClient([[{
      explanation:
          'Root Cause: CSS error\n\nSuggestion: Fix layout\nSUGGESTIONS: ["Can you fix this?", "Explain why this happens"]',
    }]]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const responses = await Array.fromAsync(agent.run('question', {selected: null}));

    const answerResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.ANSWER);
    assert.isDefined(answerResponse);
    assert.strictEqual(answerResponse.text, 'Root Cause: CSS error\n\nSuggestion: Fix layout');
    assert.deepEqual(answerResponse.suggestions, ['Can you fix this?', 'Explain why this happens']);
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
    assert.propertyVal(titleResponse, 'title', 'Learning skill: CSS and styling');

    const actionResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.isDefined(actionResponse);
    assert.propertyVal(actionResponse, 'code', 'learnSkills(\'styling\')');

    // Verify AIDA response contains skill instructions
    sinon.assert.callCount(aidaClient.doConversation, 2);
    const secondCallArgs = aidaClient.doConversation.getCall(1).args[0];
    const functionResponsePart = secondCallArgs.current_message.parts[0];
    assertIsFunctionResponse(functionResponsePart);
    const functionResponse = functionResponsePart.functionResponse;
    assert.propertyVal(functionResponse, 'name', 'learnSkills');

    const responseObj = functionResponse.response as {result: string};
    assert.property(responseObj, 'result');
    assert.isTrue(responseObj.result.includes(SKILLS.styling.instructions));
  });

  it('injects skills manifest containing only unloaded skills', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    mockSkills(agent, {
      styling: SKILLS.styling,
      network: SKILLS.network,
    });

    // Initially, styling and network are not loaded
    const firstQuery = await agent.enhanceQuery('test query');
    assert.isTrue(firstQuery.includes('Available skills that are not yet loaded:'));
    assert.isTrue(firstQuery.includes(
        'styling: CSS, styling, layouts, positioning, computed styles, DOM tree structure, and page styles.'));
    assert.isTrue(firstQuery.includes(
        'network: Analyzing network traffic, network requests, HTTP/HTTPS headers, status codes, payload details, timing/performance, and request sizes.'));
    assert.isTrue(firstQuery.includes('User query: test query'));

    // Load 'styling' skill
    await agent.learnSkill(['styling']);

    // Now, only 'network' skill is unloaded and should be injected
    const secondQuery = await agent.enhanceQuery('second query');
    assert.isTrue(secondQuery.includes('Available skills that are not yet loaded:'));
    assert.isFalse(secondQuery.includes('styling:'));
    assert.isTrue(secondQuery.includes(
        'network: Analyzing network traffic, network requests, HTTP/HTTPS headers, status codes, payload details, timing/performance, and request sizes.'));
    assert.isTrue(secondQuery.includes('User query: second query'));

    // Load 'network' skill
    await agent.learnSkill(['network']);

    // Now all skills are loaded, manifest should NOT be injected
    const thirdQuery = await agent.enhanceQuery('third query');
    assert.strictEqual(thirdQuery, 'third query');
  });

  it('registers allowed tools of a skill dynamically upon learning', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: 'I have learned the styling skill and getStyles is now available.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await Array.fromAsync(agent.run('question', {selected: null}));

    // In the second call, getStyles should be registered as a function declaration
    const declarations = getFunctionDeclarations(aidaClient, 1);
    assert.exists(declarations.find(d => d.name === 'getStyles'));
  });

  it('delegates to the registered tool handler when invoked', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: 'Now I will call getStyles',
        functionCalls: [{name: 'getStyles', args: {elements: [1], styleProperties: ['color'], explanation: 'testing'}}],
      }],
      [{
        explanation: 'Styling analyzed.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const getStylesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getStyles');
    assert.exists(getStylesTool);
    const handlerStub = sinon.stub(getStylesTool, 'handler').resolves({result: 'mocked style result'});

    const responses = await Array.fromAsync(agent.run('question', {selected: null}));

    // Verify that handler was called
    sinon.assert.calledOnce(handlerStub);
    const [args, context] = handlerStub.getCall(0).args;
    assert.deepEqual(args, {elements: [1], styleProperties: ['color'], explanation: 'testing'});
    assert.isNull(context.conversationContext);

    // Verify AIDA response included tool output
    const hasTitle = responses.some(
        r => r.type === AiAssistance.AiAgent.ResponseType.TITLE && r.title === 'Reading computed and source styles');
    assert.isTrue(hasTitle);
  });

  it('prevents duplicate tool declarations if multiple learned skills share the same tool', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    // Override getSkills to include the dummy skill for testing
    const dummySkill = {
      name: 'dummy' as SkillName,
      description: 'A dummy skill for testing',
      allowedTools: ['getStyles'],
      instructions: 'Dummy instructions.',
    };
    mockSkills(agent, {
      styling: SKILLS.styling,
      [dummySkill.name]: dummySkill,
    });

    // Learn both skills. It should not throw a duplicate function declaration error.
    await agent.learnSkill(['styling', 'dummy' as SkillName]);
    assert.isTrue(agent.activeSkills.has('styling'));
    assert.isTrue(agent.activeSkills.has('dummy' as SkillName));
  });

  it('enhances the query with the selected element description', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: 'Answer',
    }]]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    sinon.stub(nodeContext, 'getPromptDetails').resolves('# Inspected element\n\nelement-description');

    const enhancedQuery = await agent.enhanceQuery('my query', nodeContext);

    assert.isTrue(
        enhancedQuery.includes('# Inspected element\n\nelement-description\n\n# User request\n\nQUERY: my query'));
  });

  it('yields the selected element description in handleContextDetails', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    sinon.stub(nodeContext, 'getUserFacingDetails').resolves([{
      title: 'Data used',
      text: 'element-description',
    }]);

    const responses = await Array.fromAsync(agent.handleContextDetails(nodeContext));

    const contextResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.CONTEXT);
    assert.exists(contextResponse);
    assert.deepEqual(contextResponse?.details, [{
                       title: 'Data used',
                       text: 'element-description',
                     }]);
    assert.isUndefined(contextResponse?.widgets);
  });

  it('yields context widgets in handleContextDetails if available', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    sinon.stub(nodeContext, 'getUserFacingDetails').resolves([{
      title: 'Data used',
      text: 'element-description',
    }]);
    const fakeWidget: AiAssistance.AiAgent.AiWidget = {
      name: 'CORE_VITALS',
      data: {
        parsedTrace: {} as Trace.TraceModel.ParsedTrace,
        insightSetKey: 'set-1',
      },
    };
    sinon.stub(nodeContext, 'getWidgets').resolves([fakeWidget]);

    const responses = await Array.fromAsync(agent.handleContextDetails(nodeContext));

    const contextResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.CONTEXT);
    assert.exists(contextResponse);
    assert.deepEqual(contextResponse?.details, [{
                       title: 'Data used',
                       text: 'element-description',
                     }]);
    assert.deepEqual(contextResponse?.widgets, [fakeWidget]);
  });

  it('handles invalid skill names with overridden skills gracefully', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const dummySkill = {
      name: 'dummy' as SkillName,
      description: 'A dummy skill for testing',
      allowedTools: ['getStyles'],
      instructions: 'Dummy instructions.',
    };
    mockSkills(agent, {
      styling: SKILLS.styling,
      network: SKILLS.network,
      [dummySkill.name]: dummySkill,
    });

    // @ts-expect-error
    const result = await agent.learnSkill(['non-existent-skill']);
    assert.isTrue(result.includes('Failed to load skill non-existent-skill'));
    assert.isTrue(result.includes('Valid skills are: styling, network, dummy'));
  });

  it('injects overridden skills manifest into the query', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const dummySkill = {
      name: 'dummy' as SkillName,
      description: 'A dummy skill for testing',
      allowedTools: ['getStyles'],
      instructions: 'Dummy instructions.',
    };
    mockSkills(agent, {
      styling: SKILLS.styling,
      [dummySkill.name]: dummySkill,
    });

    const firstQuery = await agent.enhanceQuery('test query');
    assert.isTrue(firstQuery.includes('Available skills that are not yet loaded:'));
    assert.isTrue(firstQuery.includes(
        'styling: CSS, styling, layouts, positioning, computed styles, DOM tree structure, and page styles.'));
    assert.isTrue(firstQuery.includes('dummy: A dummy skill for testing'));
    assert.isTrue(firstQuery.includes('User query: test query'));
  });

  it('supports tools with side-effect approval flow (e.g. executeJavaScript)', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: 'I will run JS code',
        functionCalls: [{
          name: 'executeJavaScript',
          args: {code: '$0.style.color = "red"', explanation: 'changing color', title: 'change color'},
        }],
      }],
      [{
        explanation: 'Style changed successfully.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler');
    handlerStub.onFirstCall().resolves(
        {requiresApproval: true, description: 'This code may modify page content. Continue?'});
    handlerStub.onSecondCall().resolves({result: 'success'});

    const responses: AiAssistance.AiAgent.ResponseData[] = [];
    const runGenerator = agent.run('question', {selected: null});

    // Run until we hit the side effect approval
    let next = await runGenerator.next();
    while (!next.done) {
      const response = next.value;
      responses.push(response);
      if (response.type === AiAssistance.AiAgent.ResponseType.SIDE_EFFECT) {
        // Simulate user confirming the side effect
        response.confirm(true);
      }
      next = await runGenerator.next();
    }

    // Verify that handler was called twice: once for side-effect check, once for actual execution
    sinon.assert.calledTwice(handlerStub);

    // Verify first call didn't have approved: true
    const firstCallOpts = handlerStub.getCall(0).args[2];
    assert.isUndefined(firstCallOpts?.approved);

    // Verify second call had approved: true
    const secondCallOpts = handlerStub.getCall(1).args[2];
    assert.propertyVal(secondCallOpts, 'approved', true);

    // Verify final responses contain the side-effect and action result
    const sideEffectResponse = responses.find(r => r.type === AiAssistance.AiAgent.ResponseType.SIDE_EFFECT);
    assert.isDefined(sideEffectResponse);

    const actionResponses = responses.filter(r => r.type === AiAssistance.AiAgent.ResponseType.ACTION);
    assert.lengthOf(actionResponses, 3);
    assert.propertyVal(actionResponses[0], 'code', 'learnSkills(\'styling\')');
    assert.propertyVal(actionResponses[1], 'code', '$0.style.color = "red"');
    assert.isUndefined(actionResponses[1].output);
    assert.propertyVal(actionResponses[2], 'code', '$0.style.color = "red"');
    assert.propertyVal(actionResponses[2], 'output', 'success');
  });

  it('updates the learnSkills description dynamically to list only unloaded skills', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
      }],
      [{
        explanation: 'I will load network now.',
        functionCalls: [{name: 'learnSkills', args: {skills: ['network']}}],
      }],
      [{
        explanation: 'Everything is loaded.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.callCount(aidaClient.doConversation, 3);

    // Verify first call declarations: both styling and network are unloaded
    const firstCallDeclarations = aidaClient.doConversation.getCall(0).args[0].function_declarations ?? [];
    const firstLearnSkills = firstCallDeclarations.find(d => d.name === 'learnSkills');
    assert.exists(firstLearnSkills);
    assert.isTrue(firstLearnSkills?.description.includes('styling'));
    assert.isTrue(firstLearnSkills?.description.includes('network'));

    // Verify second call declarations: styling is loaded, only network is unloaded
    const secondCallDeclarations = aidaClient.doConversation.getCall(1).args[0].function_declarations ?? [];
    const secondLearnSkills = secondCallDeclarations.find(d => d.name === 'learnSkills');
    assert.exists(secondLearnSkills);
    assert.isFalse(secondLearnSkills?.description.includes('styling'));
    assert.isTrue(secondLearnSkills?.description.includes('network'));

    // Verify third call declarations: both styling and network are loaded, none should be in description
    const thirdCallDeclarations = aidaClient.doConversation.getCall(2).args[0].function_declarations ?? [];
    const thirdLearnSkills = thirdCallDeclarations.find(d => d.name === 'learnSkills');
    assert.exists(thirdLearnSkills);
    assert.isFalse(thirdLearnSkills?.description.includes('styling'));
    assert.isFalse(thirdLearnSkills?.description.includes('network'));
  });

  it('falls back to document body for getExecutionContextNode when context is not DOMNodeContext', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    const mockBodyNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    mockDocument.body = mockBodyNode;
    sinon.stub(domModel, 'existingDocument').returns(mockDocument);

    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'executeJavaScript', args: {action: 'console.log(1)'}}],
      }],
      [{
        explanation: 'Done',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.getExecutionContextNode(), mockBodyNode);
  });

  it('pushes body node to frontend during preRun when body is missing', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.body = null;
    sinon.stub(domModel, 'existingDocument').returns(mockDocument);
    const pushStub = sinon.stub(domModel, 'pushNodeByPathToFrontend').resolves(null);

    const aidaClient = mockAidaClient([[{explanation: 'Done'}]]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnceWithExactly(pushStub, '1,HTML,1,BODY');
  });

  it('returns null for getExecutionContextNode when body is absent and does not return document', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.body = null;
    sinon.stub(domModel, 'existingDocument').returns(mockDocument);

    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'executeJavaScript', args: {action: 'console.log(1)'}}],
      }],
      [{
        explanation: 'Done',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getExecutionContextNode());
  });

  it('creates ExtensionScope using document body when context is not DOMNodeContext', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    const mockBodyNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    mockBodyNode.domModel.returns(domModel);
    mockDocument.body = mockBodyNode;
    sinon.stub(domModel, 'existingDocument').returns(mockDocument);

    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'executeJavaScript', args: {action: 'console.log(1)'}}],
      }],
      [{
        explanation: 'Done',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    const scope = context.createExtensionScope(new AiAssistance.ChangeManager.ChangeManager());
    assert.exists(scope);
  });

  it('can learn storage skill and declare storage and cookie tools', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['storage']}}],
      }],
      [{
        explanation: 'Storage skill learned.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.callCount(aidaClient.doConversation, 2);
    const postLearnDeclarations = aidaClient.doConversation.getCall(1).args[0].function_declarations ?? [];
    const declaredNames = postLearnDeclarations.map(d => d.name);

    assert.include(declaredNames, 'listPageOrigins');
    assert.include(declaredNames, 'listStorageKeys');
    assert.include(declaredNames, 'getStorageValues');
    assert.include(declaredNames, 'listCookies');
    assert.include(declaredNames, 'getCookieValues');
  });

  it('disables server logging when calling storage tools in AiAgent2', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['storage']}}],
      }],
      [{
        explanation: 'I will list keys',
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origins: ['https://example.com']}}],
      }],
      [{
        explanation: 'Keys listed.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const listStorageKeysTool = AiAssistance.ToolRegistry.ToolRegistry.get('listStorageKeys');
    assert.exists(listStorageKeysTool);
    const handlerStub = sinon.stub(listStorageKeysTool, 'handler').callsFake(async (_args, context) => {
      context.disableLogging();
      return {result: {storageKeysByOrigin: {}}};
    });

    await Array.fromAsync(agent.run('list keys', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    sinon.assert.callCount(aidaClient.doConversation, 3);
    const thirdCallArgs = aidaClient.doConversation.getCall(2).args[0];
    assert.isTrue(thirdCallArgs.metadata?.disable_user_content_logging);
  });

  it('handles getCookieValues approval flow in AiAgent2', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['storage']}}],
      }],
      [{
        explanation: 'Getting cookie values',
        functionCalls: [{
          name: 'getCookieValues',
          args: {cookieNames: ['session'], origins: ['https://example.com']},
        }],
      }],
      [{
        explanation: 'Cookie values retrieved.',
      }],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      confirmSideEffectForTest: sinon.stub().returns(sideEffectPromise),
    });

    const getCookieValuesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getCookieValues');
    assert.exists(getCookieValuesTool);
    const handlerStub = sinon.stub(getCookieValuesTool, 'handler').callsFake(async (_args, context, options) => {
      context.disableLogging();
      if (options?.approved !== true) {
        return {
          requiresApproval: true,
          description: 'The AI wants to access cookie session on https://example.com.',
        };
      }
      return {result: {cookiesByOrigin: {'https://example.com': {cookies: []}}}};
    });

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get cookie session', {selected: null}));

    sinon.assert.calledTwice(handlerStub);
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 3);
    assert.strictEqual(actionResponses[0].code, 'learnSkills(\'storage\')');
    assert.strictEqual(actionResponses[1].code, 'getCookieValues(["session"], ["https://example.com"])');
    assert.isUndefined(actionResponses[1].output);
    assert.strictEqual(actionResponses[2].code, 'getCookieValues(["session"], ["https://example.com"])');
    assert.exists(actionResponses[2].output);
  });

  it('provides getLighthouseReport capability to GetLighthouseAuditsTool', async () => {
    const mockReport = {
      finalDisplayedUrl: 'https://example.com',
      categories: {},
      audits: {},
    } as unknown as LHModel.ReporterTypes.ReportJSON;
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'getLighthouseAudits', args: {categoryId: 'accessibility'}}],
      }],
      [{
        explanation: 'Audits retrieved.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});
    const accessibilityContext = new AiAssistance.AccessibilityContext.AccessibilityContext(mockReport);

    const getLighthouseAuditsTool = AiAssistance.ToolRegistry.ToolRegistry.get('getLighthouseAudits');
    assert.exists(getLighthouseAuditsTool);
    const handlerStub = sinon.stub(getLighthouseAuditsTool, 'handler').resolves({result: {audits: 'mock audits'}});

    await Array.fromAsync(agent.run('query', {selected: accessibilityContext}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.getLighthouseReport(), mockReport);
  });

  it('provides runLighthouse capability to RunLighthouseTool', async () => {
    const mockReport = {
      finalDisplayedUrl: 'https://example.com',
      categories: {},
      audits: {},
    } as unknown as LHModel.ReporterTypes.ReportJSON;
    const runLighthouseStub = sinon.stub().resolves(mockReport);
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'runLighthouse', args: {explanation: 'run', category: 'accessibility'}}],
      }],
      [{
        explanation: 'Audits run.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, lighthouseRecording: runLighthouseStub});

    const runLighthouseTool = AiAssistance.ToolRegistry.ToolRegistry.get('runLighthouse');
    assert.exists(runLighthouseTool);
    const handlerStub = sinon.stub(runLighthouseTool, 'handler').resolves({result: {audits: 'mock audits'}});

    await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    const runResult = await context.runLighthouse();
    assert.strictEqual(runResult, mockReport);
    sinon.assert.calledOnce(runLighthouseStub);
  });

  it('returns null for getLighthouseReport when context is not AccessibilityContext', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'getLighthouseAudits', args: {categoryId: 'accessibility'}}],
      }],
      [{
        explanation: 'Done.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const getLighthouseAuditsTool = AiAssistance.ToolRegistry.ToolRegistry.get('getLighthouseAudits');
    assert.exists(getLighthouseAuditsTool);
    const handlerStub = sinon.stub(getLighthouseAuditsTool, 'handler').resolves({result: {audits: 'mock audits'}});

    await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getLighthouseReport());
  });

  it('provides getPerformanceTraceContext capability to performance tools', async () => {
    const traceContext = sinon.createStubInstance(AiAssistance.PerformanceTraceContext.PerformanceTraceContext);
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['performance']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'getDetailedCallTree', args: {eventKey: 'key-1'}}],
      }],
      [{
        explanation: 'Call tree retrieved.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const getDetailedCallTreeTool = AiAssistance.ToolRegistry.ToolRegistry.get('getDetailedCallTree');
    assert.exists(getDetailedCallTreeTool);
    const handlerStub = sinon.stub(getDetailedCallTreeTool, 'handler').resolves({result: 'mock tree'});

    await Array.fromAsync(agent.run('query', {selected: traceContext}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.getPerformanceTraceContext(), traceContext);
  });

  it('returns null for getPerformanceTraceContext when context is not PerformanceTraceContext', async () => {
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['performance']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'getDetailedCallTree', args: {eventKey: 'key-1'}}],
      }],
      [{
        explanation: 'Done.',
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient});

    const getDetailedCallTreeTool = AiAssistance.ToolRegistry.ToolRegistry.get('getDetailedCallTree');
    assert.exists(getDetailedCallTreeTool);
    const handlerStub = sinon.stub(getDetailedCallTreeTool, 'handler').resolves({result: 'mock tree'});

    await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getPerformanceTraceContext());
  });
});
