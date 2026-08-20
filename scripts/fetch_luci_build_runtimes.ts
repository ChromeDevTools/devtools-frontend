// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import {parseArgs} from 'node:util';

export function getLuciToken(): string {
  try {
    return execSync('luci-auth token', {encoding: 'utf-8'}).trim();
  } catch {
    console.error('Error: Could not get LUCI auth token. Did you run \'luci-auth login\'?');
    process.exit(1);
  }
}

export interface BuilderId {
  project: string;
  bucket: string;
  builder: string;
}

export interface Build {
  id: string;
  builder: BuilderId;
  number?: number;
  createdBy?: string;
  createTime?: string;
  startTime?: string;
  endTime?: string;
  updateTime?: string;
  status: string;
  [key: string]: unknown;
}

export interface DailyBuildStats {
  date: string;
  count: number;
  averageRuntimeMs: number;
  minRuntimeMs: number;
  maxRuntimeMs: number;
  medianRuntimeMs: number;
  percentChangeFromPreviousDay: number|null;
  durationsMs: number[];
}

export interface BuilderReport {
  builder: string;
  project: string;
  bucket: string;
  totalBuilds: number;
  overallAverageRuntimeMs: number;
  overallMedianRuntimeMs: number;
  overallMinRuntimeMs: number;
  overallMaxRuntimeMs: number;
  changeFromFirstDay: number|null;
  dailyStats: DailyBuildStats[];
}

export interface FetchBuildsOptions {
  project?: string;
  bucket?: string;
  builder?: string;
  days?: number;
  period?: string;
  since?: string|Date;
  until?: string|Date;
  status?: string;
}

interface SearchBuildsPayload {
  predicate: {
    builder: BuilderId,
    status: string,
    createTime: {
      startTime: string,
      endTime: string,
    },
  };
  pageSize: number;
  pageToken?: string;
}

export function parseTimeRange(options: {
  days?: number,
  period?: string,
  since?: string|Date,
  until?: string|Date,
}): {startTime: Date, endTime: Date} {
  const endTime = options.until ? (typeof options.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.until) ?
                                       new Date(`${options.until}T23:59:59.999Z`) :
                                       new Date(options.until)) :
                                  new Date();

  if (options.since) {
    const startTime = typeof options.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.since) ?
        new Date(`${options.since}T00:00:00.000Z`) :
        new Date(options.since);
    return {startTime, endTime};
  }

  let days = options.days;
  if (options.period) {
    const match = options.period.trim().match(/^(\d+(?:\.\d+)?)\s*([dwmyh])?$/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 'd').toLowerCase();
      if (unit === 'd') {
        days = val;
      } else if (unit === 'w') {
        days = val * 7;
      } else if (unit === 'm') {
        days = val * 30;
      } else if (unit === 'h') {
        days = val / 24;
      }
    } else {
      const num = parseFloat(options.period);
      if (!isNaN(num)) {
        days = num;
      }
    }
  }

  if (!days || days <= 0) {
    days = 14;
  }

  const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));
  return {startTime, endTime};
}

export async function fetchSuccessfulBuilds(options: FetchBuildsOptions = {}): Promise<Build[]> {
  const project = options.project ?? 'devtools-frontend';
  const bucket = options.bucket ?? 'try';
  const builder = options.builder ?? 'dtf_linux_rel';
  const status = options.status ?? 'SUCCESS';

  const url = 'https://cr-buildbucket.appspot.com/prpc/buildbucket.v2.Builds/SearchBuilds';
  const headers = {
    Authorization: `Bearer ${getLuciToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const {startTime, endTime} = parseTimeRange(options);

  const allBuilds: Build[] = [];
  let pageToken: string|undefined;

  do {
    const payload: SearchBuildsPayload = {
      predicate: {
        builder: {
          project,
          bucket,
          builder,
        },
        status,
        createTime: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      },
      pageSize: 1000,
    };

    if (pageToken) {
      payload.pageToken = pageToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP Error ${response.status}: ${response.statusText}`);
      console.error(text);
      throw new Error(`Network error querying Buildbucket SearchBuilds: ${response.statusText}`);
    }

    let rawData = await response.text();
    if (rawData.startsWith(')]}\'\n')) {
      rawData = rawData.substring(5);
    }

    const data = JSON.parse(rawData);
    const builds: Build[] = data.builds || [];
    allBuilds.push(...builds);

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allBuilds;
}

