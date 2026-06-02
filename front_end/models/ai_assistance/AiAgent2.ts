// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';

import {
  type AgentOptions,
  AiAgent,
  type ContextResponse,
  type ConversationContext,
  type RequestOptions,
  ResponseType
} from './agents/AiAgent.js';
import {debugLog} from './debug.js';
import type {Skill, SkillName} from './skills/Skill.js';
import {SKILLS} from './skills/SkillRegistry.js';

export class AiAgent2 extends AiAgent<unknown> {
  // TODO: The static preamble is a placeholder and will eventually live server-side.
  readonly preamble = 'You are a unified AI assistant in Chrome DevTools. You can learn skills to help the user.';
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;  // Placeholder
  readonly userTier = 'TESTERS';

  #skillsInjected = false;

  get options(): RequestOptions {
    return {};
  }

  readonly #activeSkills = new Set<SkillName>();

  constructor(opts: AgentOptions) {
    super(opts);
    const skillsList = Object.keys(SKILLS).join(', ');
    this.declareFunction<{skills: SkillName[]}>('learnSkills', {
      description: `Load skills to help with the task. Available skills: ${skillsList}.`,
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: 'Parameters for learning skills',
        properties: {
          skills: {
            type: Host.AidaClient.ParametersTypes.ARRAY,
            items: {
              type: Host.AidaClient.ParametersTypes.STRING,
              description: 'Skill name',
            },
            description: 'List of skill names to load',
          },
        },
        required: ['skills'],
      },
      displayInfoFromArgs: args => {
        return {
          title: `Learning skills: ${args.skills.join(', ')}`,
        };
      },
      handler: async args => {
        const result = await this.learnSkill(args.skills);
        return {result};
      },
    });
  }

  override async enhanceQuery(query: string): Promise<string> {
    if (this.#skillsInjected) {
      return query;
    }
    this.#skillsInjected = true;
    const skillsManifest = Object.entries(SKILLS).map(([name, skill]) => `- ${name}: ${skill.description}`).join('\n');
    return `Available skills:
${skillsManifest}

You must call \`learnSkills\` to load a skill before you can use it.

User query: ${query}`;
  }

  async *
      handleContextDetails(_select: ConversationContext<unknown>|null): AsyncGenerator<ContextResponse, void, void> {
    yield {
      type: ResponseType.CONTEXT,
      details: [{
        title: 'Status',
        text: 'Minimal agent initialized.',
      }],
    };
  }

  async learnSkill(names: SkillName[]): Promise<string> {
    let response = '';
    for (const name of names) {
      debugLog(`AiAgent2: Attempting to load skill ${name}`);
      if (this.#activeSkills.has(name)) {
        debugLog(`AiAgent2: Skill ${name} is already loaded`);
        response += `Skill ${name} is already loaded.\n`;
        continue;
      }

      const skillObj: Skill = SKILLS[name];
      if (skillObj) {
        this.#activeSkills.add(name);
        debugLog(`AiAgent2: Skill ${name} loaded successfully`);
        response += `Skill ${name} loaded. Instructions:\n${skillObj.instructions}\n`;
      } else {
        debugLog(`AiAgent2: Failed to load skill ${name}`);
        response += `Failed to load skill ${name}. Valid skills are: ${Object.keys(SKILLS).join(', ')}.\n`;
      }
    }
    return response.trim();
  }

  get activeSkills(): Set<SkillName> {
    return this.#activeSkills;
  }
}
