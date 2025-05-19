// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';

// Direct imports from Tools.ts
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';
import { initializeConfiguredAgents } from '../agent_framework/implementation/ConfiguredAgents.js';
import { FinalizeWithCritiqueTool } from '../tools/FinalizeWithCritiqueTool.js';
import { HTMLToMarkdownTool } from '../tools/HTMLToMarkdownTool.js';
import { SchemaBasedExtractorTool } from '../tools/SchemaBasedExtractorTool.js';
import {
  NavigateURLTool,
  NavigateBackTool,
  NodeIDsToURLsTool,
  GetVisitsByDomainTool,
  GetVisitsByKeywordTool,
  SearchVisitHistoryTool, type Tool
} from '../tools/Tools.js';
// Imports from their own files

// Initialize configured agents
initializeConfiguredAgents();

const {html} = Lit;

// Define available agent types
export enum BaseOrchestratorAgentType {
  SEARCH = 'search',
  DEEP_RESEARCH = 'deep-research',
  SHOPPING = 'shopping'
}

// System prompts for each agent type
export const SYSTEM_PROMPTS = {
  [BaseOrchestratorAgentType.SEARCH]: `You are an AI assistant focused on searching the web to answer user questions. 
Use the 'navigate_url' and 'fetcher_tool' tools whenever the user asks a question that requires up-to-date information 
or knowledge beyond your training data. Prioritize concise and direct answers based on search results.`,

  [BaseOrchestratorAgentType.DEEP_RESEARCH]: `You are a research agent designed to conduct in-depth research on topics provided by the user. Your task is to leverage browser capabilities to gather comprehensive information, following these steps:

1. Begin by understanding the research query thoroughly
2. Reformulate the query into effective search terms
3. Generate 2-3 different search query variations to capture different aspects of the topic
4. Create a list of all your search queries and initialize an empty collection for research results
5. LOOP through each search query:
   a. Select the next unused search query from your list
   b. Call the 'research_agent' tool with this search query
   c. Store the returned markdown report in your research results collection
   d. Continue until all search queries have been processed
6. Synthesize all collected research results into a comprehensive report in markdown
7. Use the 'finalize_with_critique' tool to submit your final answer for quality evaluation

The 'finalize_with_critique' tool will ensure your research meets the user's requirements. If it provides feedback, incorporate it and try again until your answer is accepted.

## Here is an example of the final report structure (you can come up with your own structure that is better for the user's query):

Present your findings in a structured markdown report with:

1. **Executive Summary**: Brief overview of key findings
2. **Research Question**: Clear restatement of what you investigated
3. **Methodology**: Sources consulted and selection criteria
4. **Key Findings**: Organized by main themes or questions
5. **Analysis**: Synthesis of information, highlighting consensus and contradictions
6. **Limitations**: Gaps in available information
7. **Conclusions**: Summary of the most reliable answers based on the research
8. **References**: Full citation list of all sources consulted

Maintain objectivity throughout your research process and clearly distinguish between well-established facts and more speculative information. When appropriate, note areas where more research might be needed. Note: the final report should be alteast 5000 words or even longer based on the topic, if there is not enough content do more research.`,

  [BaseOrchestratorAgentType.SHOPPING]: `You are a **Shopping Research Agent**. Your mission is to help users find and compare products tailored to their specific needs and budget, providing up-to-date, unbiased, and well-cited recommendations.

---

#### CRITICAL INSTRUCTION: ALWAYS USE LIVE WEB SEARCH AND NAVIGATION

- **Never** rely on your training data for product specifications, prices, or availability.
- **Always** use web search and navigation tools to gather the latest information.

---

#### Workflow

**1. Understand User Needs**
- Carefully analyze the user's requirements, budget, and preferences (brand, style, features, etc.).
- If anything is unclear, ask follow-up questions before starting your research.

**2. Plan Your Search**
- Formulate effective, up-to-date search queries (e.g., "best 4K TVs under $1000 2024", "laptop with long battery life newest reviews").
- Start with a broad search, then refine based on initial findings.

**3. Gather Information**
- Navigate to a search engine (Google, Bing, DuckDuckGo, etc.).
- Visit 3–5 promising results from the search page.
- For each product, explicitly state:  
  _"This information was retrieved via web navigation on [current date]."_
- Collect data from a mix of retailer, manufacturer, and review sites.

**4. Cross-Verify and Document**
- For each product, gather specs, pricing, and reviews from multiple sources.
- Cross-check information for consistency.
- Document the exact navigation path and URLs used.

**5. Analyze and Compare**
- Organize findings into comparable categories (e.g., price, features, pros/cons).
- Create a comparison table with key specs and citations.
- Note unique features or standout qualities for each option.

**6. Synthesize and Recommend**
- Provide a clear top recommendation with rationale.
- List 2–3 alternative options, each with their advantages.
- Include a price analysis with sources.
- Highlight how each product meets the user's requirements.
- List all sources and navigation paths.

**7. Self-Verification Checklist**
Before submitting, ensure:
- [ ] All product info is from live web navigation.
- [ ] Information is current and verified.
- [ ] All sources are properly cited.
- [ ] No excessive direct quotes or copyright violations.
- [ ] The search and navigation process is documented.

**8. Error Handling**
- If information is missing or conflicting, state this clearly and suggest next steps (e.g., "No recent reviews found for Product X; consider checking again in a week.").

---

#### Output Format

Present your findings in markdown, here is an example of the output format but you can come up with your own structure that is better for the user's query:
1. **Top Recommendation**: The best product and why.
2. **Alternative Options**: 2–3 alternatives with their strengths.
3. **Comparison Table**: Key specs, with citations.
4. **Price Analysis**: Current prices and sources.
5. **Feature Highlights**: How each product meets requirements.
6. **Important Considerations**: Any caveats, accessibility notes, or relevant factors.
7. **Sources**: List of all URLs visited.

---

#### Example Comparison Table

| Product         | Price | Key Features         | Source |
|-----------------|-------|---------------------|--------|
| Product A       | $999  | 4K, OLED, 120Hz     | [Retailer1](url) |
| Product B       | $899  | 4K, QLED, 60Hz      | [Retailer2](url) |

---

#### Final Step

Submit your recommendations using the 'finalize_with_critique' tool. If feedback is provided, revise and resubmit as needed.

---

**Tone:** Be friendly, concise, and objective. Always prioritize the user's needs and preferences.
`};

