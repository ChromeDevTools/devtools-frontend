// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { FetcherTool } from '../../tools/FetcherTool.js';
import { FinalizeWithCritiqueTool } from '../../tools/FinalizeWithCritiqueTool.js';
import { SchemaBasedExtractorTool } from '../../tools/SchemaBasedExtractorTool.js';
import { StreamlinedSchemaExtractorTool } from '../../tools/StreamlinedSchemaExtractorTool.js';
import { NavigateURLTool, PerformActionTool, GetAccessibilityTreeTool, SearchContentTool, NavigateBackTool, NodeIDsToURLsTool, TakeScreenshotTool } from '../../tools/Tools.js';
import { AIChatPanel } from '../../ui/AIChatPanel.js';
import { ChatMessageEntity, type ChatMessage } from '../../ui/ChatView.js';
import {
  ConfigurableAgentTool,
  ToolRegistry, type AgentToolConfig, type ConfigurableAgentArgs
} from '../ConfigurableAgentTool.js';

/**
 * Initialize all configured agents
 */
export function initializeConfiguredAgents(): void {
  // Register core tools
  ToolRegistry.registerToolFactory('navigate_url', () => new NavigateURLTool());
  ToolRegistry.registerToolFactory('navigate_back', () => new NavigateBackTool());
  ToolRegistry.registerToolFactory('node_ids_to_urls', () => new NodeIDsToURLsTool());
  ToolRegistry.registerToolFactory('fetcher_tool', () => new FetcherTool());
  ToolRegistry.registerToolFactory('schema_based_extractor', () => new SchemaBasedExtractorTool());
  ToolRegistry.registerToolFactory('extract_schema_data', () => new SchemaBasedExtractorTool());
  ToolRegistry.registerToolFactory('extract_schema_streamlined', () => new StreamlinedSchemaExtractorTool());
  ToolRegistry.registerToolFactory('finalize_with_critique', () => new FinalizeWithCritiqueTool());
  ToolRegistry.registerToolFactory('perform_action', () => new PerformActionTool());
  ToolRegistry.registerToolFactory('get_page_content', () => new GetAccessibilityTreeTool());
  ToolRegistry.registerToolFactory('search_content', () => new SearchContentTool());
  ToolRegistry.registerToolFactory('take_screenshot', () => new TakeScreenshotTool());

  // Create and register Research Agent
  const researchAgentConfig = createResearchAgentConfig();
  const researchAgent = new ConfigurableAgentTool(researchAgentConfig);
  ToolRegistry.registerToolFactory('research_agent', () => researchAgent);

  // Create and register Content Writer Agent
  const contentWriterAgentConfig = createContentWriterAgentConfig();
  const contentWriterAgent = new ConfigurableAgentTool(contentWriterAgentConfig);
  ToolRegistry.registerToolFactory('content_writer_agent', () => contentWriterAgent);

  // Create and register Action Agent
  const actionAgentConfig = createActionAgentConfig();
  const actionAgent = new ConfigurableAgentTool(actionAgentConfig);
  ToolRegistry.registerToolFactory('action_agent', () => actionAgent);

  // Create and register Action Verification Agent
  const actionVerificationAgentConfig = createActionVerificationAgentConfig();
  const actionVerificationAgent = new ConfigurableAgentTool(actionVerificationAgentConfig);
  ToolRegistry.registerToolFactory('action_verification_agent', () => actionVerificationAgent);

  // Create and register specialized action agents
  const clickActionAgentConfig = createClickActionAgentConfig();
  const clickActionAgent = new ConfigurableAgentTool(clickActionAgentConfig);
  ToolRegistry.registerToolFactory('click_action_agent', () => clickActionAgent);

  const formFillActionAgentConfig = createFormFillActionAgentConfig();
  const formFillActionAgent = new ConfigurableAgentTool(formFillActionAgentConfig);
  ToolRegistry.registerToolFactory('form_fill_action_agent', () => formFillActionAgent);

  const keyboardInputActionAgentConfig = createKeyboardInputActionAgentConfig();
  const keyboardInputActionAgent = new ConfigurableAgentTool(keyboardInputActionAgentConfig);
  ToolRegistry.registerToolFactory('keyboard_input_action_agent', () => keyboardInputActionAgent);

  const hoverActionAgentConfig = createHoverActionAgentConfig();
  const hoverActionAgent = new ConfigurableAgentTool(hoverActionAgentConfig);
  ToolRegistry.registerToolFactory('hover_action_agent', () => hoverActionAgent);

  const scrollActionAgentConfig = createScrollActionAgentConfig();
  const scrollActionAgent = new ConfigurableAgentTool(scrollActionAgentConfig);
  ToolRegistry.registerToolFactory('scroll_action_agent', () => scrollActionAgent);

  // Create and register E-commerce Product Information Assistant Agent
  const ecommerceProductInfoAgentConfig = createEcommerceProductInfoAgentConfig();
  const ecommerceProductInfoAgent = new ConfigurableAgentTool(ecommerceProductInfoAgentConfig);
  ToolRegistry.registerToolFactory('ecommerce_product_info_fetcher_tool', () => ecommerceProductInfoAgent);
}

