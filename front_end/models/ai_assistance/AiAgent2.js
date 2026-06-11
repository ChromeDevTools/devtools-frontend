// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import { AiAgent } from './agents/AiAgent.js';
import { executeJsCode } from './agents/ExecuteJavascript.js';
import { ChangeManager } from './ChangeManager.js';
import { DOMNodeContext } from './contexts/DOMNodeContext.js';
import { debugLog } from './debug.js';
import { ExtensionScope } from './ExtensionScope.js';
import { SKILLS } from './skills/SkillRegistry.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
const SKILL_DISPLAY_NAMES = {
    styling: 'CSS and styling',
};
export class AiAgent2 extends AiAgent {
    // TODO: The static preamble is a placeholder and will eventually live server-side.
    preamble = 'You are a unified AI assistant in Chrome DevTools. You can learn skills to help the user.';
    clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT; // Placeholder
    userTier = 'TESTERS';
    #skillsInjected = false;
    #changes = new ChangeManager();
    #execJs;
    get options() {
        return {};
    }
    #activeSkills = new Set();
    #declaredTools = new Set();
    constructor(opts) {
        super(opts);
        this.#execJs = opts.execJs ?? executeJsCode;
        this.#declaredTools.add('learnSkills');
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
                const isSingular = args.skills.length === 1;
                const prefix = isSingular ? 'Learning skill' : 'Learning skills';
                const names = args.skills.map(name => SKILL_DISPLAY_NAMES[name] ?? name).join(', ');
                return {
                    title: `${prefix}: ${names}`,
                    action: `learnSkills(${args.skills.map(name => `'${name}'`).join(', ')})`,
                };
            },
            handler: async (args) => {
                const result = await this.learnSkill(args.skills);
                return { result };
            },
        });
    }
    async enhanceQuery(query, selected = null, 
    // TODO: support multimodal input in AiAgent2.
    _multimodalInputType) {
        let enhancedQuery = query;
        if (selected) {
            const promptDetails = await selected.getPromptDetails();
            if (promptDetails) {
                enhancedQuery = `${promptDetails}

# User request

QUERY: ${query}`;
            }
        }
        if (this.#skillsInjected) {
            return enhancedQuery;
        }
        this.#skillsInjected = true;
        const skillsManifest = Object.entries(this.getSkills()).map(([name, skill]) => `- ${name}: ${skill.description}`).join('\n');
        return `Available skills:
${skillsManifest}

You must call \`learnSkills\` to load a skill before you can use it.

User query: ${enhancedQuery}`;
    }
    async *handleContextDetails(selected) {
        if (selected) {
            const details = await selected.getUserFacingDetails();
            if (details) {
                yield {
                    type: "context" /* ResponseType.CONTEXT */,
                    details,
                };
            }
        }
    }
    getSkills() {
        return SKILLS;
    }
    async learnSkill(names) {
        let response = '';
        const skills = this.getSkills();
        for (const name of names) {
            debugLog(`AiAgent2: Attempting to load skill ${name}`);
            if (this.#activeSkills.has(name)) {
                debugLog(`AiAgent2: Skill ${name} is already loaded`);
                response += `Skill ${name} is already loaded.\n`;
                continue;
            }
            const skillObj = skills[name];
            if (skillObj) {
                this.#activeSkills.add(name);
                debugLog(`AiAgent2: Skill ${name} loaded successfully`);
                response += `Skill ${name} loaded. Instructions:\n${skillObj.instructions}\n`;
                for (const toolName of skillObj.allowedTools) {
                    const tool = ToolRegistry.get(toolName);
                    if (tool) {
                        this.#declareTool(tool);
                    }
                }
            }
            else {
                debugLog(`AiAgent2: Failed to load skill ${name}`);
                response += `Failed to load skill ${name}. Valid skills are: ${Object.keys(skills).join(', ')}.\n`;
            }
        }
        return response.trim();
    }
    #createExtensionScope(changes) {
        const selectedNode = this.context && this.context instanceof DOMNodeContext ? this.context.getItem() : null;
        return new ExtensionScope(changes, this.sessionId, selectedNode);
    }
    /**
     * Declares a tool to be available to the agent model, verifying first that
     * it hasn't already been declared to prevent duplicate declaration errors.
     */
    #declareTool(tool) {
        if (this.#declaredTools.has(tool.name)) {
            debugLog(`AiAgent2: Tool ${tool.name} is already declared`);
            return;
        }
        this.#declaredTools.add(tool.name);
        this.declareFunction(tool.name, {
            description: tool.description,
            parameters: tool.parameters,
            displayInfoFromArgs: tool.displayInfoFromArgs,
            handler: (args, options) => tool.handler(args, {
                conversationContext: this.context ?? null,
                changeManager: this.#changes,
                createExtensionScope: this.#createExtensionScope.bind(this),
                execJs: this.#execJs,
                getExecutionContextNode: () => this.context instanceof DOMNodeContext ? this.context.getItem() : null,
            }, options),
        });
    }
    get activeSkills() {
        return this.#activeSkills;
    }
}
//# sourceMappingURL=AiAgent2.js.map