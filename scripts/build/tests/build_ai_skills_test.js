// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {parseSkill} from '../build_ai_skills.mjs';

describe('build_ai_skills', () => {
  it('parses valid skill with frontmatter', () => {
    const content = `---
name: styling
description: Helping with CSS and styling
allowed-tools: []
---
You are a CSS expert helping the user style elements.`;

    const result = parseSkill(content);
    assert.deepEqual(result, {
      name: 'styling',
      description: 'Helping with CSS and styling',
      allowedTools: [],
      instructions: 'You are a CSS expert helping the user style elements.'
    });
  });

  it('handles missing frontmatter', () => {
    const content = `You are a CSS expert helping the user style elements.`;
    const result = parseSkill(content);
    assert.deepEqual(result, {
      name: undefined,
      description: undefined,
      allowedTools: [],
      instructions: 'You are a CSS expert helping the user style elements.'
    });
  });

  it('handles empty allowed-tools', () => {
    const content = `---
name: styling
allowed-tools: []
---
Test`;
    const result = parseSkill(content);
    assert.deepEqual(result, {name: 'styling', description: undefined, allowedTools: [], instructions: 'Test'});
  });

  it('handles non-empty allowed-tools', () => {
    const content = `---
name: styling
allowed-tools:
  - tool1
  - tool2
---
Test`;
    const result = parseSkill(content);
    assert.deepEqual(
        result, {name: 'styling', description: undefined, allowedTools: ['tool1', 'tool2'], instructions: 'Test'});
  });

  it('handles multi-line body with markdown', () => {
    const content = `---
name: styling
---
You are a CSS expert.
Here are your tasks:
- Task 1
- Task 2
Enjoy!`;
    const result = parseSkill(content);
    assert.deepEqual(result, {
      name: 'styling',
      description: undefined,
      allowedTools: [],
      instructions: `You are a CSS expert.
Here are your tasks:
- Task 1
- Task 2
Enjoy!`
    });
  });

  it('trims whitespace', () => {
    const content = `---
name:  styling
description:  test
---
  Test  `;
    const result = parseSkill(content);
    assert.deepEqual(result, {name: 'styling', description: 'test', allowedTools: [], instructions: 'Test'});
  });

  it('throws error on invalid YAML', () => {
    const content = `---
name: styling
invalid: : YAML
---
Test`;
    assert.throws(() => parseSkill(content), /Failed to parse YAML frontmatter/);
  });
});