export function computeDailyStats(builds: Build[]): DailyBuildStats[] {
  const byDate = new Map<string, number[]>();

  for (const build of builds) {
    if (!build.startTime || !build.endTime) {
      continue;
    }
    const start = new Date(build.startTime).getTime();
    const end = new Date(build.endTime).getTime();
    const durationMs = end - start;
    if (durationMs < 0) {
      continue;
    }

    // Group by UTC date of build start (or createTime)
    const dateKey = (build.startTime || build.createTime || '').slice(0, 10);
    if (!dateKey) {
      continue;
    }

    let list = byDate.get(dateKey);
    if (!list) {
      list = [];
      byDate.set(dateKey, list);
    }
    list.push(durationMs);
  }

  const sortedDates = [...byDate.keys()].sort();
  const dailyStats: DailyBuildStats[] = [];
  let prevAverageMs: number|null = null;

  for (const date of sortedDates) {
    const durations = byDate.get(date);
    if (!durations || durations.length === 0) {
      continue;
    }
    durations.sort((a, b) => a - b);
    const sum = durations.reduce((acc, curr) => acc + curr, 0);
    const count = durations.length;
    const averageRuntimeMs = sum / count;
    const minRuntimeMs = durations[0];
    const maxRuntimeMs = durations[durations.length - 1];
    const mid = Math.floor(durations.length / 2);
    const medianRuntimeMs = durations.length % 2 !== 0 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;

    let percentChangeFromPreviousDay: number|null = null;
    if (prevAverageMs !== null && prevAverageMs > 0) {
      percentChangeFromPreviousDay = ((averageRuntimeMs - prevAverageMs) / prevAverageMs) * 100;
    }
    prevAverageMs = averageRuntimeMs;

    dailyStats.push({
      date,
      count,
      averageRuntimeMs,
      minRuntimeMs,
      maxRuntimeMs,
      medianRuntimeMs,
      percentChangeFromPreviousDay,
      durationsMs: durations,
    });
  }

  return dailyStats;
}