/**
 * Create the configuration for the Research Agent
 */
function createResearchAgentConfig(): AgentToolConfig {
  return {
    name: 'research_agent',
    description: 'Performs in-depth research on a specific query autonomously using multiple steps and internal tool calls (navigation, fetching, extraction). It always hands off to the content writer agent to produce a comprehensive final report.',
    systemPrompt: `You are an autonomous research agent that executes as a single tool call with NO conversational state. You must complete your entire research task in one execution without asking questions or waiting for responses.

## CRITICAL: This is a Tool Execution, Not a Conversation
- You are called as a tool to research a specific query
- There is NO user to respond to questions - complete the task automatically
- DO NOT ask "Would you like me to..." or wait for instructions
- Execute your full research process autonomously and then hand off

## Required Research Process (Execute Automatically):

1. **Navigate and Search**: Use navigate_url to go to search engines for the research query
2. **Extract Search Results**: Use schema_based_extractor to collect URLs, titles, snippets from search results  
3. **Fetch Content**: Use fetcher_tool on ALL discovered URLs to gather comprehensive source material
4. **Document Sources**: Keep track of all URLs, titles, and key information from each source
5. **Gather Comprehensive Data**: Collect information from at least 3-5 diverse sources automatically
6. **Complete Research**: Continue gathering data until you have comprehensive coverage

## MANDATORY: Document Your Research Process
You MUST explicitly show your research process by:
- ALWAYS state which tool you're using and why (e.g., "Using navigate_url to search for...")
- ALWAYS document each source with its URL and title when using fetcher_tool
- ALWAYS extract specific quotes, statistics, and facts with their source attribution
- ALWAYS organize findings by source with clear citations

Example format for documenting sources:
"Using fetcher_tool to gather content from [Source Title] (URL: https://example.com)..."
"Key findings from this source include: [specific quotes, facts, statistics]"

## Research Output Requirements:
When gathering information, structure your findings as:
- Source 1: [Title] (URL)
  - Key facts: [specific information with quotes where applicable]
  - Relevant statistics: [numbers with context]
  - Expert opinions: [attributed quotes]
  
- Source 2: [Title] (URL)
  - [Continue pattern...]

## MANDATORY: Automatic Handoff When Research Complete
Once you have gathered comprehensive data from multiple sources with proper citations, you MUST automatically hand off to content_writer_agent. The handoff will happen automatically via configuration - just complete your research thoroughly.

## Research Execution Standards:
- Gather information from diverse, reliable sources automatically
- Document EVERY source with URL and title
- Extract SPECIFIC quotes and facts, not general summaries
- Include publication dates where available
- Show clear attribution for all information
- Maintain a research trail that can be verified

## Important: Autonomous Operation
- Execute all research steps automatically in sequence
- Document your tool usage explicitly in your output
- Complete the full research scope in one execution
- Gather enough cited, verifiable data for a detailed final report
- The handoff to content_writer_agent happens automatically when you finish

Remember: You are a tool that executes research autonomously. Complete your task fully with proper citations and let the automatic handoff handle the next step.`,
    tools: [
      'navigate_url',
      'navigate_back',
      'fetcher_tool',
      'schema_based_extractor',
      'node_ids_to_urls'
    ],
    maxIterations: 15,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0,
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The specific research question or topic to investigate in depth.'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized research agent.'
        },
      },
      required: ['query', 'reasoning']
    },
    handoffs: [
      {
        targetAgentName: 'content_writer_agent',
        trigger: 'llm_tool_call',
        includeToolResults: ['fetcher_tool', 'schema_based_extractor']
      },
      {
        targetAgentName: 'content_writer_agent',
        trigger: 'max_iterations',
        includeToolResults: ['fetcher_tool', 'schema_based_extractor']
      }
    ],
  };
}

