// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { TestResult, TestCase } from './types.js';

/**
 * Agent conversation information extracted from test output
 */
interface AgentConversationInfo {
  toolsUsed: string[];
  stepCount: number;
  handoffOccurred: boolean;
  handoffTarget?: string;
  iterations: number;
  researchSources?: string[];
  errorCount: number;
  finalStatus: string;
}

/**
 * Generates detailed markdown reports for evaluation results
 */
export class MarkdownReportGenerator {
  
  /**
   * Generate a comprehensive markdown report for test results
   */
  static generateDetailedReport(
    results: TestResult[], 
    testCases: TestCase[], 
    options: {
      title?: string;
      includeConversationDetails?: boolean;
      includeFailureDetails?: boolean;
      includePerformanceMetrics?: boolean;
    } = {}
  ): string {
    const {
      title = 'Evaluation Test Report',
      includeConversationDetails = true,
      includeFailureDetails = true,
      includePerformanceMetrics = true
    } = options;

    const markdown: string[] = [];

    // Header
    markdown.push(`# ${title}`);
    markdown.push('');
    markdown.push(`**Generated:** ${new Date().toLocaleString()}`);
    markdown.push(`**Total Tests:** ${results.length}`);
    markdown.push('');

    // Executive Summary
    const summary = this.generateSummary(results);
    markdown.push('## Executive Summary');
    markdown.push('');
    markdown.push(`- **Success Rate:** ${summary.successRate}%`);
    markdown.push(`- **Passed:** ${summary.passed}/${summary.total}`);
    markdown.push(`- **Failed:** ${summary.failed}/${summary.total}`);
    markdown.push(`- **Errors:** ${summary.errors}/${summary.total}`);
    markdown.push(`- **Average Duration:** ${summary.avgDuration}ms`);
    
    if (summary.avgLLMScore > 0) {
      markdown.push(`- **Average LLM Score:** ${summary.avgLLMScore}/100`);
    }
    
    if (summary.agentMetrics) {
      markdown.push(`- **Average Agent Iterations:** ${summary.agentMetrics.avgIterations}`);
      markdown.push(`- **Handoff Rate:** ${summary.agentMetrics.handoffRate}%`);
    }
    markdown.push('');

    // Performance Metrics
    if (includePerformanceMetrics) {
      markdown.push('## Performance Metrics');
      markdown.push('');
      this.addPerformanceMetrics(markdown, results);
      markdown.push('');
    }

    // Test Categories Analysis
    markdown.push('## Test Categories');
    markdown.push('');
    this.addCategoryAnalysis(markdown, results, testCases);
    markdown.push('');

    // Detailed Test Results
    markdown.push('## Detailed Test Results');
    markdown.push('');

    for (const result of results) {
      const testCase = testCases.find(tc => tc.id === result.testId);
      markdown.push(`### ${testCase?.name || result.testId}`);
      markdown.push('');
      
      // Test metadata
      markdown.push(`**Status:** ${this.getStatusEmoji(result.status)} ${result.status.toUpperCase()}`);
      markdown.push(`**Duration:** ${result.duration}ms`);
      
      if (testCase) {
        markdown.push(`**URL:** ${testCase.url}`);
        markdown.push(`**Tags:** ${testCase.metadata?.tags?.join(', ') || 'None'}`);
        markdown.push(`**Description:** ${testCase.description}`);
      }
      
      if (result.validation?.llmJudge?.score) {
        markdown.push(`**LLM Score:** ${result.validation.llmJudge.score}/100`);
      }
      markdown.push('');

      // Agent conversation details (for agent tests)
      if (includeConversationDetails && result.output && result.status === 'passed') {
        this.addConversationDetails(markdown, result.output);
      }

      // Validation details
      if (result.validation) {
        markdown.push('#### Validation Results');
        markdown.push('');
        markdown.push(`**Overall:** ${result.validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
        markdown.push(`**Summary:** ${result.validation.summary}`);
        
        if (result.validation.llmJudge) {
          const judge = result.validation.llmJudge;
          markdown.push('');
          markdown.push('**LLM Judge Evaluation:**');
          markdown.push(`- Score: ${judge.score}/100`);
          markdown.push(`- Explanation: ${judge.explanation}`);
          
          if (judge.issues && judge.issues.length > 0) {
            markdown.push('- Issues:');
            judge.issues.forEach(issue => {
              markdown.push(`  - ${issue}`);
            });
          }
        }
        markdown.push('');
      }

      // Raw tool/agent response
      if (result.rawResponse !== undefined) {
        markdown.push('#### RAW Response');
        markdown.push('');
        markdown.push('```json');
        markdown.push(JSON.stringify(result.rawResponse, null, 2));
        markdown.push('```');
        markdown.push('');
      }

      // Failure details
      if (includeFailureDetails && (result.status === 'failed' || result.status === 'error')) {
        markdown.push('#### Failure Details');
        markdown.push('');
        if (result.error) {
          markdown.push('```');
          markdown.push(result.error);
          markdown.push('```');
        }
        markdown.push('');
      }

      markdown.push('---');
      markdown.push('');
    }

    // Tool Usage Analysis (for agent tests)
    const agentResults = results.filter(r => r.output && this.hasAgentConversation(r.output));
    if (agentResults.length > 0) {
      markdown.push('## Agent Tool Usage Analysis');
      markdown.push('');
      this.addToolUsageAnalysis(markdown, agentResults);
      markdown.push('');
    }

    // Recommendations
    markdown.push('## Recommendations');
    markdown.push('');
    this.addRecommendations(markdown, results, summary);

    return markdown.join('\n');
  }

  /**
   * Generate a summary of test results
   */
  private static generateSummary(results: TestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const successRate = Math.round((passed / total) * 100);
    const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total);

    const withLLMScores = results.filter(r => r.validation?.llmJudge?.score);
    const avgLLMScore = withLLMScores.length > 0 ? 
      Math.round(withLLMScores.reduce((sum, r) => sum + (r.validation?.llmJudge?.score || 0), 0) / withLLMScores.length) : 0;

    // Agent-specific metrics
    const agentResults = results.filter(r => r.output && this.hasAgentConversation(r.output));
    let agentMetrics = null;
    if (agentResults.length > 0) {
      const iterations = agentResults.map(r => this.extractAgentInfo(r.output).iterations);
      const avgIterations = Math.round((iterations.reduce((sum, i) => sum + i, 0) / iterations.length) * 10) / 10;
      const handoffCount = agentResults.filter(r => this.extractAgentInfo(r.output).handoffOccurred).length;
      const handoffRate = Math.round((handoffCount / agentResults.length) * 100);
      
      agentMetrics = { avgIterations, handoffRate };
    }

    return {
      total, passed, failed, errors, successRate, avgDuration, avgLLMScore, agentMetrics
    };
  }

