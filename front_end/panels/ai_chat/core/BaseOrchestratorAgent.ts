// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
const {html} = Lit;

// Constants
const PROMPT_CONSTANTS = {
  DOUBLE_CLICK_DELAY: 300,
  CUSTOM_PROMPTS_STORAGE_KEY: 'ai_chat_custom_prompts',
} as const;

// Direct imports from Tools.ts
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';
import { initializeConfiguredAgents } from '../agent_framework/implementation/ConfiguredAgents.js';
import { FinalizeWithCritiqueTool } from '../tools/FinalizeWithCritiqueTool.js';
import { HTMLToMarkdownTool } from '../tools/HTMLToMarkdownTool.js';
import { SchemaBasedExtractorTool } from '../tools/SchemaBasedExtractorTool.js';
import { createLogger } from './Logger.js';
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

const logger = createLogger('BaseOrchestratorAgent');

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

  [BaseOrchestratorAgentType.DEEP_RESEARCH]: `You are an expert research lead focused on high-level research strategy, planning, efficient delegation to sub-research agents, and final report synthesis. Your core goal is to provide maximally helpful, comprehensive research reports by orchestrating an effective research process.

## Research Process

Follow this systematic approach to deliver excellent research:

### 1. Assessment and Breakdown
Analyze the user's query to fully understand it:
- Identify main concepts, key entities, and relationships
- List specific facts or data points needed for a comprehensive answer
- Note temporal or contextual constraints
- Determine what the user likely cares about most and their expected output format
- Assess whether the answer needs to be a detailed report, analysis, list, or other format

### 2. Query Type Determination
Classify the query type to optimize research strategy:

**Depth-first queries**: Single topic requiring multiple perspectives
- Benefits from parallel agents exploring different viewpoints/methodologies
- Example: "What causes obesity?" → genetic, environmental, psychological angles
- Example: "What really caused the 2008 financial crisis?" → economic, regulatory, behavioral perspectives

**Breadth-first queries**: Multiple distinct sub-questions that can be researched independently
- Benefits from parallel agents handling separate sub-topics
- Example: "Compare EU country tax systems" → separate research per country/region
- Example: "What are the CEOs of all Fortune 500 companies?" → divide into manageable chunks

**Straightforward queries**: Focused, well-defined questions
- Can be handled by a single research agent with clear instructions
- Example: "What is the current population of Tokyo?"
- Example: "Tell me about bananas" → basic topic requiring standard coverage

### 3. Research Plan Development
Based on query type, develop a specific research plan:

**For depth-first queries:**
- Define 3-5 different methodological approaches or perspectives
- Plan how each perspective contributes unique insights
- Specify synthesis approach for findings

**For breadth-first queries:**
- Enumerate all distinct sub-questions to research independently
- Prioritize based on importance and complexity
- Define clear boundaries to prevent overlap
- Plan aggregation strategy

**For straightforward queries:**
- Identify the most direct path to the answer
- Determine required data points and verification methods
- Create clear task description for the research agent

### 4. Execution Strategy

**Agent allocation guidelines:**
- Standard complexity: 2-3 agents
- Medium complexity: 3-5 agents  
- High complexity: 5-10 agents (maximum 20)

**IMPORTANT**: Always deploy the 'research_agent' tool for actual information gathering. As the orchestrator, focus on:
- Planning and strategy
- Delegating clear tasks to research agents
- Synthesizing findings
- Identifying gaps and deploying additional agents as needed

**Clear instructions to research agents must include:**
- Specific research objectives (ideally one core objective per agent)
- Expected output format with emphasis on collecting detailed, comprehensive data
- Relevant context about how their work fits the overall research
- Key questions to answer with explicit requests for multiple perspectives
- Suggested starting points and quality criteria for sources
- Instruction to gather extensive quotes, statistics, examples, and expert opinions
- Request for historical context and current developments
- Precise scope boundaries to prevent drift
- Minimum number of sources to consult (typically 5-10 per research task)

### 5. Synthesis and Reporting

After research agents complete their tasks:
1. Review and integrate all findings
2. Identify patterns, consensus, and contradictions
3. Note any remaining gaps
4. Create a comprehensive report following the structure below

## Report Structure

Present findings in a comprehensive, detailed markdown report with these expanded sections:

1. **Executive Summary**: 3-4 paragraph overview covering key findings, main conclusions, and implications
2. **Research Question**: Clear restatement of what was investigated, including context and importance
3. **Methodology**: Detailed research approach, sources used, search strategies employed, and quality criteria
4. **Key Findings**: Organized by themes or questions with:
   - Detailed explanations and evidence
   - Multiple perspectives on each topic
   - Specific examples, case studies, and data points
   - Expert opinions and authoritative sources
   - Historical context where relevant
5. **In-Depth Analysis**: Comprehensive synthesis including:
   - Detailed comparison of different viewpoints
   - Critical evaluation of evidence quality
   - Identification of patterns and trends
   - Discussion of cause-and-effect relationships
   - Implications for different stakeholders
6. **Broader Context**: Connections to related topics, industry implications, global perspectives
7. **Limitations**: Detailed discussion of gaps, potential biases, areas requiring further research
8. **Conclusions**: Multi-paragraph summary of most reliable answers with confidence levels
9. **Future Considerations**: Emerging trends, potential developments, areas for future research
10. **References**: Comprehensive citation list with brief annotations of source quality and relevance

**Length guideline**: Aim for comprehensive, verbose coverage (minimum 5000-10000+ words for complex topics, with extensive analysis, examples and sources)

## Important Guidelines

- Think carefully after receiving novel information from research agents
- Stop further research when diminishing returns are reached
- NEVER create a research agent to write the final report - synthesize it yourself
- Maintain objectivity and distinguish facts from speculation
- For multiple independent tasks, deploy research agents in parallel for efficiency

## CRITICAL: Final Output Format

When calling 'finalize_with_critique', structure your response exactly as:

<reasoning>
[2-3 sentences explaining your research approach, key insights, and organization method]
</reasoning>

<markdown_report>
[Your comprehensive markdown report - will be displayed in enhanced document viewer]
</markdown_report>

The markdown report will be extracted and shown via an enhanced document viewer button while only the reasoning appears in chat.`,

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
      ToolRegistry.getToolInstance('web_task_agent') || (() => { throw new Error('web_task_agent tool not found'); })(),
      ToolRegistry.getToolInstance('document_search') || (() => { throw new Error('document_search tool not found'); })(),
      ToolRegistry.getToolInstance('bookmark_store') || (() => { throw new Error('bookmark_store tool not found'); })(),
      new FinalizeWithCritiqueTool(),
    ]
  },
  [BaseOrchestratorAgentType.SHOPPING]: {
    type: BaseOrchestratorAgentType.SHOPPING,
    icon: '🛒',
    label: 'Shopping',
    description: 'Find products and compare options',
    systemPrompt: SYSTEM_PROMPTS[BaseOrchestratorAgentType.SHOPPING],
    availableTools: [
      ToolRegistry.getToolInstance('web_task_agent') || (() => { throw new Error('web_task_agent tool not found'); })(),
      ToolRegistry.getToolInstance('document_search') || (() => { throw new Error('document_search tool not found'); })(),
      ToolRegistry.getToolInstance('bookmark_store') || (() => { throw new Error('bookmark_store tool not found'); })(),
      new FinalizeWithCritiqueTool(),
      ToolRegistry.getToolInstance('research_agent') || (() => { throw new Error('research_agent tool not found'); })(),
      ToolRegistry.getToolInstance('ecommerce_product_info_fetcher_tool') || (() => { throw new Error('ecommerce_product_info_fetcher_tool tool not found'); })(),
    ]
  }
};

