// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { TestCase } from '../framework/types.js';

/**
 * Test cases for ResearchAgent evaluation
 */

/**
 * Input schema for ResearchAgent
 */
export interface ResearchAgentArgs {
  query: string;
  reasoning: string;
}

/**
 * Basic research test - stable topic with clear sources
 */
export const basicResearchTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-basic-001',
  name: 'Research Chrome DevTools History',
  description: 'Research the history and development of Chrome DevTools',
  url: 'https://www.google.com', // Starting point for research
  tool: 'research_agent',
  input: {
    query: 'History and development of Chrome DevTools browser developer tools',
    reasoning: 'Testing basic research capabilities on a well-documented technical topic'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Research covers the origins and early development of Chrome DevTools',
        'Information includes key milestones and major feature additions',
        'Sources include official documentation or reliable technical sources',
        'At least 3-5 different sources were consulted',
        'Information is factually accurate and up-to-date',
        'Research demonstrates understanding of the topic evolution',
        'Handoff to content_writer_agent occurred with comprehensive data'
      ],
      model: 'gpt-4.1-mini',
      temperature: 0
    }
  },
  metadata: {
    tags: ['basic', 'technical', 'stable', 'documentation'],
    timeout: 180000, // 3 minutes - agents need more time
    retries: 2,
    flaky: false
  }
};

/**
 * Current events research test
 */
export const currentEventsTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-current-001',
  name: 'Research Latest AI Development Trends',
  description: 'Research recent developments in AI and machine learning (last 6 months)',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'Latest AI artificial intelligence developments breakthroughs 2024 2025',
    reasoning: 'Testing research on current events and rapidly evolving topics'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Research focuses on recent developments (within last 6 months)',
        'Covers multiple aspects of AI development (models, applications, research)',
        'Sources are current and from reputable news or research outlets',
        'Information includes specific examples or case studies',
        'Demonstrates ability to identify current trends vs older information',
        'Successfully gathered information from diverse source types',
        'Data is properly organized for content writer handoff'
      ],
      model: 'gpt-4.1-mini',
      includeUrl: true
    }
  },
  metadata: {
    tags: ['current-events', 'ai', 'dynamic', 'trends'],
    timeout: 240000, // 4 minutes for current events
    retries: 1,
    flaky: true // Current events can be dynamic
  }
};

/**
 * Comparative research test
 */
export const comparativeResearchTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-comparison-001',
  name: 'Compare JavaScript vs TypeScript',
  description: 'Research and compare JavaScript and TypeScript for web development',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'JavaScript vs TypeScript comparison web development pros cons differences',
    reasoning: 'Testing comparative research requiring balanced analysis of multiple options'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Research covers both JavaScript and TypeScript comprehensively',
        'Includes clear comparison points (syntax, features, ecosystem)',
        'Presents advantages and disadvantages of each language',
        'Sources include technical documentation and developer resources',
        'Information is balanced and objective, not biased toward one option',
        'Demonstrates understanding of use cases for each language',
        'Research data is well-organized for comparative analysis'
      ],
      model: 'gpt-4.1-mini'
    }
  },
  metadata: {
    tags: ['comparison', 'technical', 'programming', 'balanced'],
    timeout: 200000,
    retries: 2,
    flaky: false
  }
};

/**
 * Deep technical research test
 */
export const technicalDeepDiveTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-technical-001',
  name: 'Research WebAssembly Performance',
  description: 'Deep dive research into WebAssembly performance characteristics and use cases',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'WebAssembly WASM performance benchmarks use cases implementation details',
    reasoning: 'Testing deep technical research requiring specialized knowledge synthesis'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Research covers technical details of WebAssembly architecture',
        'Includes performance benchmarks and comparison data',
        'Discusses practical use cases and implementation scenarios',
        'Sources include technical specifications, benchmarks, and expert analysis',
        'Information demonstrates deep understanding of the technology',
        'Research addresses both benefits and limitations',
        'Technical accuracy is maintained throughout'
      ],
      model: 'gpt-4.1-mini'
    }
  },
  metadata: {
    tags: ['technical', 'deep-dive', 'performance', 'webassembly'],
    timeout: 300000, // 5 minutes for deep technical research
    retries: 2,
    flaky: false
  }
};

/**
 * Business research test
 */