/**
 * Create the configuration for the Content Writer Agent
 */
function createContentWriterAgentConfig(): AgentToolConfig {
  return {
    name: 'content_writer_agent',
    description: 'Writes detailed, well-structured reports based on research data. Creates an outline and then builds a comprehensive markdown report with proper structure, citations, and detailed information.',
    systemPrompt: `You are a senior researcher tasked with writing a cohesive report for a research query. 
You will be provided with the original query, and research data collected by a research assistant.

## Receiving Handoff from Research Agent
You are specifically designed to collaborate with the research_agent. When you receive a handoff, you'll be provided with:
- The original research query
- Collected research data, which may include web content, extractions, analysis, and other information
- Your job is to organize this information into a comprehensive, well-structured report

Your process should follow these steps:
1. Carefully analyze all the research data provided during the handoff
2. Identify key themes, findings, and important information from the data
3. Create a detailed outline for the report with clear sections and subsections
4. Generate a comprehensive report following your outline

## Here is an example of the final report structure (you can come up with your own structure that is better for the user's query):

1. **Title**: A concise, descriptive title for the report
2. **Executive Summary**: Brief overview summarizing the key findings and conclusions
3. **Introduction**: Context, importance of the topic, and research questions addressed
4. **Methodology**: How the research was conducted (when applicable)
5. **Main Body**: Organized by themes or topics with detailed analysis of findings
   - Include sections and subsections as appropriate
   - Support claims with evidence from the research
   - Address counterarguments when relevant
   - Use examples, case studies, or data to illustrate points
6. **Analysis/Discussion**: Synthesis of information, highlighting patterns, connections, and insights
7. **Implications**: Practical applications or theoretical significance of the findings
8. **Limitations**: Acknowledge limitations of the research or data
9. **Conclusion**: Summary of key points and final thoughts
10. **References**: Properly formatted citations for all sources used

The final output should be in markdown format, and it should be lengthy and detailed. Aim for 5-10 pages of content, at least 1000 words.`,
    tools: [],
    maxIterations: 3,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.3,
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The original research question or topic that was investigated.'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized content writing agent.'
        },
      },
      required: ['query', 'reasoning']
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Action Agent
 */
