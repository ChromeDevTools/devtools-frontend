import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';

class ClientManager {
  constructor(clientsDir = './clients', evalsDir = './evals') {
    this.clientsDir = path.resolve(clientsDir);
    this.evalsDir = path.resolve(evalsDir);
    this.clients = new Map();
    this.evaluations = new Map(); // clientId -> evaluations array
    this.configDefaults = null; // Config.yaml defaults for model precedence
    this.activeTabs = new Map(); // clientId -> Set of { tabId, connection, metadata }
    
    // Ensure directories exist
    if (!fs.existsSync(this.clientsDir)) {
      fs.mkdirSync(this.clientsDir, { recursive: true });
    }
    if (!fs.existsSync(this.evalsDir)) {
      fs.mkdirSync(this.evalsDir, { recursive: true });
    }
    
    this.loadConfigDefaults();
    this.loadAllClients();
    this.loadAllEvaluations();
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
        logger.info('Loaded config.yaml defaults:', this.configDefaults);
      } else {
        // Don't warn about missing config.yaml - it's optional
        this.configDefaults = null;
      }
    } catch (error) {
      logger.error('Failed to load config.yaml:', error);
      this.configDefaults = null;
    }
  }

  /**
   * Apply model precedence: API calls OR test YAML models override config.yaml fallback
   * Precedence logic:
   * 1. API calls OR individual test YAML models (highest priority - either overrides everything)
   * 2. config.yaml defaults (fallback only when neither API nor test YAML specify models)
   */
  applyModelPrecedence(evaluation, apiModelOverride = null) {
    // Check if API override is provided
    if (apiModelOverride) {
      // API model override takes precedence over everything
      return {
        ...(this.configDefaults?.model || {}), // Use config as base
        ...apiModelOverride // API overrides everything
      };
    }
    
    // Check if evaluation has its own model config from YAML
    const testModel = evaluation.model;
    if (testModel && Object.keys(testModel).length > 0) {
      // Test YAML model takes precedence, use config.yaml only for missing fields
      return {
        ...(this.configDefaults?.model || {}), // Config as fallback base
        ...testModel // Test YAML overrides config
      };
    }
    
    // Neither API nor test YAML specified models, use config.yaml defaults only
    return this.configDefaults?.model || {};
  }

  /**
   * Load all client YAML files on startup
   */
  loadAllClients() {
    try {
      const files = fs.readdirSync(this.clientsDir)
        .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
        .filter(f => {
          // Only load base client YAML files, not composite ones with tab IDs
          const clientId = path.basename(f, path.extname(f));
          return !clientId.includes(':');
        });
      
      for (const file of files) {
        const clientId = path.basename(file, path.extname(file));
        try {
          this.loadClient(clientId);
        } catch (error) {
          logger.error(`Failed to load client ${clientId}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.clients.size} clients`);
    } catch (error) {
      logger.error('Failed to load clients:', error);
    }
  }

  /**
   * Load a specific client's YAML configuration
   */
  loadClient(clientId) {
    const yamlPath = path.join(this.clientsDir, `${clientId}.yaml`);
    
    if (!fs.existsSync(yamlPath)) {
      throw new Error(`Client YAML not found: ${yamlPath}`);
    }
    
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(yamlContent);
    
    // Validate client configuration
    if (!config.client || config.client.id !== clientId) {
      throw new Error(`Invalid client configuration: ID mismatch`);
    }
    
    // Store client info
    this.clients.set(clientId, {
      id: config.client.id,
      name: config.client.name,
      secretKey: config.client.secret_key,
      description: config.client.description,
      settings: config.settings || {},
      yamlPath
    });
    
    // Note: Evaluations are now loaded separately from the evals directory
    // Initialize empty evaluations array for this client
    if (!this.evaluations.has(clientId)) {
      this.evaluations.set(clientId, []);
    }
    
    logger.info(`Loaded client ${clientId}`);
    return config;
  }

  /**
   * Load all evaluations from the evals directory structure
   */
  loadAllEvaluations() {
    try {
      // Clear existing evaluations to prevent duplicates on reload
      this.evaluations.clear();
      
      // Find all category directories
      const categories = fs.readdirSync(this.evalsDir)
        .filter(dir => fs.statSync(path.join(this.evalsDir, dir)).isDirectory());
      
      let totalEvaluations = 0;
      
      for (const category of categories) {
        const categoryDir = path.join(this.evalsDir, category);
        const evalFiles = fs.readdirSync(categoryDir)
          .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        
        for (const file of evalFiles) {
          try {
            const evalPath = path.join(categoryDir, file);
            const yamlContent = fs.readFileSync(evalPath, 'utf8');
            const evaluation = yaml.load(yamlContent);
            
            if (evaluation.enabled !== false) {
              // Apply model precedence: config.yaml overrides individual test models
              const resolvedModel = this.applyModelPrecedence(evaluation);
              
              // Add evaluation to all clients for now
              // In the future, you might want to have client-specific evaluation assignments
              for (const [clientId] of this.clients) {
                const clientEvals = this.evaluations.get(clientId) || [];
                clientEvals.push({
                  ...evaluation,
                  model: resolvedModel, // Use resolved model with precedence applied
                  clientId,
                  status: 'pending',
                  category,
                  filePath: evalPath
                });
                this.evaluations.set(clientId, clientEvals);
              }
              totalEvaluations++;
            }
          } catch (error) {
            logger.error(`Failed to load evaluation ${file}:`, error);
          }
        }
      }
      
      // Update the client evaluation counts
      for (const [clientId] of this.clients) {
        const evalCount = this.evaluations.get(clientId)?.length || 0;
        logger.info(`Loaded client ${clientId} with ${evalCount} evaluations`);
      }
      
      logger.info(`Loaded ${totalEvaluations} evaluations from ${categories.length} categories`);
    } catch (error) {
      logger.error('Failed to load evaluations:', error);
    }
  }

  /**
   * Register a new client with authentication
   */
  registerClient(clientId, secretKey, capabilities, skipSecretValidation = false) {
    const client = this.clients.get(clientId);
    
    if (!client) {
      throw new Error(`Client ${clientId} not found. Please create a YAML configuration file.`);
    }
    
    // Verify secret key if configured (unless we're skipping validation)
    if (!skipSecretValidation && client.secretKey && client.secretKey !== secretKey) {
      throw new Error('Invalid secret key');
    }
    
    // Update client capabilities
    client.capabilities = capabilities;
    client.lastRegistered = new Date().toISOString();
    
    return {
      success: true,
      clientName: client.name,
      evaluationsCount: this.evaluations.get(clientId)?.length || 0
    };
  }

  /**
   * Get client information
   */
  getClient(clientId) {
    return this.clients.get(clientId);
  }

  /**
   * Get evaluations for a client
   */
  getClientEvaluations(clientId) {
    return this.evaluations.get(clientId) || [];
  }

  /**
   * Get next pending evaluation for a client
   */
  getNextEvaluation(clientId) {
    const evaluations = this.evaluations.get(clientId) || [];
    return evaluations.find(e => e.status === 'pending');
  }

  /**
   * Update evaluation status
   */
  updateEvaluationStatus(clientId, evaluationId, status, result = null) {
    const evaluations = this.evaluations.get(clientId);
    if (!evaluations) return;
    
    const evaluation = evaluations.find(e => e.id === evaluationId);
    if (evaluation) {
      evaluation.status = status;
      evaluation.lastRun = new Date().toISOString();
      if (result) {
        evaluation.lastResult = result;
      }
    }
  }

  /**
   * Create a new client with default configuration
   */
  async createClient(clientName, secretKey = null) {
    const clientId = uuidv4();
    return this.createClientWithId(clientId, clientName, secretKey);
  }

  /**
   * Create a new client with a specific ID
   */
  async createClientWithId(clientId, clientName, secretKey = null) {
    const yamlPath = path.join(this.clientsDir, `${clientId}.yaml`);
    
    // Create simplified client configuration (evaluations come from evals directory)
    const defaultConfig = {
      client: {
        id: clientId,
        name: clientName,
        secret_key: secretKey,
        description: `Auto-generated DevTools evaluation client`
      },
      settings: {
        max_concurrent_evaluations: 3,
        default_timeout: 45000,
        retry_policy: {
          max_retries: 2,
          backoff_multiplier: 2,
          initial_delay: 1000
        }
      }
    };
    
    // Write YAML file
    const yamlContent = yaml.dump(defaultConfig, { indent: 2 });
    fs.writeFileSync(yamlPath, yamlContent);
    
    // Load the new client
    this.loadClient(clientId);
    
    // Load evaluations for the new client
    this.loadAllEvaluations();
    
    logger.info(`Created new client: ${clientId}`);
    return { clientId, yamlPath };
  }

  /**
   * Reload a specific client's configuration
   */
  reloadClient(clientId) {
    try {
      this.loadClient(clientId);
      logger.info(`Reloaded client: ${clientId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to reload client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Get all active clients
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }

  /**
   * Validate client exists and is authorized
   */
  validateClient(clientId, secretKey = null, skipSecretValidation = false) {
    const client = this.clients.get(clientId);
    
    logger.debug('validateClient', {
      clientId,
      clientExists: !!client,
      hasSecretKey: !!secretKey,
      skipSecretValidation,
      clientSecretKey: client ? '[REDACTED]' : 'N/A'
    });
    
    if (!client) {
      logger.debug('Client not found', { clientId });
      return { valid: false, reason: 'Client not found' };
    }
    
    // Skip secret key validation if explicitly requested (for new auth flow)
    if (!skipSecretValidation && secretKey !== null && client.secretKey && client.secretKey !== secretKey) {
      logger.warn('Secret key mismatch', { 
        clientId,
        hasProvidedKey: !!secretKey,
        hasStoredKey: !!client.secretKey
      });
      return { valid: false, reason: 'Invalid secret key' };
    }
    
    logger.debug('Client validation successful', { clientId });
    return { valid: true };
  }

  /**
   * Parse composite client ID to extract base client ID and tab ID
   * Format: baseClientId:tabId
   */
  parseCompositeClientId(compositeClientId) {
    if (compositeClientId.includes(':')) {
      const [baseClientId, tabId] = compositeClientId.split(':', 2);
      return { baseClientId, tabId, isComposite: true };
    }
    return { baseClientId: compositeClientId, tabId: null, isComposite: false };
  }

  /**
   * Register a tab for a client
   */
  registerTab(compositeClientId, connection, metadata = {}) {
    const { baseClientId, tabId } = this.parseCompositeClientId(compositeClientId);
    
    if (!this.activeTabs.has(baseClientId)) {
      this.activeTabs.set(baseClientId, new Set());
    }
    
    const tabs = this.activeTabs.get(baseClientId);
    const tabInfo = {
      tabId: tabId || 'default',
      compositeClientId,
      connection,
      connectedAt: new Date().toISOString(),
      ...metadata
    };
    
    // Remove existing tab with same ID if it exists
    tabs.forEach(existingTab => {
      if (existingTab.tabId === tabInfo.tabId) {
        tabs.delete(existingTab);
      }
    });
    
    tabs.add(tabInfo);
    
    logger.info('Tab registered', {
      baseClientId,
      tabId: tabInfo.tabId,
      compositeClientId,
      totalTabs: tabs.size
    });
    
    return tabInfo;
  }

  /**
   * Unregister a tab for a client
   */
  unregisterTab(compositeClientId) {
    const { baseClientId, tabId } = this.parseCompositeClientId(compositeClientId);
    
    if (!this.activeTabs.has(baseClientId)) {
      return false;
    }
    
    const tabs = this.activeTabs.get(baseClientId);
    const targetTabId = tabId || 'default';
    
    let removed = false;
    tabs.forEach(tab => {
      if (tab.tabId === targetTabId) {
        tabs.delete(tab);
        removed = true;
      }
    });
    
    // Remove client entry if no tabs remain
    if (tabs.size === 0) {
      this.activeTabs.delete(baseClientId);
    }
    
    if (removed) {
      logger.info('Tab unregistered', {
        baseClientId,
        tabId: targetTabId,
        compositeClientId,
        remainingTabs: tabs.size
      });
    }
    
    return removed;
  }

  /**
   * Get all active tabs for a client
   */
  getClientTabs(baseClientId) {
    const tabs = this.activeTabs.get(baseClientId);
    return tabs ? Array.from(tabs) : [];
  }

  /**
   * Get all clients with their active tabs
   */
  getAllClientsWithTabs() {
    const result = [];
    
    for (const [baseClientId, tabs] of this.activeTabs) {
      const client = this.clients.get(baseClientId);
      if (client) {
        result.push({
          ...client,
          baseClientId,
          activeTabs: Array.from(tabs),
          tabCount: tabs.size
        });
      }
    }
    
    return result;
  }

  /**
   * Get a specific tab by composite client ID
   */
  getTab(compositeClientId) {
    const { baseClientId, tabId } = this.parseCompositeClientId(compositeClientId);
    const tabs = this.activeTabs.get(baseClientId);
    
    if (!tabs) return null;
    
    const targetTabId = tabId || 'default';
    for (const tab of tabs) {
      if (tab.tabId === targetTabId) {
        return tab;
      }
    }
    
    return null;
  }

  /**
   * Get total tab count across all clients
   */
  getTotalTabCount() {
    let total = 0;
    for (const tabs of this.activeTabs.values()) {
      total += tabs.size;
    }
    return total;
  }

  /**
   * Cleanup stale tab references (called on disconnection)
   */
  cleanupStaleTab(baseClientId, tabId) {
    if (!this.activeTabs.has(baseClientId)) {
      return;
    }

    const tabs = this.activeTabs.get(baseClientId);
    const targetTabId = tabId || 'default';
    
    // Find and remove stale tab references
    const staleTabs = Array.from(tabs).filter(tab => 
      tab.tabId === targetTabId && 
      (!tab.connection || tab.connection.ws.readyState !== tab.connection.ws.OPEN)
    );
    
    staleTabs.forEach(staleTab => {
      tabs.delete(staleTab);
      logger.debug('Cleaned up stale tab reference', {
        baseClientId,
        tabId: staleTab.tabId
      });
    });

    // Remove client entry if no tabs remain
    if (tabs.size === 0) {
      this.activeTabs.delete(baseClientId);
    }
  }

  /**
   * Periodic cleanup of all stale tab connections
   */
  cleanupStaleConnections() {
    for (const [baseClientId, tabs] of this.activeTabs) {
      const staleTabs = Array.from(tabs).filter(tab => 
        !tab.connection || tab.connection.ws.readyState !== tab.connection.ws.OPEN
      );
      
      staleTabs.forEach(staleTab => {
        tabs.delete(staleTab);
        logger.debug('Cleaned up stale connection', {
          baseClientId,
          tabId: staleTab.tabId
        });
      });

      // Remove client entry if no tabs remain
      if (tabs.size === 0) {
        this.activeTabs.delete(baseClientId);
      }
    }
  }
}

export { ClientManager };