export function generateReport(builder: string, project: string, bucket: string,
                               dailyStats: DailyBuildStats[]): BuilderReport {
  let totalBuilds = 0;
  const allDurations: number[] = [];

  for (const day of dailyStats) {
    totalBuilds += day.count;
    allDurations.push(...day.durationsMs);
  }

  allDurations.sort((a, b) => a - b);
  const totalSum = allDurations.reduce((acc, curr) => acc + curr, 0);
  const overallAverageRuntimeMs = allDurations.length > 0 ? totalSum / allDurations.length : 0;
  const mid = Math.floor(allDurations.length / 2);
  const overallMedianRuntimeMs = allDurations.length === 0 ?
      0 :
      (allDurations.length % 2 !== 0 ? allDurations[mid] : (allDurations[mid - 1] + allDurations[mid]) / 2);
  const overallMinRuntimeMs = allDurations.length > 0 ? allDurations[0] : 0;
  const overallMaxRuntimeMs = allDurations.length > 0 ? allDurations[allDurations.length - 1] : 0;

  const firstDay = dailyStats.length > 0 ? dailyStats[0] : null;
  const lastDay = dailyStats.length > 0 ? dailyStats[dailyStats.length - 1] : null;
  const changeFromFirstDay = (firstDay && lastDay && firstDay.averageRuntimeMs > 0 && dailyStats.length > 1) ?
      ((lastDay.averageRuntimeMs - firstDay.averageRuntimeMs) / firstDay.averageRuntimeMs) * 100 :
      null;

  return {
    builder,
    project,
    bucket,
    totalBuilds,
    overallAverageRuntimeMs,
    overallMedianRuntimeMs,
    overallMinRuntimeMs,
    overallMaxRuntimeMs,
    changeFromFirstDay,
    dailyStats,
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatPercentDiff(pct: number|null|undefined): string {
  if (pct === null || pct === undefined) {
    return '-';
  }
  const formatted = pct.toFixed(1);
  if (pct > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

function resolveBuilderName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'linux' || normalized === 'linux-rel' || normalized === 'dtf_linux_rel') {
    return 'dtf_linux_rel';
  }
  if (normalized === 'mac' || normalized === 'mac_arm64' || normalized === 'mac-arm64' ||
      normalized === 'dtf_mac_arm64_rel') {
    return 'dtf_mac_arm64_rel';
  }
  if (normalized === 'win' || normalized === 'windows' || normalized === 'win64' || normalized === 'dtf_win64_rel') {
    return 'dtf_win64_rel';
  }
  return name.trim();
}

const DEFAULT_BUILDERS = ['dtf_linux_rel', 'dtf_mac_arm64_rel', 'dtf_win64_rel'];

async function main(): Promise<void> {
  const {values} = parseArgs({
    options: {
      days: {
        type: 'string',
      },
      period: {
        type: 'string',
      },
      since: {
        type: 'string',
      },
      until: {
        type: 'string',
      },
      builder: {
        type: 'string',
      },
      bucket: {
        type: 'string',
        default: 'try',
      },
      project: {
        type: 'string',
        default: 'devtools-frontend',
      },
      format: {
        type: 'string',
        default: 'table',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  });

  if (values.help) {
    console.log(`
Usage: node scripts/fetch_luci_build_runtimes.ts [options]

Fetches runtimes of successful builds from LUCI/Buildbucket and prints daily average times and daily +- % changes.
Defaults to devtools-frontend try builders: linux-rel, mac arm64, and windows (dtf_linux_rel, dtf_mac_arm64_rel, dtf_win64_rel).

Options:
  --period <period>        Time period (e.g. 14d, 2w, 1m) (default: 14d)
  --days <number>          Number of days to look back (e.g. 14)
  --since <date>           Start date / timestamp (e.g. 2026-08-01)
  --until <date>           End date / timestamp (e.g. 2026-08-20)
  --builder <name[,name]>  Builder name(s), comma-separated (default: dtf_linux_rel,dtf_mac_arm64_rel,dtf_win64_rel)
  --bucket <name>          Bucket name (default: try)
  --project <name>         Project name (default: devtools-frontend)
  --format <format>        Output format: 'table' or 'json' (default: table)
  -h, --help               Show this help message
`);
    return;
  }

  const days = values.days ? parseInt(values.days, 10) : undefined;
  const period = values.period;
  const since = values.since;
  const until = values.until;
  const bucket = values.bucket || 'try';
  const project = values.project || 'devtools-frontend';
  const isJson = values.format === 'json';

  const timeRange = parseTimeRange({days, period, since, until});
  const startStr = timeRange.startTime.toISOString().slice(0, 10);
  const endStr = timeRange.endTime.toISOString().slice(0, 10);

  const builderList =
      values.builder ? values.builder.split(',').map(resolveBuilderName).filter(Boolean) : DEFAULT_BUILDERS;

  if (!isJson) {
    console.log(`Fetching successful builds for ${project}/${bucket} [${builderList.join(', ')}] from ${startStr} to ${
        endStr}...`);
  }

  const reports: BuilderReport[] = [];

  for (const builder of builderList) {
    const builds = await fetchSuccessfulBuilds({
      project,
      bucket,
      builder,
      days,
      period,
      since,
      until,
    });

    const dailyStats = computeDailyStats(builds);
    const report = generateReport(builder, project, bucket, dailyStats);
    reports.push(report);
  }

  if (isJson) {
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  const allDates = new Set<string>();
  for (const r of reports) {
    for (const d of r.dailyStats) {
      allDates.add(d.date);
    }
  }
  const sortedDates = [...allDates].sort();

  console.log(`\nDaily Average Build Runtimes (${startStr} to ${endStr} - SUCCESS runs only):`);
  const colWidth = 27;
  const headerTop = reports.map(r => r.builder.padEnd(colWidth)).join('  ');
  const subCols =
      reports.map(() => `${'Avg Time'.padStart(9)} ${'+- %'.padStart(7)} ${'(Builds)'.padStart(9)}`).join('  ');

  const totalLineWidth = 12 + (colWidth + 2) * reports.length;
  console.log('='.repeat(totalLineWidth));
  console.log(`${'Date'.padEnd(12)}  ${headerTop}`);
  console.log(`${''.padEnd(12)}  ${subCols}`);
  console.log('-'.repeat(totalLineWidth));

  for (const date of sortedDates) {
    const rowCols = reports
                        .map(r => {
                          const d = r.dailyStats.find(s => s.date === date);
                          if (!d) {
                            return `${'-'.padStart(9)} ${'-'.padStart(7)} ${'-'.padStart(9)}`;
                          }
                          const avg = formatDuration(d.averageRuntimeMs).padStart(9);
                          const diff = formatPercentDiff(d.percentChangeFromPreviousDay).padStart(7);
                          const count = `(${d.count})`.padStart(9);
                          return `${avg} ${diff} ${count}`;
                        })
                        .join('  ');

    console.log(`${date.padEnd(12)}  ${rowCols}`);
  }

  console.log('='.repeat(totalLineWidth));
  const changeCols = reports
                         .map(r => {
                           const avg = ''.padStart(9);
                           const diff = formatPercentDiff(r.changeFromFirstDay).padStart(7);
                           const count = `(${r.totalBuilds})`.padStart(9);
                           return `${avg} ${diff} ${count}`;
                         })
                         .join('  ');
  console.log(`${'Change*'.padEnd(12)}  ${changeCols}`);
  console.log('\n* Change compares the last day to the first day of the period.');
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