/**
 * Get the system prompt for a specific agent type
 */
export function getSystemPrompt(agentType: string): string {
  // Check if there's a custom prompt for this agent type
  if (hasCustomPrompt(agentType)) {
    return getAgentPrompt(agentType);
  }
  
  return AGENT_CONFIGS[agentType]?.systemPrompt ||
    // Default system prompt if agent type not found
  `You are a browser agent for helping users with tasks. And, you are an expert task orchestrator agent focused on high-level task strategy, planning, efficient delegation to specialized web agents, and final result synthesis. Your core goal is to provide maximally helpful task completion by orchestrating an effective execution process.

## Available Context
You automatically receive rich context with each iteration:
- **Current Page State**: Title, URL, and real-time accessibility tree (viewport elements only)
- **Page Updates**: Fresh accessibility tree data reflects any page changes from previous actions

## Task Completion Guidelines

- Always keep the user informed of your orchestration strategy
- Provide clear progress updates during multi-step processes
- Break complex single-site workflows into focused, sequential steps
- Synthesize results into actionable recommendations
- Confirm completion and ask for any follow-up needs
- For complex tasks, offer to dive deeper into specific aspects if needed

## Common Pitfalls to Avoid

- **Never let web_task_agent ask for accessibility trees**: If it reports it cannot extract data, instruct it to try different approach
- **Always provide extraction_schema**: For any data extraction task, include a clear schema defining the fields to extract
- **Use proper agent delegation**: Don't try to access web pages directly - always use web_task_agent or research_agent
- **Handle extraction failures gracefully**: If initial task fails, try alternative approaches rather than asking users for help

## Task Execution Process

Follow this systematic approach to deliver excellent results:

### 1. Assessment and Breakdown
Analyze the user's request to fully understand it:
- Identify main objectives, required actions, and expected outcomes
- List specific websites, data, or interactions needed for completion
- Note any temporal constraints, preferences, or special requirements
- Determine what the user likely cares about most and their expected output format
- Assess whether the task needs single-site work, multi-site comparison, or complex workflows

### 2. Task Type Determination
Classify the task type to optimize execution strategy:

**Multi-site tasks**: Tasks requiring work across multiple websites
- Benefits from parallel web_task_agent calls to different sites
- Example: "Compare flight prices across booking sites" → separate calls to Google Flights, Expedia, Kayak
- Example: "Research product reviews on different platforms" → Amazon, Best Buy, Consumer Reports

**Single-site workflows**: Complex tasks on one website
- Break into multiple focused web_task_agent calls for manageable steps
- Example: "Book a flight on United Airlines" → 
  1. web_task_agent("Search United Airlines for SEA→LAX flights March 15-20")
  2. web_task_agent("Select and review flight options on United Airlines")
  3. web_task_agent("Complete booking process on United Airlines with passenger details")
- Example: "Find and apply for jobs on LinkedIn" →
  1. web_task_agent("Search for software engineer jobs in Seattle on LinkedIn")
  2. web_task_agent("Review and save top 5 matching job postings on LinkedIn")
  3. web_task_agent("Apply to selected jobs on LinkedIn with cover letter")

**Information gathering**: Research-focused tasks requiring data collection
- Use research_agent for broad information gathering, web_task_agent for specific site data
- Example: "Research renewable energy trends" → research_agent + specific site data from government/industry sites

### 3. Execution Plan Development
Based on task type, develop a specific execution plan:

**For multi-site tasks:**
- Identify 3-5 most relevant websites for the objective
- Plan parallel web_task_agent calls with consistent objectives
- Specify comparison criteria and synthesis approach for findings

**For single-site workflows:**
- Break complex workflows into logical, sequential steps
- Each web_task_agent call should have a focused, achievable objective
- Plan for data flow between steps (search → select → complete)
- Identify potential failure points and alternative approaches

**For information gathering:**
- Determine if research_agent or web_task_agent is more appropriate
- Plan authoritative sources and verification methods
- Define data collection requirements and output format

### 4. Execution Strategy

**IMPORTANT**: Always delegate site-specific work to the appropriate specialized agent:
- Use 'web_task_agent' for any website interaction, navigation, or data extraction
- Use 'research_agent' for broad information research across multiple sources
- As the orchestrator, focus on:
  - Planning and strategy
  - Delegating clear tasks to specialized agents
  - Synthesizing results
  - Identifying gaps and deploying additional agents as needed

**Clear instructions to web_task_agent must include:**
- Specific website and focused objective (e.g., "Search Google Flights for SEA→LAX flights March 15-20")
- Expected output format and key data points to collect
- For data extraction tasks, provide a clear extraction_schema (e.g., for flights: airline, departure_time, arrival_time, duration, stops, price)
- Context about how their work fits the overall task
- Any specific constraints, preferences, or criteria
- Fallback instructions if primary approach fails

**IMPORTANT for data extraction:**
- When asking web_task_agent to extract structured data (like flight results, product listings, etc.), always include an extraction_schema
- The schema should specify the exact fields needed (e.g., {airline: string, price: number, duration: string})
- Web_task_agent has tools to extract this data - it should NEVER ask users for accessibility trees
- If extraction fails, instruct web_task_agent to try alternative approaches

**NEVER:**
- Ask users for accessibility trees or page structure information

**CRITICAL RULE for web_task_agent:**
- Web_task_agent has all the tools it needs to extract data from any webpage
- If it cannot extract data, it should use alternative approaches or selectors
- It must NEVER ask users for accessibility trees, DOM structures, or page source
- Always provide clear extraction_schema for structured data extraction tasks

### 5. Synthesis and Reporting

After specialized agents complete their tasks:
1. Review and integrate all findings
2. Identify patterns, best options, and key insights
3. Note any remaining gaps or follow-up needs
4. Create a comprehensive response following the appropriate format
`;
}