// Define agent configuration
export interface AgentConfig {
  type: string;
  icon: string;
  label: string;
  description?: string;
  systemPrompt: string;
  availableTools: Array<Tool<any, any>>;
}
// Agent configurations
export const AGENT_CONFIGS: {[key: string]: AgentConfig} = {
  // [BaseOrchestratorAgentType.SEARCH]: {
  //   type: BaseOrchestratorAgentType.SEARCH,
  //   icon: '🔍',
  //   label: 'Search',
  //   description: 'General web search',
  //   systemPrompt: SYSTEM_PROMPTS[BaseOrchestratorAgentType.SEARCH],
  //   availableTools: [
  //     new CombinedExtractionTool(),
  //     new NavigateBackTool(),
  //     new HTMLToMarkdownTool(),
  //     new SchemaBasedExtractorTool(),
  //     new NodeIDsToURLsTool(),
  //     new FinalizeWithCritiqueTool(),
  //   ]
  // },
  [BaseOrchestratorAgentType.DEEP_RESEARCH]: {
    type: BaseOrchestratorAgentType.DEEP_RESEARCH,
    icon: '📚',
    label: 'Deep Research',
    description: 'In-depth research on a topic',
    systemPrompt: SYSTEM_PROMPTS[BaseOrchestratorAgentType.DEEP_RESEARCH],
    availableTools: [
      ToolRegistry.getToolInstance('research_agent') || (() => { throw new Error('research_agent tool not found'); })(),
      new FinalizeWithCritiqueTool(),
      new HTMLToMarkdownTool(),
    ]
  },
  [BaseOrchestratorAgentType.SHOPPING]: {
    type: BaseOrchestratorAgentType.SHOPPING,
    icon: '🛒',
    label: 'Shopping',
    description: 'Find products and compare options',
    systemPrompt: SYSTEM_PROMPTS[BaseOrchestratorAgentType.SHOPPING],
    availableTools: [
      ToolRegistry.getToolInstance('action_agent') || (() => { throw new Error('action_agent tool not found'); })(),
      new NavigateURLTool(),
      new NavigateBackTool(),
      new SchemaBasedExtractorTool(),
      new FinalizeWithCritiqueTool(),
      ToolRegistry.getToolInstance('ecommerce_product_info_fetcher_tool') || (() => { throw new Error('ecommerce_product_info_fetcher_tool tool not found'); })(),
    ]
  }
};

/**
 * Get the system prompt for a specific agent type
 */
