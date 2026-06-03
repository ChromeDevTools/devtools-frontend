// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import { AiAgent } from './agents/AiAgent.js';
import { debugLog } from './debug.js';
import { SKILLS } from './skills/SkillRegistry.js';
export class AiAgent2 extends AiAgent {
    // TODO: The static preamble is a placeholder and will eventually live server-side.
    preamble = 'You are a unified AI assistant in Chrome DevTools. You can learn skills to help the user.';
    clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT; // Placeholder
    userTier = 'TESTERS';
    #skillsInjected = false;
    get options() {
        return {};
    }
    #activeSkills = new Set();
    constructor(opts) {
        super(opts);
        const skillsList = Object.keys(SKILLS).join(', ');
        this.declareFunction('learnSkills', {
            description: `Load skills to help with the task. Available skills: ${skillsList}.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'Parameters for learning skills',
                properties: {
                    skills: {
                        type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                        items: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
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
            handler: async (args) => {
                const result = await this.learnSkill(args.skills);
                return { result };
            },
        });
    }
    async enhanceQuery(query) {
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
    async *handleContextDetails(_select) {
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            details: [{
                    title: 'Status',
                    text: 'Minimal agent initialized.',
                }],
        };
    }
    async learnSkill(names) {
        let response = '';
        for (const name of names) {
            debugLog(`AiAgent2: Attempting to load skill ${name}`);
            if (this.#activeSkills.has(name)) {
                debugLog(`AiAgent2: Skill ${name} is already loaded`);
                response += `Skill ${name} is already loaded.\n`;
                continue;
            }
            const skillObj = SKILLS[name];
            if (skillObj) {
                this.#activeSkills.add(name);
                debugLog(`AiAgent2: Skill ${name} loaded successfully`);
                response += `Skill ${name} loaded. Instructions:\n${skillObj.instructions}\n`;
            }
            else {
                debugLog(`AiAgent2: Failed to load skill ${name}`);
                response += `Failed to load skill ${name}. Valid skills are: ${Object.keys(SKILLS).join(', ')}.\n`;
            }
        }
        return response.trim();
    }
    get activeSkills() {
        return this.#activeSkills;
    }
}
//# sourceMappingURL=AiAgent2.js.map