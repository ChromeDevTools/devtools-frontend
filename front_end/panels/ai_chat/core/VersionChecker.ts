// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from './Logger.js';
import { CURRENT_VERSION } from './Version.js';

const logger = createLogger('VersionChecker');

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
  releaseNotes?: string;
}

export class VersionChecker {
  private static instance: VersionChecker;
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/tysonthomas9/browser-operator-devtools-frontend/releases/latest';
  private readonly RELEASE_URL = 'https://github.com/tysonthomas9/browser-operator-devtools-frontend/releases';
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'devtools-version-check';
  private currentVersion: string;

  private constructor() {
    // Get current version from Version.ts which is updated during build
    this.currentVersion = CURRENT_VERSION;
    logger.info('VersionChecker initialized with version:', this.currentVersion);
    logger.info('CURRENT_VERSION from Version.ts:', CURRENT_VERSION);
  }

  static getInstance(): VersionChecker {
    if (!VersionChecker.instance) {
      VersionChecker.instance = new VersionChecker();
    }
    return VersionChecker.instance;
  }

  setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }


  async checkForUpdates(forceCheck: boolean = false): Promise<VersionInfo | null> {
    try {
      logger.info('Version check starting:', { currentVersion: this.currentVersion, forceCheck });
      
      // Check if we should perform the check
      if (!forceCheck && !this.shouldCheckForUpdates()) {
        logger.info('Using cached version info');
        const cached = this.getCachedVersionInfo();
        if (cached) {
          logger.info('Returning cached version info:', cached);
          return cached;
        }
      }

      logger.info('Fetching latest release from GitHub...');
      // Fetch latest release info from GitHub
      const response = await fetch(this.GITHUB_API_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const releaseData = await response.json();
      const latestVersion = this.extractVersionFromTag(releaseData.tag_name);
      
      logger.info('Latest version from GitHub:', { tag: releaseData.tag_name, extracted: latestVersion });
      
      const comparison = this.compareVersions(this.currentVersion, latestVersion);
      logger.info('Version comparison:', { current: this.currentVersion, latest: latestVersion, comparison });
      
      const versionInfo: VersionInfo = {
        currentVersion: this.currentVersion,
        latestVersion: latestVersion,
        isUpdateAvailable: comparison < 0,
        releaseUrl: releaseData.html_url || this.RELEASE_URL,
        releaseNotes: releaseData.body
      };

      logger.info('Final version info:', versionInfo);

      // Cache the result
      this.cacheVersionInfo(versionInfo);

      return versionInfo;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return null;
    }
  }

  private shouldCheckForUpdates(): boolean {
    const lastCheck = localStorage.getItem(`${this.STORAGE_KEY}-last-check`);
    if (!lastCheck) {
      return true;
    }

    const lastCheckTime = parseInt(lastCheck, 10);
    return Date.now() - lastCheckTime > this.CHECK_INTERVAL;
  }

  getCachedVersionInfo(): VersionInfo | null {
    try {
      const cached = localStorage.getItem(`${this.STORAGE_KEY}-info`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error('Failed to parse cached version info:', error);
    }
    return null;
  }

  private cacheVersionInfo(info: VersionInfo): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}-info`, JSON.stringify(info));
      localStorage.setItem(`${this.STORAGE_KEY}-last-check`, Date.now().toString());
    } catch (error) {
      logger.error('Failed to cache version info:', error);
    }
  }

  private extractVersionFromTag(tag: string): string {
    // Remove 'v' prefix if present (e.g., 'v1.2.3' -> '1.2.3')
    return tag.replace(/^v/, '');
  }

  private compareVersions(current: string, latest: string): number {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (currentPart < latestPart) return -1;
      if (currentPart > latestPart) return 1;
    }

    return 0;
  }

  dismissUpdate(): void {
    try {
      const info = this.getCachedVersionInfo();
      if (info) {
        localStorage.setItem(`${this.STORAGE_KEY}-dismissed`, info.latestVersion);
      }
    } catch (error) {
      logger.error('Failed to dismiss update:', error);
    }
  }

  isUpdateDismissed(version: string): boolean {
    try {
      const dismissedVersion = localStorage.getItem(`${this.STORAGE_KEY}-dismissed`);
      logger.info('Checking if version is dismissed:', { version, dismissedVersion });
      return dismissedVersion === version;
    } catch (error) {
      logger.error('Failed to check dismissed status:', error);
      return false;
    }
  }

  clearCache(): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}-info`);
      localStorage.removeItem(`${this.STORAGE_KEY}-last-check`);
      localStorage.removeItem(`${this.STORAGE_KEY}-dismissed`);
      logger.info('Version checker cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }
}