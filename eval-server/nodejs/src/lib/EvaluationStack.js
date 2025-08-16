// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * EvaluationStack - A simple stack-like structure for managing evaluations
 * 
 * Provides LIFO (Last In, First Out) access to evaluation objects.
 * Useful for distributing different evaluations across multiple client connections.
 */
export class EvaluationStack {
  constructor() {
    this.evaluations = [];
  }

  /**
   * Add an evaluation to the top of the stack
   * @param {Object} evaluation - The evaluation object to add
   */
  push(evaluation) {
    if (!evaluation || typeof evaluation !== 'object') {
      throw new Error('Evaluation must be a valid object');
    }
    
    // Validate required fields
    const requiredFields = ['id', 'name', 'tool', 'input'];
    for (const field of requiredFields) {
      if (!evaluation[field]) {
        throw new Error(`Evaluation missing required field: ${field}`);
      }
    }
    
    this.evaluations.push(evaluation);
  }

  /**
   * Remove and return the evaluation from the top of the stack
   * @returns {Object|null} The evaluation object, or null if stack is empty
   */
  pop() {
    return this.evaluations.pop() || null;
  }

  /**
   * Check if the stack is empty
   * @returns {boolean} True if stack has no evaluations
   */
  isEmpty() {
    return this.evaluations.length === 0;
  }

  /**
   * Get the number of evaluations in the stack
   * @returns {number} The stack size
   */
  size() {
    return this.evaluations.length;
  }

  /**
   * Peek at the top evaluation without removing it
   * @returns {Object|null} The top evaluation object, or null if stack is empty
   */
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.evaluations[this.evaluations.length - 1];
  }

  /**
   * Clear all evaluations from the stack
   */
  clear() {
    this.evaluations = [];
  }

  /**
   * Get a copy of all evaluations in the stack (top to bottom)
   * @returns {Array} Array of evaluation objects
   */
  toArray() {
    return [...this.evaluations].reverse();
  }
}