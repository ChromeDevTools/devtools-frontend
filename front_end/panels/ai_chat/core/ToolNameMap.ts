// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A small, dependency-free utility that maintains a global mapping between
// original tool identifiers (e.g. "mcp:default:alpha") and provider-compliant
// function names (^[a-zA-Z0-9_-]{1,64}$). This avoids import cycles between
// AgentNodes and MCPRegistry.

const originalToSanitized = new Map<string, string>();
const sanitizedToOriginal = new Map<string, string>();

function sanitize(original: string): string {
  let name = original.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!name) name = 'tool';
  if (name.length > 64) name = name.slice(0, 64);
  return name;
}

function shortHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  const hex = (h >>> 0).toString(16);
  return hex.slice(-6).padStart(6, '0');
}

export function clear(): void {
  originalToSanitized.clear();
  sanitizedToOriginal.clear();
}

export function addMapping(original: string): string {
  const existing = originalToSanitized.get(original);
  if (existing) return existing;

  let candidate = sanitize(original);
  if (sanitizedToOriginal.has(candidate) && sanitizedToOriginal.get(candidate) !== original) {
    const suffix = shortHash(original);
    const base = candidate.replace(/_+$/g, '');
    const maxBase = Math.max(1, 64 - 1 - suffix.length);
    candidate = (base.length > maxBase ? base.slice(0, maxBase) : base) + '-' + suffix;
  }
  let unique = candidate;
  let counter = 1;
  while (sanitizedToOriginal.has(unique) && sanitizedToOriginal.get(unique) !== original) {
    const add = `_${counter++}`;
    const maxBase = Math.max(1, 64 - add.length);
    unique = (candidate.length > maxBase ? candidate.slice(0, maxBase) : candidate) + add;
  }
  originalToSanitized.set(original, unique);
  sanitizedToOriginal.set(unique, original);
  return unique;
}

export function getSanitized(original: string): string {
  return addMapping(original);
}

export function resolveOriginal(sanitized: string): string | undefined {
  return sanitizedToOriginal.get(sanitized);
}

