// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../logger.js';

/**
 * EvaluationLoader - Handles loading and managing evaluations from YAML files
 * 
 * Example usage:
 * ```js
 * const loader = new EvaluationLoader('./evals');
 * await loader.loadFromDirectory('./evals');
 * 
 * const evaluations = loader.getAllEvaluations();
 * const filtered = loader.getEvaluationsByCategory('action-agent');
 * const specific = loader.getEvaluationById('a11y-001');
 * ```
 */
export class EvaluationLoader {
  constructor(evalsDir = './evals') {
    this.evalsDir = path.resolve(evalsDir);
    this.evaluations = new Map(); // evaluationId -> evaluation
    this.categories = new Map(); // category -> evaluations[]
    this.configDefaults = null;
    
    // Ensure directory exists
    if (!fs.existsSync(this.evalsDir)) {
      fs.mkdirSync(this.evalsDir, { recursive: true });
    }
    
    this.loadConfigDefaults();
  }

  /**
   * Load default model configuration from config.yaml
   */
  loadConfigDefaults() {
    try {
      const configPath = path.resolve(this.evalsDir, 'config.yaml');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        this.configDefaults = yaml.load(configContent);
        logger.info('EvaluationLoader: Loaded config.yaml defaults', this.configDefaults);
      } else {
        // Don't warn about missing config.yaml - it's optional
        this.configDefaults = null;
      }
    } catch (error) {
      logger.error('EvaluationLoader: Failed to load config.yaml:', error);
      this.configDefaults = null;
    }
  }

  /**
   * Apply model precedence logic
   * API calls OR test YAML models override config.yaml fallback
   */
  applyModelPrecedence(evaluation, apiModelOverride = null) {
    if (apiModelOverride) {
      return {
        ...(this.configDefaults?.model || {}),
        ...apiModelOverride
      };
    }
    
    const testModel = evaluation.model;
    if (testModel && Object.keys(testModel).length > 0) {
      return {
        ...(this.configDefaults?.model || {}),
        ...testModel
      };
    }
    
    return this.configDefaults?.model || {};
  }

  /**
   * Load all evaluations from the specified directory
   */
  async loadFromDirectory(evalsDir = this.evalsDir) {
    try {
      this.evalsDir = path.resolve(evalsDir);
      
      // Clear existing evaluations
      this.evaluations.clear();
      this.categories.clear();
      
      // Reload config defaults
      this.loadConfigDefaults();
      
      // Find all category directories
      const categories = fs.readdirSync(this.evalsDir)
        .filter(dir => {
          const fullPath = path.join(this.evalsDir, dir);
          return fs.statSync(fullPath).isDirectory();
        });
      
      let totalEvaluations = 0;
      
      for (const category of categories) {
        const categoryDir = path.join(this.evalsDir, category);
        const evalFiles = fs.readdirSync(categoryDir)
          .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        
        const categoryEvaluations = [];
        
        for (const file of evalFiles) {
          try {
            const evalPath = path.join(categoryDir, file);
            const evaluation = await this.loadEvaluationFile(evalPath, category);
            
            if (evaluation && evaluation.enabled !== false) {
              this.evaluations.set(evaluation.id, evaluation);
              categoryEvaluations.push(evaluation);
              totalEvaluations++;
            }
          } catch (error) {
            logger.error(`EvaluationLoader: Failed to load evaluation ${file}:`, error);
          }
        }
        
        if (categoryEvaluations.length > 0) {
          this.categories.set(category, categoryEvaluations);
        }
      }
      
      logger.info(`EvaluationLoader: Loaded ${totalEvaluations} evaluations from ${categories.length} categories`);
      return { totalEvaluations, categories: categories.length };
      
    } catch (error) {
      logger.error('EvaluationLoader: Failed to load evaluations:', error);
      throw error;
    }
  }

  /**
   * Load a specific evaluation file
   */
  async loadEvaluationFile(filePath, category) {
    try {
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      const evaluation = yaml.load(yamlContent);
      
      if (!evaluation || !evaluation.id) {
        throw new Error('Evaluation must have an id field');
      }
      
      // Apply model precedence
      const resolvedModel = this.applyModelPrecedence(evaluation);
      
      // Enhance evaluation with metadata
      const enhancedEvaluation = {
        ...evaluation,
        model: resolvedModel,
        category,
        filePath,
        status: 'pending',
        loadedAt: new Date().toISOString()
      };
      
      // Validate required fields
      this.validateEvaluation(enhancedEvaluation);
      
      return enhancedEvaluation;
      
    } catch (error) {
      logger.error(`EvaluationLoader: Failed to load evaluation file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Validate evaluation structure
   */
  validateEvaluation(evaluation) {
    const required = ['id', 'name', 'tool'];
    
    for (const field of required) {
      if (!evaluation[field]) {
        throw new Error(`Evaluation missing required field: ${field}`);
      }
    }
    
    // Validate tool is supported
    const supportedTools = [
      'action_agent',
      'research_agent', 
      'schema_extractor',
      'streamlined_schema_extractor',
      'screenshot_verification',
      'web_task_agent',
      'chat'
    ];
    
    if (!supportedTools.includes(evaluation.tool)) {
      logger.warn(`EvaluationLoader: Unknown tool type: ${evaluation.tool}`);
    }
    
    return true;
  }

  /**
   * Get all loaded evaluations
   */
  getAllEvaluations() {
    return Array.from(this.evaluations.values());
  }

  /**
   * Get evaluations by category
   */
  getEvaluationsByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all available categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Get evaluation by ID
   */
  getEvaluationById(evaluationId) {
    return this.evaluations.get(evaluationId);
  }

  /**
   * Filter evaluations by criteria
   */
  filterEvaluations(criteria = {}) {
    let evaluations = this.getAllEvaluations();
    
    // Filter by category
    if (criteria.category) {
      evaluations = evaluations.filter(e => e.category === criteria.category);
    }
    
    // Filter by tool
    if (criteria.tool) {
      evaluations = evaluations.filter(e => e.tool === criteria.tool);
    }
    
    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      evaluations = evaluations.filter(e => {
        const evalTags = e.metadata?.tags || [];
        return criteria.tags.some(tag => evalTags.includes(tag));
      });
    }
    
    // Filter by enabled status
    if (criteria.enabled !== undefined) {
      evaluations = evaluations.filter(e => e.enabled === criteria.enabled);
    }
    
    // Filter by priority
    if (criteria.priority) {
      evaluations = evaluations.filter(e => e.metadata?.priority === criteria.priority);
    }
    
    return evaluations;
  }

  /**
   * Get evaluation statistics
   */
  getStatistics() {
    const evaluations = this.getAllEvaluations();
    const stats = {
      total: evaluations.length,
      byCategory: {},
      byTool: {},
      byStatus: {},
      enabled: 0,
      disabled: 0
    };
    
    for (const evaluation of evaluations) {
      // Count by category
      const category = evaluation.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Count by tool
      const tool = evaluation.tool;
      stats.byTool[tool] = (stats.byTool[tool] || 0) + 1;
      
      // Count by status
      const status = evaluation.status || 'pending';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Count enabled/disabled
      if (evaluation.enabled !== false) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }
    }
    
    return stats;
  }

  /**
   * Reload evaluations from disk
   */
  async reload() {
    return this.loadFromDirectory(this.evalsDir);
  }

  /**
   * Create a new evaluation programmatically
   */
  createEvaluation(evaluationData) {
    const evaluation = {
      id: evaluationData.id || `eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: evaluationData.name || 'Untitled Evaluation',
      description: evaluationData.description || '',
      enabled: evaluationData.enabled !== false,
      tool: evaluationData.tool || 'chat',
      timeout: evaluationData.timeout || 45000,
      input: evaluationData.input || {},
      model: this.applyModelPrecedence(evaluationData, evaluationData.model),
      validation: evaluationData.validation || { type: 'none' },
      metadata: {
        tags: ['programmatic'],
        priority: 'medium',
        ...evaluationData.metadata
      },
      category: evaluationData.category || 'programmatic',
      status: 'pending',
      loadedAt: new Date().toISOString(),
      ...evaluationData
    };
    
    // Validate the evaluation
    this.validateEvaluation(evaluation);
    
    // Store the evaluation
    this.evaluations.set(evaluation.id, evaluation);
    
    // Add to category
    const category = evaluation.category;
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(evaluation);
    
    logger.info(`EvaluationLoader: Created evaluation ${evaluation.id} in category ${category}`);
    return evaluation;
  }

  /**
   * Remove an evaluation
   */
  removeEvaluation(evaluationId) {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) {
      return false;
    }
    
    // Remove from main map
    this.evaluations.delete(evaluationId);
    
    // Remove from category
    const category = evaluation.category;
    if (this.categories.has(category)) {
      const categoryEvals = this.categories.get(category);
      const index = categoryEvals.findIndex(e => e.id === evaluationId);
      if (index !== -1) {
        categoryEvals.splice(index, 1);
        
        // Remove category if empty
        if (categoryEvals.length === 0) {
          this.categories.delete(category);
        }
      }
    }
    
    logger.info(`EvaluationLoader: Removed evaluation ${evaluationId}`);
    return true;
  }

  /**
   * Update an existing evaluation
   */
  updateEvaluation(evaluationId, updates) {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) {
      throw new Error(`Evaluation ${evaluationId} not found`);
    }
    
    // Apply updates
    const updatedEvaluation = {
      ...evaluation,
      ...updates,
      id: evaluationId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    // Validate updated evaluation
    this.validateEvaluation(updatedEvaluation);
    
    // Update in storage
    this.evaluations.set(evaluationId, updatedEvaluation);
    
    // Update in category if category changed
    if (updates.category && updates.category !== evaluation.category) {
      // Remove from old category
      const oldCategory = evaluation.category;
      if (this.categories.has(oldCategory)) {
        const oldCategoryEvals = this.categories.get(oldCategory);
        const index = oldCategoryEvals.findIndex(e => e.id === evaluationId);
        if (index !== -1) {
          oldCategoryEvals.splice(index, 1);
          if (oldCategoryEvals.length === 0) {
            this.categories.delete(oldCategory);
          }
        }
      }
      
      // Add to new category
      const newCategory = updates.category;
      if (!this.categories.has(newCategory)) {
        this.categories.set(newCategory, []);
      }
      this.categories.get(newCategory).push(updatedEvaluation);
    } else {
      // Update existing entry in category
      const category = evaluation.category;
      if (this.categories.has(category)) {
        const categoryEvals = this.categories.get(category);
        const index = categoryEvals.findIndex(e => e.id === evaluationId);
        if (index !== -1) {
          categoryEvals[index] = updatedEvaluation;
        }
      }
    }
    
    logger.info(`EvaluationLoader: Updated evaluation ${evaluationId}`);
    return updatedEvaluation;
  }
}