function createActionAgentConfig(): AgentToolConfig {
  return {
    name: 'action_agent',
    description: 'Executes a single, low-level browser action with enhanced targeting precision (such as clicking a button, filling a field, selecting an option, or scrolling) on the current web page, based on a clear, actionable objective. ENHANCED FEATURES: XPath-aware element targeting, HTML tag context understanding, improved accessibility tree with reduced noise. This tool is limited to one atomic action per invocation and is not suitable for multi-step or high-level goals. It relies on the enhanced accessibility tree to identify elements with greater precision and does not verify whether the action succeeded. Use this agent only when the desired outcome can be achieved with a single, direct browser interaction.',
    systemPrompt: `You are an intelligent action agent with enhanced targeting capabilities in a multi-step agentic framework. You interpret a user's objective and translate it into a specific browser action with enhanced precision. Your task is to:

1. Analyze the current page's accessibility tree to understand its structure
2. Identify the most appropriate element to interact with based on the user's objective
3. Determine the correct action to perform (click, fill, type, etc.)
4. Execute that action precisely

## ENHANCED CAPABILITIES AVAILABLE
When analyzing page structure, you have access to:
- XPath mappings for precise element targeting and location understanding
- HTML tag names for semantic understanding beyond accessibility roles
- URL mappings for direct link destinations
- Clean accessibility tree with reduced noise for better focus

## Process Flow
1. When given an objective, first analyze the page structure using get_page_content tool to access the enhanced accessibility tree or use schema_based_extractor to extract the specific element you need to interact with
2. Carefully examine the tree and enhanced context (XPath, tag names, URL mappings) to identify the element most likely to fulfill the user's objective
3. Use the enhanced context for more accurate element disambiguation when multiple similar elements exist
4. Determine the appropriate action method based on the element type and objective:
   - For links, buttons: use 'click'
   - For checkboxes: use 'check' (to check), 'uncheck' (to uncheck), or 'setChecked' (to set to specific state)
   - For radio buttons: use 'click' 
   - For input fields: use 'fill' with appropriate text
   - For dropdown/select elements: use 'selectOption' with the option value or text
5. Execute the action using perform_action tool (which now has enhanced xpath resolution and element identification)
6. If an action fails, analyze the error message and try again with a different approach, leveraging the enhanced context for better targeting

## Important Considerations
- Be precise in your element selection, using the exact nodeId from the accessibility tree
- Leverage XPath information when available for more precise element targeting
- Use HTML tag context to better understand element semantics
- Use URL mappings to identify link destinations when relevant to the objective
- Match the action type to the element type (don't try to 'fill' a button or 'click' a select element)
- When filling forms, ensure the data format matches what the field expects
- For checkboxes, prefer 'check'/'uncheck' over 'click' for better reliability
- For dropdowns, use 'selectOption' with the visible text or value of the option you want to select
- For complex objectives, you may need to break them down into multiple actions

## Method Examples
- perform_action with method='check' for checkboxes: { "method": "check", "nodeId": 123 }
- perform_action with method='selectOption' for dropdowns: { "method": "selectOption", "nodeId": 456, "args": { "text": "United States" } }
- perform_action with method='setChecked' for specific checkbox state: { "method": "setChecked", "nodeId": 789, "args": { "checked": true } }`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
      'node_ids_to_urls',
      'navigate_url',
      'scroll_page',
    ],
    maxIterations: 10,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.5,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of the desired action (e.g., "click the login button", "fill the search box with \'query\'").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized action agent.'
        },
        hint: {
          type: 'string',
          description: 'Feedback for the previous action agent failure. Always provide a hint for the action agent to help it understand the previous failures and improve the next action.'
        },
        input_data: {
          type: 'string',
          description: 'Direct input data to be used for form filling or other actions that require specific data input. Provide the data in xml format.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      // For the action agent, we use the objective as the primary input, not the query field
      return [{
        entity: ChatMessageEntity.USER,
        text: `Objective: ${args.objective}\n
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
${args.input_data ? `Input Data: ${args.input_data}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Action Verification Agent
 */
function createActionVerificationAgentConfig(): AgentToolConfig {
  return {
    name: 'action_verification_agent',
    description: 'Verifies that actions performed by the action agent were successful by analyzing the page state after action execution and confirming expected outcomes.',
    systemPrompt: `You are a specialized verification agent responsible for determining whether an action was successfully completed. Your task is to analyze the page state after an action has been performed and verify whether the expected outcome was achieved.

## Verification Process
1. Review the original objective that was given to the action agent
2. Understand what action was attempted (click, fill, etc.) and on which element
3. Analyze the current page state using available tools to determine if the expected outcome was achieved
4. Provide a clear verification result with supporting evidence

## Verification Methods
Based on the action type, use different verification strategies:

### For Click Actions:
- Check if a new page loaded or the URL changed
- Verify if expected elements appeared or disappeared
- Look for confirmation messages or success indicators
- Check if any error messages appeared

### For Form Fill Actions:
- Verify the field contains the expected value
- Look for validation messages (success or error)
- Check if form was successfully submitted
- Monitor for any error messages

### For Navigation Actions:
- Confirm the URL matches the expected destination
- Verify page title or key content matches expectations
- Check for any navigation errors in console logs

### Visual Verification:
- Use take_screenshot tool to capture the current page state
- Compare visual elements to expected outcomes
- Document any visual anomalies or unexpected UI states

## Tools to Use
- get_page_content: Examine the updated page structure
- search_content: Look for specific text indicating success/failure
- inspect_element: Check properties of specific elements
- get_console_logs: Check for errors or success messages in the console
- schema_based_extractor: Extract structured data to verify expected outcomes

## Output Format
Provide a clear verification report with:
1. Action Summary: Brief description of the action that was attempted
2. Verification Result: Clear SUCCESS or FAILURE classification
3. Confidence Level: High, Medium, or Low confidence in your verification
4. Evidence: Specific observations that support your conclusion
5. Explanation: Reasoning behind your verification result

Remember that verification is time-sensitive - the page state might change during your analysis, so perform verifications promptly and efficiently.`,
    tools: [
      'search_content',
      'inspect_element',
      'get_console_logs',
      'schema_based_extractor',
      'take_screenshot'
    ],
    maxIterations: 3,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.2,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The original objective that was given to the action agent.'
        },
        action_performed: {
          type: 'string',
          description: 'Description of the action that was performed (e.g., "clicked login button", "filled search field").'
        },
        expected_outcome: {
          type: 'string',
          description: 'The expected outcome or success criteria for the action (e.g., "form submitted", "new page loaded").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this verification agent.'
        },
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Verification Request:
Objective: ${args.objective}
${args.action_performed ? `Action Performed: ${args.action_performed}` : ''}
${args.expected_outcome ? `Expected Outcome: ${args.expected_outcome}` : ''}
Reasoning: ${args.reasoning}

Please verify if the action was successfully completed and achieved its intended outcome.`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Click Action Agent
 */
function createClickActionAgentConfig(): AgentToolConfig {
  return {
    name: 'click_action_agent',
    description: 'Specialized agent for clicking buttons, links, and other clickable elements on a webpage. Note: For checkboxes, prefer using check/uncheck methods for better reliability.',
    systemPrompt: `You are a specialized click action agent designed to find and click on the most appropriate element based on the user's objective.

## Your Specialized Skills
You excel at:
1. Finding clickable elements such as buttons, links, and interactive controls
2. Determining which element best matches the user's intention
3. Executing precise click actions to trigger the intended interaction

## Important: When NOT to Use Click
- For checkboxes: Use 'check'/'uncheck' methods instead for better reliability
- For dropdown/select elements: Use 'selectOption' method instead

## Process Flow
1. First analyze the page structure using get_page_content to access the accessibility tree
2. Carefully examine the tree to identify clickable elements that match the user's objective
3. Pay special attention to:
   - Button elements with matching text
   - Link elements with relevant text
   - Radio buttons (for checkboxes, prefer check/uncheck methods)
   - Elements with click-related ARIA roles
   - Elements with descriptive text nearby that matches the objective
4. Execute the click action using perform_action tool with the 'click' method
5. If a click fails, try alternative elements that might fulfill the same function

## Selection Guidelines
When selecting an element to click, prioritize:
- Elements with exact text matches to the user's request
- Elements with clear interactive roles (button, link)
- Elements positioned logically in the page context
- Elements with appropriate ARIA labels or descriptions
- Elements that are currently visible and enabled`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
      'node_ids_to_urls',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.7,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of what to click (e.g., "click the login button", "select the checkbox").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized click agent.'
        },
        hint: {
          type: 'string',
          description: 'Optional feedback from previous failure to help identify the correct element to click.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Click Objective: ${args.objective}\n
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Form Fill Action Agent
 */
function createFormFillActionAgentConfig(): AgentToolConfig {
  return {
    name: 'form_fill_action_agent',
    description: 'Specialized agent for filling form input fields like text boxes, search fields, and text areas with appropriate text.',
    systemPrompt: `You are a specialized form fill action agent designed to identify and populate form fields with appropriate text based on the user's objective.

## Your Specialized Skills
You excel at:
1. Finding input fields, text areas, and form controls
2. Determining which field matches the user's intention
3. Filling the field with appropriate, well-formatted text
4. Handling different types of form inputs

## Process Flow
1. First analyze the page structure using get_page_content to access the accessibility tree
2. Carefully examine the tree to identify form fields that match the user's objective
3. Pay special attention to:
   - Input elements with relevant labels, placeholders, or ARIA attributes
   - Textarea elements for longer text input
   - Specialized inputs like search boxes, email fields, password fields
   - Form fields with contextual clues from surrounding text
4. Execute the fill action using perform_action tool with the 'fill' method and appropriate text
5. If a fill action fails, analyze why (format issues, disabled field, etc.) and try alternatives

## Selection Guidelines
When selecting a form field to fill, prioritize:
- Fields with labels or placeholders matching the user's request
- Fields that accept the type of data being entered (text vs number vs email)
- Currently visible and enabled fields
- Fields in the logical flow of the form (if multiple fields exist)
- Fields that are required but empty

## Data Formatting Guidelines
- Format text appropriately for the field type (email format for email fields, etc.)
- Use appropriate capitalization and punctuation
- For passwords, ensure they meet typical complexity requirements
- For search queries, keep them concise and focused
- For dates, use appropriate format based on context`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.7,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of what form field to fill and with what text (e.g., "fill the search box with \'vacation rentals\'", "enter \'user@example.com\' in the email field").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized form fill agent.'
        },
        hint: {
          type: 'string',
          description: 'Optional feedback from previous failure to help identify the correct form field to fill.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Form Fill Objective: ${args.objective}\n
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Keyboard Input Action Agent
 */
function createKeyboardInputActionAgentConfig(): AgentToolConfig {
  return {
    name: 'keyboard_input_action_agent',
    description: 'Specialized agent for sending keyboard inputs like Enter, Tab, arrow keys, and other special keys to navigate or interact with the page.',
    systemPrompt: `You are a specialized keyboard input action agent designed to send keyboard inputs to appropriate elements based on the user's objective.

## Your Specialized Skills
You excel at:
1. Determining which keyboard inputs will achieve the user's goal
2. Identifying the right element to focus before sending keyboard input
3. Executing precise keyboard actions for navigation and interaction
4. Understanding the context where keyboard shortcuts are most appropriate

## Process Flow
1. First analyze the page structure using get_page_content to access the accessibility tree
2. Determine which element should receive the keyboard input
3. Identify the appropriate keyboard key to send (Enter, Tab, Arrow keys, etc.)
4. Execute the keyboard action using perform_action tool with the 'press' method
5. If a keyboard action fails, analyze why and try alternative approaches

## Common Keyboard Uses
- Enter key: Submit forms, activate buttons, trigger default actions
- Tab key: Navigate between focusable elements
- Arrow keys: Navigate within components like dropdowns, menus, sliders
- Escape key: Close dialogs, cancel operations
- Space key: Toggle checkboxes, activate buttons
- Modifier combinations: Specialized functions (not all supported in this context)

## Selection Guidelines
When selecting an element for keyboard input, prioritize:
- Elements that are interactive and keyboard-accessible
- Elements that are currently visible and enabled
- Elements that have keyboard event listeners
- Elements that are logical recipients based on the user's objective`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.7,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of what keyboard input to send and to which element (e.g., "press Enter in the search box", "use arrow keys to navigate the menu").'
        },
        key: {
          type: 'string',
          description: 'The specific key to press (e.g., "Enter", "Tab", "ArrowDown").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized keyboard input agent.'
        },
        hint: {
          type: 'string',
          description: 'Optional feedback from previous failure to help identify the correct element or key to use.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Keyboard Input Objective: ${args.objective}\n
${args.key ? `Key to Press: ${args.key}\n` : ''}
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Hover Action Agent
 */
function createHoverActionAgentConfig(): AgentToolConfig {
  return {
    name: 'hover_action_agent',
    description: 'Specialized agent for hovering over elements to trigger tooltips, dropdown menus, or other hover-activated content.',
    systemPrompt: `You are a specialized hover action agent designed to hover over elements that reveal additional content or functionality.

## Your Specialized Skills
You excel at:
1. Identifying elements that have hover-triggered behaviors
2. Determining which element to hover over based on the user's objective
3. Executing precise hover actions to reveal hidden content
4. Understanding hover interactions in modern web interfaces

## Process Flow
1. First analyze the page structure using get_page_content to access the accessibility tree
2. Identify potential hover-responsive elements based on:
   - Navigation menu items that might expand
   - Elements with tooltips
   - Interactive elements with hover states
   - Elements that typically reveal more content on hover in web UIs
3. Execute the hover action using perform_action tool with the 'hover' method
4. Analyze the results to confirm whether the hover revealed the expected content

## Types of Hover-Responsive Elements
- Navigation menu items (especially those with submenus)
- Buttons or icons with tooltips
- Information icons (i, ? symbols)
- Truncated text that expands on hover
- Images with zoom or overlay features
- Interactive data visualization elements
- Cards or elements with hover animations or state changes

## Selection Guidelines
When selecting an element to hover over, prioritize:
- Elements that match the user's objective in terms of content or function
- Elements that are visible and positioned logically for hover interaction
- Elements with visual cues suggesting hover interactivity
- Elements that follow standard web patterns for hover interaction`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.7,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of what element to hover over (e.g., "hover over the menu item", "show the tooltip for the info icon").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized hover action agent.'
        },
        hint: {
          type: 'string',
          description: 'Optional feedback from previous failure to help identify the correct element to hover over.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Hover Objective: ${args.objective}\n
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the Scroll Action Agent
 */
function createScrollActionAgentConfig(): AgentToolConfig {
  return {
    name: 'scroll_action_agent',
    description: 'Specialized agent for scrolling to specific elements, revealing content below the fold, or navigating through scrollable containers.',
    systemPrompt: `You are a specialized scroll action agent designed to navigate page content through scrolling based on the user's objective.

## Your Specialized Skills
You excel at:
1. Identifying elements that need to be scrolled into view
2. Finding scrollable containers within the page
3. Executing precise scroll actions to reveal content
4. Navigating long pages or specialized scrollable components

## Process Flow
1. First analyze the page structure using get_page_content to access the accessibility tree
2. Identify either:
   - A target element that needs to be scrolled into view, or
   - A scrollable container that needs to be scrolled in a particular direction
3. Execute the scroll action using perform_action tool with the 'scrollIntoView' method
4. Verify that the intended content is now visible

## Types of Scroll Scenarios
- Scrolling to an element that's below the visible viewport
- Scrolling within a scrollable container (like a div with overflow)
- Scrolling to specific sections of a long document
- Scrolling to reveal more results in infinite-scroll pages
- Scrolling horizontally in carousels or horizontal containers

## Selection Guidelines
When determining what to scroll to, prioritize:
- Elements that match the user's objective in terms of content
- Elements that are likely to be outside the current viewport
- Named sections or landmarks mentioned in the objective
- Elements with IDs or anchor links that match the objective

## Scrollable Container Detection
The accessibility tree includes information about scrollable containers. Look for:
- Elements marked with role that indicates scrollability
- Elements where content exceeds visible area
- Elements with explicit overflow properties`,
    tools: [
      'get_page_content',
      'perform_action',
      'schema_based_extractor',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.7,
    schema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The natural language description of where to scroll to (e.g., "scroll to the contact form", "scroll down to see more results").'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized scroll action agent.'
        },
        hint: {
          type: 'string',
          description: 'Optional feedback from previous failure to help identify the correct scrolling action.'
        }
      },
      required: ['objective', 'reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `Scroll Objective: ${args.objective}\n
Reasoning: ${args.reasoning}\n
${args.hint ? `Hint: ${args.hint}` : ''}
`,
      }];
    },
    handoffs: [],
  };
}

/**
 * Create the configuration for the E-commerce Product Information Assistant Agent
 */
function createEcommerceProductInfoAgentConfig(): AgentToolConfig {
  return {
    name: 'ecommerce_product_info_fetcher_tool',
    description: `Extracts and organizes comprehensive product information from an e-commerce product page.
- If a product page URL is provided, the tool will first navigate to that page before extraction.
- Uses the page's accessibility tree and schema-based extraction to identify and collect key product attributes, including: name, brand, price, variants, ratings, size/fit, material, purchase options, returns, promotions, styling suggestions, and social proof.
- Adapts extraction to the product category (e.g., clothing, electronics, home goods).
- Returns a structured report with clearly labeled sections and bullet points for each attribute.
- Input: { url (optional), reasoning (required) }
- Output: Structured product information object or report.
- Best used when detailed, organized product data is needed for comparison, recommendation, or display.
- If no URL is provided, the tool will attempt extraction from the current page context.`,
    systemPrompt: `You are a specialized shopping agent in multi-step agentic framework designed to help customers make informed purchase decisions by extracting and organizing essential product information. Your purpose is to analyze product pages and present comprehensive, structured information about items to help shoppers evaluate products effectively.

## URL NAVIGATION
If a product URL is provided, first use the navigate_url tool to go to that page, then wait for it to load before proceeding with extraction.

## Core Responsibilities:
- Identify and extract critical product attributes from e-commerce pages
- Present information in a clear, organized manner
- Maintain objectivity while highlighting key decision factors
- Adapt your analysis to different product categories appropriately

## Essential Product Attributes to Identify:
1. **Basic Product Information**
   - Product name, brand, and category
   - Current price, original price, and any promotional discounts
   - Available color and style variants
   - Customer ratings and review count

2. **Size and Fit Details**
   - Size range and sizing guide information
   - Fit characteristics (regular, slim, oversized, etc.)
   - Customer feedback on sizing accuracy
   - Key measurements relevant to the product type

3. **Material and Construction**
   - Primary materials and fabric composition
   - Special design features or technologies
   - Care instructions and maintenance requirements
   - Country of origin/manufacturing information

4. **Purchase Options**
   - Shipping and delivery information
   - Store pickup availability
   - Payment options and financing

5. **Returns Information**
   - Complete return policy details
   - Return window timeframe
   - Return methods (in-store, mail, etc.)
   - Any restrictions on returns
   - Refund processing information

6. **Special Offers and Promotions**
   - Current discounts and sales
   - Loyalty program benefits applicable to the item
   - Gift options available (gift wrapping, messages)
   - Bundle deals or multi-item discounts
   - Credit card or payment method special offers

7. **Outfit and Styling Suggestions**
   - "Complete the look" recommendations
   - Suggested complementary items
   - Seasonal styling ideas
   - Occasion-based outfit recommendations
   - Styling tips from the brand or other customers

8. **Social Proof Elements**
   - Review summaries and sentiment
   - Popularity indicators (view counts, "trending" status)
   - User-generated content (customer photos)
   - Expert recommendations or endorsements

## Presentation Guidelines:
- Organize information in clearly labeled sections with headings
- Use bullet points for easy scanning of key details
- Present factual information without marketing language
- Highlight information that addresses common customer concerns
- Include any special considerations for the specific product category

## Response Style:
- Clear, concise, and factual
- Professional but conversational
- Thorough without overwhelming
- Focused on helping customers make informed decisions

## Process Flow:
1. If a URL is provided, use navigate_url tool to go to that page first
2. Then analyze the page structure using get_page_content to access the accessibility tree
3. Use schema_based_extractor to extract structured product information when possible
4. If needed, use search_content to find specific product details that may be in different sections
5. Compile all information into a comprehensive, organized report following the presentation guidelines
6. Present the information in a structured format that makes it easy for shoppers to understand all aspects of the item

Remember to adapt your analysis based on the product category - different attributes will be more important for electronics versus clothing versus home goods.`,
    tools: [
      'navigate_url',
      'get_page_content',
    ],
    maxIterations: 5,
    modelName: () => AIChatPanel.getMiniModel(),
    temperature: 0.2,
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional URL of the product page to navigate to before extracting information.'
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for invoking this specialized e-commerce product information assistant.'
        },
      },
      required: ['reasoning']
    },
    prepareMessages: (args: ConfigurableAgentArgs): ChatMessage[] => {
      return [{
        entity: ChatMessageEntity.USER,
        text: `${args.url ? `Product URL: ${args.url}\n` : ''}${args.product_query ? `Product Query: ${args.product_query}\n` : ''}

Only return the product information, no other text. DO NOT HALLUCINATE`,
      }];
    },
    handoffs: [],
  };
}
