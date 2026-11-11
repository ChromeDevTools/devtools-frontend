// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {PerformanceTraceFormatter} from '../data_formatters/PerformanceTraceFormatter.js';

import {skill as lighthouseSkill} from './lighthouse.skill.js';
import {skill as networkSkill} from './network.skill.js';
import {skill as performanceSkill} from './performance.skill.js';
import type {Skill, SkillName} from './Skill.js';
import {skill as sourcesSkill} from './sources.skill.js';
import {skill as storageSkill} from './storage.skill.js';
import {skill as stylingSkill} from './styling.skill.js';

export const SKILLS: Record<SkillName, Skill> = {
  styling: stylingSkill,
  network: networkSkill,
  // Append compressed format descriptions here to keep a single source of truth
  // alongside PerformanceTraceFormatter without inflating performanceSkill.description
  // in the unloaded skills manifest.
  performance: {
    ...performanceSkill,
    instructions: `${performanceSkill.instructions}\n\n# Data Formats\n\n${
        PerformanceTraceFormatter.networkDataFormatDescription.trim()}\n\n${
        PerformanceTraceFormatter.callFrameDataFormatDescription.trim()}`,
  },
  storage: storageSkill,
  sources: sourcesSkill,
  lighthouse: lighthouseSkill,
};