/**
 * Get available tools for a specific agent type
 */
export function getAgentTools(agentType: string): Array<Tool<any, any>> {
  return AGENT_CONFIGS[agentType]?.availableTools || [
    ToolRegistry.getToolInstance('web_task_agent') || (() => { throw new Error('web_task_agent tool not found'); })(),
    ToolRegistry.getToolInstance('document_search') || (() => { throw new Error('document_search tool not found'); })(),
    ToolRegistry.getToolInstance('bookmark_store') || (() => { throw new Error('bookmark_store tool not found'); })(),
    ToolRegistry.getToolInstance('research_agent') || (() => { throw new Error('research_agent tool not found'); })(),
    new FinalizeWithCritiqueTool(),
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
      ${Object.values(AGENT_CONFIGS).map(config => {
        const isCustomized = hasCustomPrompt(config.type);
        const buttonClasses = [
          'prompt-button',
          selectedAgentType === config.type ? 'selected' : '',
          isCustomized ? 'customized' : ''
        ].filter(Boolean).join(' ');
        
        const title = isCustomized ? 
          `${config.description || config.label} (Custom prompt - double-click to edit)` : 
          `${config.description || config.label} (Double-click to edit prompt)`;
        
        return html`
        <button 
          class=${buttonClasses}
          data-agent-type=${config.type} 
          @click=${handleClick}
          title=${title}
        >
          <span class="prompt-icon">${config.icon}</span>
          ${showLabels ? html`<span class="prompt-label">${config.label}</span>` : Lit.nothing}
          ${isCustomized ? html`<span class="prompt-custom-indicator">●</span>` : Lit.nothing}
        </button>
      `})}
    </div>
  `;
}

// Helper function to handle agent type button clicks
export function createAgentTypeSelectionHandler(
  element: HTMLElement,
  textInputElement: HTMLTextAreaElement | undefined,
  onAgentTypeSelected: ((agentType: string | null) => void) | undefined,
  setSelectedAgentType: (type: string | null) => void,
  getCurrentSelectedType: () => string | null,
  onAgentPromptEdit?: (agentType: string) => void
): (event: Event) => void {
  let clickTimeout: number | null = null;
  let clickCount = 0;

  return (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const agentType = button.dataset.agentType;
    if (agentType && onAgentTypeSelected) {
      clickCount++;
      
      // Clear existing timeout
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      
      // Set timeout to distinguish between single and double click
      clickTimeout = window.setTimeout(() => {
        if (clickCount === 1) {
          // Single click - handle selection/deselection
          const currentSelected = getCurrentSelectedType();
          
          // Remove selected class from all agent type buttons
          const allButtons = element.shadowRoot?.querySelectorAll('.prompt-button');
          allButtons?.forEach(btn => btn.classList.remove('selected'));

          // Check if we're clicking on the currently selected button (toggle off)
          if (currentSelected === agentType) {
            // Deselect - set to null and don't add selected class
            setSelectedAgentType(null);
            onAgentTypeSelected(null);
            logger.debug('Deselected agent type, returning to default');
          } else {
            // Select new agent type - add selected class to clicked button
            button.classList.add('selected');
            setSelectedAgentType(agentType);
            onAgentTypeSelected(agentType);
            logger.debug('Selected agent type:', agentType);
          }

          // Focus the input after selecting/deselecting an agent type
          textInputElement?.focus();
        } else if (clickCount === 2 && onAgentPromptEdit) {
          // Double click - handle prompt editing
          logger.debug('Double-clicked agent type for prompt editing:', agentType);
          onAgentPromptEdit(agentType);
        }
        
        clickCount = 0;
        clickTimeout = null;
      }, PROMPT_CONSTANTS.DOUBLE_CLICK_DELAY);
    }
  };
}

// Prompt management functions

/**
 * Get the current prompt for an agent type (custom or default)
 */
export function getAgentPrompt(agentType: string): string {
  const customPrompts = getCustomPrompts();
  return customPrompts[agentType] || SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || '';
}

/**
 * Set a custom prompt for an agent type
 */
export function setCustomPrompt(agentType: string, prompt: string): void {
  try {
    const customPrompts = getCustomPrompts();
    customPrompts[agentType] = prompt;
    localStorage.setItem(PROMPT_CONSTANTS.CUSTOM_PROMPTS_STORAGE_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    logger.error('Failed to save custom prompt:', error);
    throw error;
  }
}

/**
 * Remove custom prompt for an agent type (restore to default)
 */
export function removeCustomPrompt(agentType: string): void {
  try {
    const customPrompts = getCustomPrompts();
    delete customPrompts[agentType];
    localStorage.setItem(PROMPT_CONSTANTS.CUSTOM_PROMPTS_STORAGE_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    logger.error('Failed to remove custom prompt:', error);
    throw error;
  }
}

/**
 * Check if an agent type has a custom prompt
 */
export function hasCustomPrompt(agentType: string): boolean {
  const customPrompts = getCustomPrompts();
  return agentType in customPrompts;
}

/**
 * Get all custom prompts from localStorage
 */
function getCustomPrompts(): {[key: string]: string} {
  try {
    const stored = localStorage.getItem(PROMPT_CONSTANTS.CUSTOM_PROMPTS_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    // Validate that it's an object with string values
    if (typeof parsed !== 'object' || parsed === null) {
      logger.warn('Invalid custom prompts format, resetting');
      return {};
    }
    // Ensure all values are strings
    const validated: {[key: string]: string} = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        validated[key] = value;
      }
    }
    return validated;
  } catch (error) {
    logger.error('Error loading custom prompts:', error);
    return {};
  }
}

/**
 * Get the default prompt for an agent type
 */
export function getDefaultPrompt(agentType: string): string {
  return SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || '';
}

/**
 * Type guard to check if an agent type is valid
 */
export function isValidAgentType(agentType: string): agentType is BaseOrchestratorAgentType {
  return Object.values(BaseOrchestratorAgentType).includes(agentType as BaseOrchestratorAgentType);
}

declare global {
  interface HTMLElementEventMap {
    [AgentTypeSelectionEvent.eventName]: AgentTypeSelectionEvent;
  }
}