  /**
   * Add performance metrics section
   */
  private static addPerformanceMetrics(markdown: string[], results: TestResult[]) {
    const durations = results.map(r => r.duration).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    markdown.push('| Metric | Value |');
    markdown.push('|--------|-------|');
    markdown.push(`| Min Duration | ${min}ms |`);
    markdown.push(`| P50 Duration | ${p50}ms |`);
    markdown.push(`| P95 Duration | ${p95}ms |`);
    markdown.push(`| Max Duration | ${max}ms |`);

    // Timeout analysis
    const timeouts = results.filter(r => r.duration > 60000);
    if (timeouts.length > 0) {
      markdown.push(`| Tests >60s | ${timeouts.length} (${Math.round(timeouts.length/results.length*100)}%) |`);
    }
  }

  /**
   * Add test category analysis
   */
  private static addCategoryAnalysis(markdown: string[], results: TestResult[], testCases: TestCase[]) {
    const categories = new Map<string, { total: number; passed: number }>();
    
    results.forEach(result => {
      const testCase = testCases.find(tc => tc.id === result.testId);
      if (testCase && testCase.metadata?.tags) {
        testCase.metadata.tags.forEach(tag => {
          const current = categories.get(tag) || { total: 0, passed: 0 };
          current.total++;
          if (result.status === 'passed') current.passed++;
          categories.set(tag, current);
        });
      }
    });

    markdown.push('| Category | Success Rate | Passed/Total |');
    markdown.push('|----------|--------------|--------------|');
    
    for (const [category, stats] of categories) {
      const successRate = Math.round((stats.passed / stats.total) * 100);
      markdown.push(`| ${category} | ${successRate}% | ${stats.passed}/${stats.total} |`);
    }
  }

  /**
   * Add conversation details for agent tests
   */
  private static addConversationDetails(markdown: string[], output: any) {
    if (!this.hasAgentConversation(output)) return;

    const agentInfo = this.extractAgentInfo(output);
    
    markdown.push('#### Agent Conversation Analysis');
    markdown.push('');
    markdown.push(`**Steps:** ${agentInfo.stepCount}`);
    markdown.push(`**Iterations:** ${agentInfo.iterations}`);
    markdown.push(`**Tools Used:** ${agentInfo.toolsUsed.join(', ') || 'None'}`);
    markdown.push(`**Handoff Occurred:** ${agentInfo.handoffOccurred ? 'Yes' : 'No'}`);
    if (agentInfo.handoffTarget) {
      markdown.push(`**Handoff Target:** ${agentInfo.handoffTarget}`);
    }
    markdown.push(`**Errors:** ${agentInfo.errorCount}`);
    markdown.push(`**Final Status:** ${agentInfo.finalStatus}`);
    markdown.push('');
  }