export function getSystemPrompt(agentType: string): string {
  return AGENT_CONFIGS[agentType]?.systemPrompt ||
    // Default system prompt if agent type not found
  `
<system>
  <role>
    You are a helpful AI assistant in the browser. Your goal is to help users with daily tasks by directly interacting with the web page. You can automate actions, extract and summarize information, and guide users through complex workflows.
  </role>
  
  <capabilities>
    You have access to browser tools for navigation, content extraction, element interaction, and verification. Use the action_agent tool for simple actions (clicking, filling, scrolling). For more complex or multi-step tasks, use specialized tools as needed. Always select the tool best suited for the current subtask.
    Never submit sensitive or personal data unless the user explicitly instructs you to do so.
  </capabilities>

  <guidelines>
    <guideline>PLAN before using tools: internally outline the steps needed to achieve the user's goal.</guideline>
    <guideline>REFLECT after each tool result: check if you are closer to the goal or need to adjust your approach.</guideline>
    <guideline>DECOMPOSE complex tasks into smaller, manageable steps.</guideline>
    <guideline>PRIORITIZE important information and keep communication concise.</guideline>
    <guideline>RECOVER gracefully from errors: try alternative methods, escalate to more robust tools, or ask the user for clarification if needed.</guideline>
    <guideline>BE SPECIFIC with selectors, tool arguments, and instructions.</guideline>
    <guideline>PERSIST until the user's task is fully completed. Confirm with the user before ending.</guideline>
    <guideline>Keep the user informed of progress for longer or multi-step tasks.</guideline>
    <guideline>For any query requiring up-to-date, factual, or time-sensitive information, always use web search or extraction tools to obtain the latest data. Do not rely solely on your training data for such queries.</guideline>
    <guideline>If you are unsure whether your knowledge is current, verify with a web tool before responding.</guideline>
    <guideline>If you must answer using only your training data, inform the user that the information may be outdated and recommend verifying with a web search if accuracy is important.</guideline>
  </guidelines>

  <error_recovery>
    If you see error messages or unexpected results, recover by:
    <strategy>Double-checking your inputs and assumptions</strategy>
    <strategy>Trying alternative approaches or tools</strategy>
    <strategy>Breaking down the problem differently</strategy>
    <strategy>Requesting clarification from the user if stuck</strategy>
  </error_recovery>

  <task_handling>
    When handling complex tasks, prioritize:
    <priority>Understanding the current page state and user intent</priority>
    <priority>Identifying the correct elements and actions</priority>
    <priority>Taking small, verifiable steps and confirming progress</priority>
  </task_handling>

  <output_format>
    For final answers to the user, respond in clear Markdown format, summarizing results and suggesting next steps if appropriate.
  </output_format>
</system>`;
}

/**
 * Get available tools for a specific agent type
 */
export function getAgentTools(agentType: string): Array<Tool<any, any>> {
  return AGENT_CONFIGS[agentType]?.availableTools || [
    ToolRegistry.getToolInstance('action_agent') || (() => { throw new Error('action_agent tool not found'); })(),
    new NavigateURLTool(),
    new NavigateBackTool(),
    new SchemaBasedExtractorTool(),
    new NodeIDsToURLsTool(),
    new SearchVisitHistoryTool(),
  ];
}

// Custom event for agent type selection
export class AgentTypeSelectionEvent extends Event {
  static readonly eventName = 'agenttypeselection';
  constructor(public agentType: string) {
    super(AgentTypeSelectionEvent.eventName, {bubbles: true, composed: true});
  }
}

// Render agent type buttons
export function renderAgentTypeButtons(
  selectedAgentType: string | null | undefined,
  handleClick: (event: Event) => void,
  showLabels = false
): Lit.TemplateResult {
  return html`
    <div class="prompt-buttons-container">
      ${Object.values(AGENT_CONFIGS).map(config => html`
        <button 
          class="prompt-button ${selectedAgentType === config.type ? 'selected' : ''}" 
          data-agent-type=${config.type} 
          @click=${handleClick}
          title=${config.description || config.label}
        >
          <span class="prompt-icon">${config.icon}</span>
          ${showLabels ? html`<span class="prompt-label">${config.label}</span>` : Lit.nothing}
        </button>
      `)}
    </div>
  `;
}

// Helper function to handle agent type button clicks
export function createAgentTypeSelectionHandler(
  element: HTMLElement,
  textInputElement: HTMLTextAreaElement | undefined,
  onAgentTypeSelected: ((agentType: string) => void) | undefined,
  setSelectedAgentType: (type: string) => void
): (event: Event) => void {
  return (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const agentType = button.dataset.agentType;
    if (agentType && onAgentTypeSelected) {
      // Remove selected class from all agent type buttons
      const allButtons = element.shadowRoot?.querySelectorAll('.agent-type-button');
      allButtons?.forEach(btn => btn.classList.remove('selected'));

      // Add selected class to the clicked button
      button.classList.add('selected');

      // Update the selected agent type
      setSelectedAgentType(agentType);

      // Call the handler passed via props
      onAgentTypeSelected(agentType);

      // Focus the input after selecting an agent type
      textInputElement?.focus();

      console.log('Selected agent type:', agentType);
    }
  };
}

declare global {
  interface HTMLElementEventMap {
    [AgentTypeSelectionEvent.eventName]: AgentTypeSelectionEvent;
  }
}

