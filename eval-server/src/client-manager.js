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
        logger.warn('config.yaml not found, no global defaults will be applied');
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
        .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      
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
}

export { ClientManager };