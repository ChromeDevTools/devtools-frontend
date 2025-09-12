// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Build-time configuration for automated deployments and Docker environments.
 * 
 * This file contains constants that are set during the build process to configure
 * behavior for different deployment scenarios.
 */
export const BUILD_CONFIG = {
  /**
   * Automated mode flag for Docker/CI deployments.
   * When true:
   * - Bypasses OAuth authentication panel
   * - Automatically enables evaluation mode
   * - Optimized for headless/automated usage
   */
  AUTOMATED_MODE: false,  // Will be set to true during Docker build
} as const;