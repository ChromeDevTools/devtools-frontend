import { createLogger } from '../core/Logger.js';

const logger = createLogger('MCPConfig');

export interface MCPConfigData {
  enabled: boolean;
  endpoint?: string; // MVP: single endpoint; Phase 2 can support multiple
  token?: string;
  toolAllowlist?: string[];
  autostart?: boolean;
  toolMode?: 'all' | 'router' | 'meta';
  maxToolsPerTurn?: number;
  maxMcpPerTurn?: number;
}

const KEYS = {
  enabled: 'ai_chat_mcp_enabled',
  endpoint: 'ai_chat_mcp_endpoint',
  token: 'ai_chat_mcp_token',
  allowlist: 'ai_chat_mcp_tool_allowlist',
  autostart: 'ai_chat_mcp_autostart',
  toolMode: 'ai_chat_mcp_tool_mode',
  maxToolsPerTurn: 'ai_chat_mcp_max_tools_per_turn',
  maxMcpPerTurn: 'ai_chat_mcp_max_mcp_per_turn',
} as const;

export function getMCPConfig(): MCPConfigData {
  try {
    const enabled = localStorage.getItem(KEYS.enabled) === 'true';
    const endpoint = localStorage.getItem(KEYS.endpoint) || undefined;
    const token = sessionStorage.getItem(KEYS.token) || undefined;
    let toolAllowlist: string[] | undefined;
    const raw = localStorage.getItem(KEYS.allowlist);
    if (raw) {
      try { toolAllowlist = JSON.parse(raw); } catch { toolAllowlist = undefined; }
    }
    const autostart = localStorage.getItem(KEYS.autostart) === 'true';
    const toolMode = (localStorage.getItem(KEYS.toolMode) as MCPConfigData['toolMode']) || 'router';
    const maxToolsPerTurn = parseInt(localStorage.getItem(KEYS.maxToolsPerTurn) || '20', 10);
    const maxMcpPerTurn = parseInt(localStorage.getItem(KEYS.maxMcpPerTurn) || '8', 10);
    return { enabled, endpoint, token, toolAllowlist, autostart, toolMode, maxToolsPerTurn, maxMcpPerTurn };
  } catch (err) {
    logger.error('Failed to load MCP config', err);
    return { enabled: false };
  }
}

export function setMCPConfig(config: MCPConfigData): void {
  try {
    localStorage.setItem(KEYS.enabled, String(!!config.enabled));
    if (config.endpoint !== undefined) {
      localStorage.setItem(KEYS.endpoint, config.endpoint);
    }
    if (config.token !== undefined) {
      try {
        if (config.token) {
          sessionStorage.setItem(KEYS.token, config.token);
        } else {
          sessionStorage.removeItem(KEYS.token);
        }
      } catch (e) {
        logger.error('Failed to persist MCP token to sessionStorage', e);
      }
    }
    if (config.toolAllowlist) {
      localStorage.setItem(KEYS.allowlist, JSON.stringify(config.toolAllowlist));
    }
    if (config.autostart !== undefined) {
      localStorage.setItem(KEYS.autostart, String(!!config.autostart));
    }
    if (config.toolMode !== undefined) {
      localStorage.setItem(KEYS.toolMode, config.toolMode);
    }
    if (config.maxToolsPerTurn !== undefined) {
      localStorage.setItem(KEYS.maxToolsPerTurn, String(config.maxToolsPerTurn));
    }
    if (config.maxMcpPerTurn !== undefined) {
      localStorage.setItem(KEYS.maxMcpPerTurn, String(config.maxMcpPerTurn));
    }
  } catch (err) {
    logger.error('Failed to save MCP config', err);
  } finally {
    dispatchMCPConfigChanged();
  }
}

export function isMCPEnabled(): boolean {
  return getMCPConfig().enabled;
}

export function onMCPConfigChange(handler: () => void): () => void {
  const cb = () => handler();
  window.addEventListener('ai_chat_mcp_config_changed', cb);
  return () => window.removeEventListener('ai_chat_mcp_config_changed', cb);
}

function dispatchMCPConfigChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent('ai_chat_mcp_config_changed'));
  } catch (err) {
    logger.warn('Failed to dispatch MCP config change event', err);
  }
}