  /**
   * Add tool usage analysis
   */
  private static addToolUsageAnalysis(markdown: string[], agentResults: TestResult[]) {
    const allTools = new Map<string, number>();
    const toolCombinations = new Map<string, number>();

    agentResults.forEach(result => {
      const agentInfo = this.extractAgentInfo(result.output);
      const toolsUsed = agentInfo.toolsUsed;
      
      // Count individual tools
      toolsUsed.forEach(tool => {
        allTools.set(tool, (allTools.get(tool) || 0) + 1);
      });

      // Count tool combinations
      if (toolsUsed.length > 1) {
        const combo = toolsUsed.sort().join(' + ');
        toolCombinations.set(combo, (toolCombinations.get(combo) || 0) + 1);
      }
    });

    // Most used tools
    markdown.push('### Most Used Tools');
    markdown.push('');
    markdown.push('| Tool | Usage Count |');
    markdown.push('|------|-------------|');
    
    const sortedTools = [...allTools.entries()].sort((a, b) => b[1] - a[1]);
    sortedTools.forEach(([tool, count]) => {
      markdown.push(`| ${tool} | ${count} |`);
    });
    markdown.push('');

    // Common tool combinations
    if (toolCombinations.size > 0) {
      markdown.push('### Common Tool Combinations');
      markdown.push('');
      markdown.push('| Tool Combination | Usage Count |');
      markdown.push('|------------------|-------------|');
      
      const sortedCombos = [...toolCombinations.entries()].sort((a, b) => b[1] - a[1]);
      sortedCombos.slice(0, 5).forEach(([combo, count]) => {
        markdown.push(`| ${combo} | ${count} |`);
      });
      markdown.push('');
    }
  }

  /**
   * Add recommendations based on results
   */
  private static addRecommendations(markdown: string[], results: TestResult[], summary: any) {
    const recommendations: string[] = [];

    if (summary.successRate < 80) {
      recommendations.push('🔴 **Low success rate detected** - Review failed tests and consider updating test expectations or fixing underlying issues');
    }

    if (summary.avgDuration > 30000) {
      recommendations.push('🟡 **High average duration** - Consider optimizing test execution or increasing timeout values');
    }

    if (summary.avgLLMScore > 0 && summary.avgLLMScore < 70) {
      recommendations.push('🟡 **Low LLM scores** - Review test criteria and agent/tool performance for quality improvements');
    }

    const errors = results.filter(r => r.status === 'error');
    if (errors.length > 0) {
      recommendations.push(`🔴 **${errors.length} tests with errors** - Fix configuration or infrastructure issues`);
    }

    if (summary.agentMetrics && summary.agentMetrics.handoffRate < 50) {
      recommendations.push('🟡 **Low handoff rate** - Agents may not be completing workflows as expected');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ **All metrics look good** - Test suite is performing well');
    }

    recommendations.forEach(rec => {
      markdown.push(rec);
      markdown.push('');
    });
  }

  /**
   * Helper methods
   */
  private static getStatusEmoji(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  private static hasAgentConversation(output: any): boolean {
    return output && 
           typeof output === 'object' && 
           output.messages && 
           Array.isArray(output.messages);
  }

  private static extractAgentInfo(output: any): AgentConversationInfo {
    const info: AgentConversationInfo = {
      toolsUsed: [],
      stepCount: 0,
      handoffOccurred: false,
      iterations: 0,
      researchSources: [],
      errorCount: 0,
      finalStatus: 'unknown'
    };

    if (!this.hasAgentConversation(output)) return info;

    info.stepCount = output.messages.length;
    info.iterations = output.messages.filter((msg: any) => msg.role === 'assistant').length;

    // Extract tool usage
    for (const message of output.messages) {
      if (!message || typeof message !== 'object') continue;
      
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const toolCall of message.tool_calls) {
          if (toolCall && toolCall.function?.name) {
            info.toolsUsed.push(toolCall.function.name);
          }
        }
      }
    }

    // Check for handoffs
    if (output.handoff || (output.handoffs && output.handoffs.length > 0)) {
      info.handoffOccurred = true;
      info.handoffTarget = output.handoff?.agent || output.handoffs?.[0]?.agent;
    }

    // Remove duplicates
    info.toolsUsed = [...new Set(info.toolsUsed)];

    return info;
  }
}