export const businessResearchTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-business-001',
  name: 'Research Remote Work Productivity',
  description: 'Research remote work impact on productivity and business outcomes',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'Remote work productivity statistics impact business outcomes 2024 studies',
    reasoning: 'Testing business research requiring statistical data and multiple perspectives'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Research includes statistical data and survey results',
        'Covers multiple perspectives (employee, employer, industry)',
        'Sources include business publications, research studies, and reports',
        'Information addresses both positive and negative impacts',
        'Data is recent and relevant to current work trends',
        'Research demonstrates understanding of business implications',
        'Statistics and claims are properly sourced'
      ],
      model: 'gpt-4.1-mini'
    }
  },
  metadata: {
    tags: ['business', 'statistics', 'workplace', 'comprehensive'],
    timeout: 240000,
    retries: 2,
    flaky: false
  }
};

/**
 * No-results edge case test
 */
export const edgeCaseNoResultsTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-edge-001',
  name: 'Research Obscure Fictional Topic',
  description: 'Test handling of queries with very limited or no reliable sources',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'quantum bluetooth watermelon encryption algorithm 2024',
    reasoning: 'Testing edge case handling when query yields no meaningful results'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Agent recognizes when query yields limited or unreliable results',
        'Demonstrates appropriate search strategy modification',
        'Does not fabricate information when sources are unavailable',
        'Gracefully handles lack of substantive results',
        'Still attempts handoff to content writer with available information',
        'Maintains professional approach despite limited data',
        'Shows appropriate uncertainty when information is sparse'
      ],
      model: 'gpt-4.1-mini'
    }
  },
  metadata: {
    tags: ['edge-case', 'no-results', 'error-handling', 'fictional'],
    timeout: 180000,
    retries: 1,
    flaky: false
  }
};

/**
 * Tool orchestration test - focuses on how well the agent uses available tools
 */
export const toolOrchestrationTest: TestCase<ResearchAgentArgs> = {
  id: 'research-agent-tools-001',
  name: 'Research Python Framework Comparison',
  description: 'Research comparing Django vs Flask Python frameworks with focus on tool usage',
  url: 'https://www.google.com',
  tool: 'research_agent',
  input: {
    query: 'Django vs Flask Python web framework comparison features performance',
    reasoning: 'Testing effective orchestration of navigation, extraction, and fetching tools'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Agent effectively used navigate_url to access search engines',
        'Schema-based extraction was used to gather structured search results',
        'Fetcher tool was used to collect content from multiple URLs',
        'Navigation strategy was logical and systematic',
        'Tool usage demonstrated purposeful research progression',
        'Information from different tools was effectively synthesized',
        'At least 3-5 different sources were accessed and processed',
        'Final handoff included comprehensive data from all tools'
      ],
      model: 'gpt-4.1-mini'
    }
  },
  metadata: {
    tags: ['tool-orchestration', 'systematic', 'python', 'frameworks'],
    timeout: 240000,
    retries: 2,
    flaky: false
  }
};

/**
 * All test cases for ResearchAgent
 */
export const researchAgentTests: TestCase<ResearchAgentArgs>[] = [
  basicResearchTest,        // Start with stable, well-documented topic
  comparativeResearchTest,  // Test balanced analysis
  businessResearchTest,     // Test data-driven research
  toolOrchestrationTest,    // Test tool usage effectiveness
  technicalDeepDiveTest,    // Test deep technical research
  currentEventsTest,        // Test dynamic content (more flaky)
  edgeCaseNoResultsTest,    // Test edge cases last
];

/**
 * Get a specific test by ID
 */
export function getResearchTestById(id: string): TestCase<ResearchAgentArgs> | undefined {
  return researchAgentTests.find(test => test.id === id);
}

/**
 * Get tests by tag
 */
export function getResearchTestsByTag(tag: string): TestCase<ResearchAgentArgs>[] {
  return researchAgentTests.filter(test => test.metadata.tags.includes(tag));
}

/**
 * Get basic tests for quick validation
 */
export function getBasicResearchTests(): TestCase<ResearchAgentArgs>[] {
  return researchAgentTests.filter(test => 
    test.metadata.tags.includes('basic') || 
    test.metadata.tags.includes('stable') ||
    test.id === 'research-agent-comparison-001'
  );
}

/**
 * Get comprehensive test suite for full evaluation
 */
export function getComprehensiveResearchTests(): TestCase<ResearchAgentArgs>[] {
  return researchAgentTests.filter(test => 
    !test.metadata.tags.includes('edge-case') // Exclude edge cases for standard evaluation
  );
}