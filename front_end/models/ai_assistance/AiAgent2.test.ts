// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as LHModel from '../lighthouse/lighthouse.js';
import type * as Trace from '../trace/trace.js';

import * as AiAssistance from './ai_assistance.js';

type Skill = AiAssistance.Skill.Skill;
type SkillName = AiAssistance.Skill.SkillName;
const SKILLS = AiAssistance.SkillRegistry.SKILLS;

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

function getContextChangeResponse(
    responses: AiAssistance.AiAgent.ResponseData[],
    ): AiAssistance.AiAgent.ContextChangeResponse {
  const contextChange = responses.find(
      (r): r is AiAssistance.AiAgent.ContextChangeResponse =>
          r.type === AiAssistance.AiAgent.ResponseType.CONTEXT_CHANGE,
  );
  assert.exists(contextChange, 'Expected a CONTEXT_CHANGE response');
  return contextChange;
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

describe('AiAgent2', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  const defaultOriginLock = (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'});

  it('retrieves userTier from hostConfig', () => {
    updateHostConfig({
      devToolsAiV2Architecture: {
        userTier: 'TESTERS',
      },
    });
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient: mockAidaClient(), originLock: defaultOriginLock});
    assert.strictEqual(agent.userTier, 'TESTERS');
  });
  it('registers all expected skills', () => {
    assert.deepEqual(Object.keys(SKILLS).sort(),
                     ['styling', 'network', 'accessibility', 'performance', 'storage', 'sources', 'lighthouse'].sort());
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, changeManager, originLock: defaultOriginLock});

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.changeManager, changeManager);
  });

  it('passes established origin to tools in context', async () => {
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
    const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin}),
    });

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.deepEqual(context.getOriginLock?.(), {status: 'ESTABLISHED_ORIGIN', origin});
  });

  it('can learn a skill', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    // We expect the generated skill file to be available because we built it.
    // If it fails, we might need to mock the import or ensure the build target runs.
    const result = await agent.learnSkill(['styling']);
    assert.isTrue(result.includes(SKILLS.styling.instructions));
    assert.isTrue(agent.activeSkills.has('styling'));
  });

  it('prevents duplicate loading', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    await agent.learnSkill(['styling']);
    const result = await agent.learnSkill(['styling']);

    assert.strictEqual(
        result,
        'Error: Skill \'styling\' is already loaded. Call its tools directly instead of invoking learnSkills for \'styling\' again.');
  });

  it('handles invalid skill names gracefully', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    const getStylesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getStyles');
    assert.exists(getStylesTool);
    const handlerStub = sinon.stub(getStylesTool, 'handler').resolves({result: 'mocked style result'});

    const responses = await Array.fromAsync(agent.run('question', {selected: null}));

    // Verify that handler was called
    sinon.assert.calledOnce(handlerStub);
    const [args] = handlerStub.getCall(0).args;
    assert.deepEqual(args, {elements: [1], styleProperties: ['color'], explanation: 'testing'});

    // Verify AIDA response included tool output
    const hasTitle = responses.some(
        r => r.type === AiAssistance.AiAgent.ResponseType.TITLE && r.title === 'Reading computed and source styles');
    assert.isTrue(hasTitle);
  });

  it('prevents duplicate tool declarations if multiple learned skills share the same tool', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
    const element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    sinon.stub(nodeContext, 'getPromptDetails').resolves('# Inspected element\n\nelement-description');

    const enhancedQuery = await agent.enhanceQuery('my query', nodeContext);

    assert.isTrue(
        enhancedQuery.includes('# Inspected element\n\nelement-description\n\n# User request\n\nQUERY: my query'));
  });

  it('yields the selected element description in handleContextDetails', async () => {
    const aidaClient = mockAidaClient();
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
        response.confirm(AiAssistance.Tool.PermissionDecision.ALLOW_ONCE);
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const target = universe.createTarget({url: 'https://example.com'});
    target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.securityOrigin.returns(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
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
    const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin}),
    });

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.strictEqual(context.getExecutionContextNode(), mockBodyNode);
  });

  it('pushes body node to frontend during preRun when body is missing', async () => {
    const target = universe.createTarget({url: 'https://example.com'});
    target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.body = null;
    sinon.stub(domModel, 'existingDocument').returns(mockDocument);
    const pushStub = sinon.stub(domModel, 'pushNodeByPathToFrontend').resolves(null);

    const aidaClient = mockAidaClient([[{explanation: 'Done'}]]);
    const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin}),
    });

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnceWithExactly(pushStub, '1,HTML,1,BODY');
  });

  it('returns null for getExecutionContextNode when body is absent and does not return document', async () => {
    const target = universe.createTarget({url: 'https://example.com'});
    target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.securityOrigin.returns(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
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
    const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin}),
    });

    const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
    assert.exists(executeJsTool);
    const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getExecutionContextNode());
  });

  it('creates ExtensionScope using document body when context is not DOMNodeContext', async () => {
    const target = universe.createTarget({url: 'https://example.com'});
    target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.securityOrigin.returns(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
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
    const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin}),
    });

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    await Array.fromAsync(agent.run('question', {selected: null}));

    sinon.assert.callCount(aidaClient.doConversation, 2);
    const postLearnDeclarations = aidaClient.doConversation.getCall(1).args[0].function_declarations ?? [];
    const declaredNames = postLearnDeclarations.map(d => d.name);

    assert.include(declaredNames, 'listPageOrigins');
    assert.include(declaredNames, 'listStorageKeys');
    assert.include(declaredNames, 'getStorageValues');
    assert.include(declaredNames, 'listCookies');
    assert.include(declaredNames, 'getCookieValues');
    assert.include(declaredNames, 'getStorageBreakdown');
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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

  async function runGetCookieValuesApprovalFlow(
      decision = AiAssistance.Tool.PermissionDecision.ALLOW_ONCE,
      ): Promise<{
    responses: AiAssistance.AiAgent.ResponseData[],
    handlerStub: sinon.SinonStub,
  }> {
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

    const sideEffectPromise = Promise.withResolvers<AiAssistance.Tool.PermissionDecision>();
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      confirmSideEffectForTest: sinon.stub().returns(sideEffectPromise),
      originLock: defaultOriginLock,
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

    sideEffectPromise.resolve(decision);
    const responses = await Array.fromAsync(agent.run('get cookie session', {selected: null}));
    return {responses, handlerStub};
  }

  it('handles getCookieValues approval flow in AiAgent2', async () => {
    const {responses, handlerStub} = await runGetCookieValuesApprovalFlow();

    sinon.assert.calledTwice(handlerStub);
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 3);
    assert.strictEqual(actionResponses[0].code, 'learnSkills(\'storage\')');
    assert.strictEqual(actionResponses[1].code, 'getCookieValues(["session"], ["https://example.com"])');
    assert.isUndefined(actionResponses[1].output);
    assert.strictEqual(actionResponses[2].code, 'getCookieValues(["session"], ["https://example.com"])');
    assert.exists(actionResponses[2].output);
  });

  it('runs the tool with approved: true when the user picks ALLOW_ALWAYS', async () => {
    const {handlerStub} = await runGetCookieValuesApprovalFlow(AiAssistance.Tool.PermissionDecision.ALLOW_ALWAYS);

    sinon.assert.calledTwice(handlerStub);
    assert.propertyVal(handlerStub.getCall(1).args[2], 'approved', true);
  });

  it('runs the tool with approved: true when the user picks ALLOW_ONCE', async () => {
    const {handlerStub} = await runGetCookieValuesApprovalFlow(AiAssistance.Tool.PermissionDecision.ALLOW_ONCE);

    sinon.assert.calledTwice(handlerStub);
    assert.propertyVal(handlerStub.getCall(1).args[2], 'approved', true);
  });

  it('does not run the tool when the user picks SKIP', async () => {
    const {responses, handlerStub} = await runGetCookieValuesApprovalFlow(AiAssistance.Tool.PermissionDecision.REJECT);

    sinon.assert.calledOnce(handlerStub);
    const canceled = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action' && r.canceled);
    assert.exists(canceled);
    assert.strictEqual(canceled.output, 'Error: User denied code execution with side effects.');
  });

  it('includes the tool permissionPrompt and permissionTitle in the SIDE_EFFECT response', async () => {
    const {responses} = await runGetCookieValuesApprovalFlow();

    const sideEffectResponse = responses.find((r): r is AiAssistance.AiAgent.SideEffectResponse =>
                                                  r.type === AiAssistance.AiAgent.ResponseType.SIDE_EFFECT);
    assert.exists(sideEffectResponse);
    assert.strictEqual(sideEffectResponse.permissionPrompt, AiAssistance.Tool.PermissionPrompt.ALLOW_ONCE);
    assert.strictEqual(sideEffectResponse.permissionTitle, 'Allow reading cookie values?');
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});
    const lighthouseContext = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

    const getLighthouseAuditsTool = AiAssistance.ToolRegistry.ToolRegistry.get('getLighthouseAudits');
    assert.exists(getLighthouseAuditsTool);
    const handlerStub = sinon.stub(getLighthouseAuditsTool, 'handler').resolves({result: {audits: 'mock audits'}});

    await Array.fromAsync(agent.run('query', {selected: lighthouseContext}));

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
        functionCalls: [{name: 'runLighthouse', args: {explanation: 'run', categoryId: 'accessibility'}}],
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2(
        {aidaClient, lighthouseRecording: runLighthouseStub, originLock: defaultOriginLock});

    const runLighthouseTool = AiAssistance.ToolRegistry.ToolRegistry.get('runLighthouse');
    assert.exists(runLighthouseTool);
    const handlerSpy = sinon.spy(runLighthouseTool, 'handler');

    const responses = await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerSpy);
    sinon.assert.calledOnce(runLighthouseStub);
    const contextChange = getContextChangeResponse(responses);
    assert.strictEqual(contextChange.description, 'Lighthouse audit completed');
    assert.instanceOf(contextChange.context, AiAssistance.LighthouseContext.LighthouseContext);
    assert.strictEqual(contextChange.context.getItem(), mockReport);
    assert.isUndefined(contextChange.widgets);
  });

  it('records a functionResponse after a ContextTool functionCall so history is valid for the next run', async () => {
    const mockReport = {
      finalDisplayedUrl: 'https://example.com',
      categories: {},
      audits: {},
    } as unknown as LHModel.ReporterTypes.ReportJSON;
    const aidaClient = mockAidaClient([
      [{explanation: '', functionCalls: [{name: 'learnSkills', args: {skills: ['accessibility']}}]}],
      [{
        explanation: '',
        functionCalls: [{name: 'runLighthouse', args: {explanation: 'run', categoryId: 'accessibility'}}],
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2(
        {aidaClient, lighthouseRecording: sinon.stub().resolves(mockReport), originLock: defaultOriginLock});

    await Array.fromAsync(agent.run('query', {selected: null}));

    assert.deepEqual(agent.history.slice(-2), [
      {
        role: Host.AidaClient.Role.MODEL,
        parts: [{functionCall: {name: 'runLighthouse', args: {explanation: 'run', categoryId: 'accessibility'}}}],
      },
      {
        role: Host.AidaClient.Role.ROLE_UNSPECIFIED,
        parts: [{functionResponse: {name: 'runLighthouse', response: {result: 'Lighthouse audit completed'}}}],
      },
    ]);
  });

  it('returns null for getLighthouseReport when context is not LighthouseContext', async () => {
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    const getLighthouseAuditsTool = AiAssistance.ToolRegistry.ToolRegistry.get('getLighthouseAudits');
    assert.exists(getLighthouseAuditsTool);
    const handlerStub = sinon.stub(getLighthouseAuditsTool, 'handler').resolves({result: {audits: 'mock audits'}});

    await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getLighthouseReport());
  });

  it('learns accessibility skill and invokes runLighthouse when a performance trace is selected', async () => {
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
        explanation: 'Running lighthouse audits',
        functionCalls: [{name: 'runLighthouse', args: {explanation: 'Auditing page', categoryId: 'accessibility'}}],
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      lighthouseRecording: runLighthouseStub,
      originLock: defaultOriginLock,
    });
    const traceContext = sinon.createStubInstance(AiAssistance.PerformanceTraceContext.PerformanceTraceContext);

    const runLighthouseTool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.RUN_LIGHTHOUSE);
    assert.exists(runLighthouseTool);
    const handlerSpy = sinon.spy(runLighthouseTool, 'handler');

    const responses = await Array.fromAsync(
        agent.run('record a lighthouse report and check accessibility score', {selected: traceContext}));

    sinon.assert.calledOnce(handlerSpy);
    sinon.assert.calledOnce(runLighthouseStub);
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 1);
    assert.strictEqual(actionResponses[0].code, 'learnSkills(\'accessibility\')');
    const contextChange = getContextChangeResponse(responses);
    assert.strictEqual(contextChange.description, 'Lighthouse audit completed');
    assert.instanceOf(contextChange.context, AiAssistance.LighthouseContext.LighthouseContext);
    assert.strictEqual(contextChange.context.getItem(), mockReport);
    assert.isUndefined(contextChange.widgets);
  });

  it('learns lighthouse skill and invokes runLighthouse with categoryId "all"', async () => {
    const mockReport = {
      finalDisplayedUrl: 'https://example.com',
      categories: {},
      audits: {},
    } as unknown as LHModel.ReporterTypes.ReportJSON;
    const runLighthouseStub = sinon.stub().resolves(mockReport);
    const aidaClient = mockAidaClient([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['lighthouse']}}],
      }],
      [{
        explanation: 'Running all lighthouse audits',
        functionCalls:
            [{name: 'runLighthouse', args: {explanation: 'Full audit of page', categoryId: 'all', mode: 'navigation'}}],
      }],
    ]);
    const agent = new AiAssistance.AiAgent2.AiAgent2({
      aidaClient,
      lighthouseRecording: runLighthouseStub,
      originLock: defaultOriginLock,
    });

    const runLighthouseTool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.RUN_LIGHTHOUSE);
    assert.exists(runLighthouseTool);
    const handlerSpy = sinon.spy(runLighthouseTool, 'handler');

    const responses = await Array.fromAsync(agent.run('run a full lighthouse audit of this page', {selected: null}));

    sinon.assert.calledOnce(handlerSpy);
    sinon.assert.calledWith(handlerSpy, sinon.match({categoryId: 'all', mode: 'navigation'}));
    sinon.assert.calledOnce(runLighthouseStub);
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 1);
    assert.strictEqual(actionResponses[0].code, 'learnSkills(\'lighthouse\')');
    assert.isTrue(agent.activeSkills.has('lighthouse'));
    const contextChange = getContextChangeResponse(responses);
    assert.strictEqual(contextChange.description, 'Lighthouse audit completed');
    assert.instanceOf(contextChange.context, AiAssistance.LighthouseContext.LighthouseContext);
    assert.strictEqual(contextChange.context.getItem(), mockReport);
    assert.isUndefined(contextChange.widgets);
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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

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
    const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient, originLock: defaultOriginLock});

    const getDetailedCallTreeTool = AiAssistance.ToolRegistry.ToolRegistry.get('getDetailedCallTree');
    assert.exists(getDetailedCallTreeTool);
    const handlerStub = sinon.stub(getDetailedCallTreeTool, 'handler').resolves({result: 'mock tree'});

    await Array.fromAsync(agent.run('query', {selected: null}));

    sinon.assert.calledOnce(handlerStub);
    const [, context] = handlerStub.getCall(0).args;
    assert.isNull(context.getPerformanceTraceContext());
  });

  describe('origin lock target and body handling', () => {
    it('returns primaryPageTarget for getTarget when no origin is locked', async () => {
      const target = universe.createTarget({url: 'https://example.com'});
      const aidaClient = mockAidaClient([
        [{
          explanation: '',
          functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
        }],
        [{
          explanation: '',
          functionCalls: [{name: 'getStyles', args: {}}],
        }],
        [{
          explanation: 'Done.',
        }],
      ]);
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'UNINITIALIZED'}),
      });

      const getStylesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getStyles');
      assert.exists(getStylesTool);
      const handlerStub = sinon.stub(getStylesTool, 'handler').resolves({result: 'mock styles'});

      await Array.fromAsync(agent.run('query', {selected: null}));

      sinon.assert.calledOnce(handlerStub);
      const [, context] = handlerStub.getCall(0).args;
      assert.strictEqual(context.getTarget(), target);
    });

    it('returns primaryPageTarget for getTarget when locked origin matches primaryPageTarget', async () => {
      const target = universe.createTarget();
      target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
      const aidaClient = mockAidaClient([
        [{
          explanation: '',
          functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
        }],
        [{
          explanation: '',
          functionCalls: [{name: 'getStyles', args: {}}],
        }],
        [{
          explanation: 'Done.',
        }],
      ]);
      const matchingOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: matchingOrigin}),
      });

      const getStylesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getStyles');
      assert.exists(getStylesTool);
      const handlerStub = sinon.stub(getStylesTool, 'handler').resolves({result: 'mock styles'});

      await Array.fromAsync(agent.run('query', {selected: null}));

      sinon.assert.calledOnce(handlerStub);
      const [, context] = handlerStub.getCall(0).args;
      assert.strictEqual(context.getTarget(), target);
    });

    it('provides primaryPageTarget to tools via getTarget when locked to an iframe origin so tools can resolve cross-frame nodes',
       async () => {
         const target = universe.createTarget({url: 'https://example.com'});
         const aidaClient = mockAidaClient([
           [{
             explanation: '',
             functionCalls: [{name: 'learnSkills', args: {skills: ['styling']}}],
           }],
           [{
             explanation: '',
             functionCalls: [{name: 'getStyles', args: {}}],
           }],
           [{
             explanation: 'Done.',
           }],
         ]);
         const mismatchedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example');
         const agent = new AiAssistance.AiAgent2.AiAgent2({
           aidaClient,
           originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: mismatchedOrigin}),
         });

         const getStylesTool = AiAssistance.ToolRegistry.ToolRegistry.get('getStyles');
         assert.exists(getStylesTool);
         const handlerStub = sinon.stub(getStylesTool, 'handler').resolves({result: 'mock styles'});

         await Array.fromAsync(agent.run('query', {selected: null}));

         sinon.assert.calledOnce(handlerStub);
         const [, context] = handlerStub.getCall(0).args;
         assert.strictEqual(context.getTarget(), target);
       });

    it('skips requesting document during preRun when origin access is blocked', async () => {
      const target = universe.createTarget();
      target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      sinon.stub(domModel, 'existingDocument').returns(null);
      const requestStub = sinon.stub(domModel, 'requestDocument').resolves(null);

      const aidaClient = mockAidaClient([[{explanation: 'Done.'}]]);
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'BLOCKED_BY_NAVIGATION'}),
      });

      await Array.fromAsync(agent.run('question', {selected: null}));

      sinon.assert.notCalled(requestStub);
    });

    it('returns null for getExecutionContextNode when locked origin does not match primaryPageTarget', async () => {
      const target = universe.createTarget({url: 'https://example.com'});
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
      mockDocument.securityOrigin.returns(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
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
          explanation: 'Done.',
        }],
      ]);
      const mismatchedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example');
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: mismatchedOrigin}),
      });

      const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
      assert.exists(executeJsTool);
      const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

      await Array.fromAsync(agent.run('question', {selected: null}));

      sinon.assert.calledOnce(handlerStub);
      const [, context] = handlerStub.getCall(0).args;
      assert.isNull(context.getExecutionContextNode());
    });

    it('returns document body for getExecutionContextNode when locked origin matches primaryPageTarget', async () => {
      const target = universe.createTarget({url: 'https://example.com'});
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
      mockDocument.securityOrigin.returns(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
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
          explanation: 'Done.',
        }],
      ]);
      const matchingOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: matchingOrigin}),
      });

      const executeJsTool = AiAssistance.ToolRegistry.ToolRegistry.get('executeJavaScript');
      assert.exists(executeJsTool);
      const handlerStub = sinon.stub(executeJsTool, 'handler').resolves({result: 'mocked result'});

      await Array.fromAsync(agent.run('question', {selected: null}));

      sinon.assert.calledOnce(handlerStub);
      const [, context] = handlerStub.getCall(0).args;
      assert.strictEqual(context.getExecutionContextNode(), mockBodyNode);
    });

    it('skips requesting document during preRun when locked origin does not match primaryPageTarget', async () => {
      const target = universe.createTarget({url: 'https://example.com'});
      target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      sinon.stub(domModel, 'existingDocument').returns(null);
      const requestStub = sinon.stub(domModel, 'requestDocument').resolves(null);

      const aidaClient = mockAidaClient([[{explanation: 'Done.'}]]);
      const mismatchedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example');
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: mismatchedOrigin}),
      });

      await Array.fromAsync(agent.run('question', {selected: null}));

      sinon.assert.notCalled(requestStub);
    });

    it('requests document during preRun when locked origin matches primaryPageTarget', async () => {
      const target = universe.createTarget({url: 'https://example.com'});
      target.setInspectedURL(Platform.DevToolsPath.urlString`https://example.com`);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      sinon.stub(domModel, 'existingDocument').returns(null);
      sinon.stub(domModel, 'pushNodeByPathToFrontend').resolves(null);
      const requestStub = sinon.stub(domModel, 'requestDocument').resolves(null);

      const aidaClient = mockAidaClient([[{explanation: 'Done.'}]]);
      const matchingOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const agent = new AiAssistance.AiAgent2.AiAgent2({
        aidaClient,
        originLock: () => ({status: 'ESTABLISHED_ORIGIN' as const, origin: matchingOrigin}),
      });

      await Array.fromAsync(agent.run('question', {selected: null}));

      sinon.assert.calledOnce(requestStub);
    });
  });

  describe('follow-up suggestions', () => {
    describe('in a completed response', () => {
      /**
       * Parses `input` as a completed response and asserts both the remaining
       * `answer` text (defaulting to `''`) and the extracted `suggestions`
       * (defaulting to `undefined`).
       */
      function assertSuggestions(
          input: string,
          expected: {answer?: string, suggestions?: [string, ...string[]]} = {},
          ): void {
        const agent = new AiAssistance.AiAgent2.AiAgent2({aidaClient: mockAidaClient(), originLock: defaultOriginLock});
        const parsed = agent.parseTextResponse(input);
        assert.strictEqual(parsed.answer, expected.answer ?? '');
        assert.deepEqual(parsed.suggestions, expected.suggestions);
      }

      it('extracts suggestions from a SUGGESTIONS line at the end', () => {
        assertSuggestions('SUGGESTIONS: ["how to fix", "why it fails"]', {
          suggestions: ['how to fix', 'why it fails'],
        });
        assertSuggestions('Answer.\nSUGGESTIONS: ["a", "b"]', {
          answer: 'Answer.',
          suggestions: ['a', 'b'],
        });
        assertSuggestions('Answer.\n\nSUGGESTIONS: ["a"]\n\n', {
          answer: 'Answer.',
          suggestions: ['a'],
        });
      });

      it('keeps the text before a directive on the same line', () => {
        assertSuggestions('Done. SUGGESTIONS: ["a"]', {
          answer: 'Done.',
          suggestions: ['a'],
        });
        assertSuggestions('Here is the solution to apply. **Suggestions**: ["inspect element", "check styles"]', {
          answer: 'Here is the solution to apply.',
          suggestions: ['inspect element', 'check styles'],
        });
        assertSuggestions('**Suggestions**: [1] Fix contrast. SUGGESTIONS: ["fix color", "adjust size"]', {
          answer: '**Suggestions**: [1] Fix contrast.',
          suggestions: ['fix color', 'adjust size'],
        });
      });

      it('extracts suggestions across markdown formatting, list prefixes, and case variations', () => {
        const expected = {suggestions: ['fix color', 'adjust size'] as [string, ...string[]]};
        assertSuggestions('SUGGESTIONS:  ["fix color", "adjust size"]', expected);
        assertSuggestions('suggestions: ["fix color", "adjust size"]', expected);
        assertSuggestions('**Suggestions**: ["fix color", "adjust size"]', expected);
        assertSuggestions('**SUGGESTIONS:** ["fix color", "adjust size"]', expected);
        assertSuggestions('**SUGGESTIONS: ["fix color", "adjust size"]**', expected);
        assertSuggestions('*Suggestions*: ["fix color", "adjust size"]', expected);
        assertSuggestions('*Suggestions: ["fix color", "adjust size"]*', expected);
        assertSuggestions('***Suggestions***: ["fix color", "adjust size"]', expected);
        assertSuggestions('_Suggestions_: ["fix color", "adjust size"]', expected);
        assertSuggestions('_Suggestions: ["fix color", "adjust size"]_', expected);
        assertSuggestions('__SUGGESTIONS__: ["fix color", "adjust size"]', expected);
        assertSuggestions('__SUGGESTIONS: ["fix color", "adjust size"]__', expected);
        assertSuggestions('`SUGGESTIONS`: ["fix color", "adjust size"]', expected);
        assertSuggestions('`SUGGESTIONS:` ["fix color", "adjust size"]', expected);
        assertSuggestions('SUGGESTIONS: `["fix color", "adjust size"]`', expected);
        assertSuggestions('- Suggestions: ["fix color", "adjust size"]', expected);
        assertSuggestions('* Suggestions: ["fix color", "adjust size"]', expected);
        assertSuggestions('1. Suggestions: ["fix color", "adjust size"]', expected);
        assertSuggestions('### Suggestions: ["fix color", "adjust size"]', expected);
      });

      it('extracts suggestions that contain square brackets', () => {
        assertSuggestions('SUGGESTIONS: ["Why does [type=text] fail?", "check [disabled] attribute"]', {
          suggestions: ['Why does [type=text] fail?', 'check [disabled] attribute'],
        });
      });

      it('sanitizes suggestions', () => {
        assertSuggestions('SUGGESTIONS: ["valid", 123, null, {"key": "val"}]', {
          suggestions: ['valid'],
        });
        assertSuggestions(`SUGGESTIONS: ["${'a'.repeat(300)}"]`, {
          suggestions: ['a'.repeat(200)],
        });
        assertSuggestions('SUGGESTIONS: ["line1\\nline2", "word1\\r\\nword2", "excessive   spaces"]', {
          suggestions: ['line1 line2', 'word1 word2', 'excessive spaces'],
        });
      });

      it('removes a directive with no usable suggestions', () => {
        assertSuggestions('SUGGESTIONS: []');
        assertSuggestions('SUGGESTIONS: [""]');
        assertSuggestions('Answer.\n**Suggestions**: ["", "   ", "\\n\\n"]', {answer: 'Answer.'});
      });

      it('removes a plain SUGGESTIONS directive even if its array is not valid JSON', () => {
        assertSuggestions('Done. SUGGESTIONS: [\'a\']', {answer: 'Done.'});
        assertSuggestions('Answer.\nSUGGESTIONS: ["a", "b",]', {answer: 'Answer.'});
        assertSuggestions('Answer.\nSUGGESTIONS: ["a", "b', {answer: 'Answer.'});
        assertSuggestions('Answer.\nSUGGESTIONS: ["a"] and more text', {answer: 'Answer.'});
        assertSuggestions('SUGGESTIONS:');
        assertSuggestions('SUGGESTIONS: "not an array"');
        assertSuggestions('- SUGGESTIONS: [');
      });

      it('keeps other spellings of the directive if the array is not valid JSON', () => {
        assertSuggestions('**Suggestions**: [invalid json]', {answer: '**Suggestions**: [invalid json]'});
        assertSuggestions('Answer.\n**Suggestions**: ["a", "b', {answer: 'Answer.\n**Suggestions**: ["a", "b'});
        assertSuggestions('**SUGGESTIONS:** [\'a\']', {answer: '**SUGGESTIONS:** [\'a\']'});
        assertSuggestions('Suggestions: check the padding', {answer: 'Suggestions: check the padding'});
        assertSuggestions('Here are some suggestions: try changing the color.', {
          answer: 'Here are some suggestions: try changing the color.',
        });
      });

      it('keeps lines that only resemble a directive', () => {
        assertSuggestions('A few suggestions: [see docs](https://example.com)', {
          answer: 'A few suggestions: [see docs](https://example.com)',
        });
        assertSuggestions('suggestions: ["a", "b"],', {answer: 'suggestions: ["a", "b"],'});
        assertSuggestions('const DEFAULT_SUGGESTIONS: string[] = [];', {
          answer: 'const DEFAULT_SUGGESTIONS: string[] = [];',
        });
        assertSuggestions('Use DEFAULT_SUGGESTIONS: ["a", "b"]', {answer: 'Use DEFAULT_SUGGESTIONS: ["a", "b"]'});
      });

      it('only treats the last line as a directive', () => {
        assertSuggestions('Here are some suggestions:\n- Bullet 1', {answer: 'Here are some suggestions:\n- Bullet 1'});
        assertSuggestions('**Suggestions**:\n- Fix padding', {answer: '**Suggestions**:\n- Fix padding'});
        assertSuggestions('**Suggestions**:\n- Fix A\nSUGGESTIONS: ["a"]', {
          answer: '**Suggestions**:\n- Fix A',
          suggestions: ['a'],
        });
        assertSuggestions('Answer.\nSUGGESTIONS: ["a"]\nMore text.', {
          answer: 'Answer.\nSUGGESTIONS: ["a"]\nMore text.',
        });
        assertSuggestions('Answer.\nSUGGESTIONS: ["first"]\nMore.\nSUGGESTIONS: ["second"]', {
          answer: 'Answer.\nSUGGESTIONS: ["first"]\nMore.',
          suggestions: ['second'],
        });
      });

      it('does not change code blocks', () => {
        const openArray =
            ['```js', 'const config = {', '  suggestions: [', '    \'a\',', '  ],', '};', '```'].join('\n');
        assertSuggestions(openArray, {answer: openArray});

        const doubleQuoted = ['```js', 'const config = {', '  suggestions: ["a", "b"],', '};', '```'].join('\n');
        assertSuggestions(doubleQuoted, {answer: doubleQuoted});

        const upperCase = ['```yaml', 'SUGGESTIONS: ["a"]', '```'].join('\n');
        assertSuggestions(upperCase, {answer: upperCase});

        assertSuggestions('```js\n  suggestions: [', {answer: '```js\n  suggestions: ['});
      });

      it('extracts suggestions after a closed code block', () => {
        assertSuggestions('```js\nconst x = 1;\n```\nSUGGESTIONS: ["a"]', {
          answer: '```js\nconst x = 1;\n```',
          suggestions: ['a'],
        });
      });

      it('does not extract suggestions from an answer wrapped in a 5-backtick code chunk', () => {
        const wrapped = '`````\nhello world\nSUGGESTIONS: ["a"]\n`````';
        assertSuggestions(wrapped, {answer: wrapped});
      });

      it('returns an empty answer for an empty response', () => {
        assertSuggestions('');
        assertSuggestions('  \n  ');
      });
    });

    describe('while the response is streaming', () => {
      /**
       * Runs the agent with a response that streams as `chunks`, where each
       * chunk is the full text received so far. Returns the text of each
       * partial answer shown while streaming, and the completed answer.
       */
      async function runWithStreamedResponse(chunks: [string, ...string[]]):
          Promise<{partialAnswers: string[], completedAnswer: AiAssistance.AiAgent.AnswerResponse | undefined}> {
        const [firstChunk, ...otherChunks] = chunks;
        const agent = new AiAssistance.AiAgent2.AiAgent2({
          aidaClient: mockAidaClient([[{explanation: firstChunk}, ...otherChunks.map(explanation => ({explanation}))]]),
          originLock: defaultOriginLock,
        });
        const responses = await Array.fromAsync(agent.run('question', {selected: null}));
        const answers = responses.filter((response): response is AiAssistance.AiAgent.AnswerResponse =>
                                             response.type === AiAssistance.AiAgent.ResponseType.ANSWER);
        return {
          partialAnswers: answers.filter(answer => !answer.complete).map(answer => answer.text),
          completedAnswer: answers.find(answer => answer.complete),
        };
      }

      it('hides a streaming directive whose suggestion text contains a closing bracket', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'Answer.',
          'Answer.\nSUGGESTIONS: ["Why does [type=text] fail?", "Ano',
          'Answer.\nSUGGESTIONS: ["Why does [type=text] fail?", "Another"]',
        ]);
        assert.deepEqual(partialAnswers, ['Answer.', 'Answer.']);
        assert.strictEqual(completedAnswer?.text, 'Answer.');
        assert.deepEqual(completedAnswer?.suggestions, ['Why does [type=text] fail?', 'Another']);
      });

      it('keeps the text before a streaming directive on the same line', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'Done. SUGGESTIONS: ["Why does [type=t',
          'Done. SUGGESTIONS: ["Why does [type=text] fail?"]',
        ]);
        assert.deepEqual(partialAnswers, ['Done.']);
        assert.strictEqual(completedAnswer?.text, 'Done.');
        assert.deepEqual(completedAnswer?.suggestions, ['Why does [type=text] fail?']);
      });

      it('hides other spellings of a streaming directive', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'Answer.\n**Suggestions**: ["a", "b',
          'Answer.\n**Suggestions**: ["a", "b"]',
        ]);
        assert.deepEqual(partialAnswers, ['Answer.']);
        assert.strictEqual(completedAnswer?.text, 'Answer.');
        assert.deepEqual(completedAnswer?.suggestions, ['a', 'b']);
      });

      it('shows no partial answer while only a directive has streamed', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'SUGGESTIONS: ["a',
          'SUGGESTIONS: ["a"]',
        ]);
        assert.deepEqual(partialAnswers, []);
        assert.strictEqual(completedAnswer?.text, '');
        assert.deepEqual(completedAnswer?.suggestions, ['a']);
      });

      it('shows hidden prose again once the next line streams', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'Here are some suggestions:',
          'Here are some suggestions:\n- Fix padding',
          'Here are some suggestions:\n- Fix padding\n- Fix margin',
        ]);
        assert.deepEqual(partialAnswers, ['Here are some', 'Here are some suggestions:\n- Fix padding']);
        assert.strictEqual(completedAnswer?.text, 'Here are some suggestions:\n- Fix padding\n- Fix margin');
        assert.isUndefined(completedAnswer?.suggestions);
      });

      it('shows a non-plain directive with an invalid array once the response completes', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'Answer.\n**Suggestions**: [invalid',
          'Answer.\n**Suggestions**: [invalid json]',
        ]);
        assert.deepEqual(partialAnswers, ['Answer.']);
        assert.strictEqual(completedAnswer?.text, 'Answer.\n**Suggestions**: [invalid json]');
        assert.isUndefined(completedAnswer?.suggestions);
      });

      it('does not hide an identifier that contains the keyword', async () => {
        const {partialAnswers, completedAnswer} = await runWithStreamedResponse([
          'const DEFAULT_SUGGESTIONS:',
          'const DEFAULT_SUGGESTIONS: string[] = [];',
        ]);
        assert.deepEqual(partialAnswers, ['const DEFAULT_SUGGESTIONS:']);
        assert.strictEqual(completedAnswer?.text, 'const DEFAULT_SUGGESTIONS: string[] = [];');
      });
    });
  });
});
