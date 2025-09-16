import { config } from 'dotenv';

config();

export const CONFIG = {
  server: {
    port: parseInt(process.env.PORT) || 8080,
    host: process.env.HOST || 'localhost'
  },

  llm: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.JUDGE_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.JUDGE_TEMPERATURE) || 0.1
  },

  // LLM Provider Configuration for configure_llm API
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    litellm: {
      endpoint: process.env.LITELLM_ENDPOINT,
      apiKey: process.env.LITELLM_API_KEY
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY
    }
  },

  // Default model configuration
  defaults: {
    provider: process.env.DEFAULT_PROVIDER || 'openai',
    mainModel: process.env.DEFAULT_MAIN_MODEL || 'gpt-4',
    miniModel: process.env.DEFAULT_MINI_MODEL || 'gpt-4-mini',
    nanoModel: process.env.DEFAULT_NANO_MODEL || 'gpt-3.5-turbo'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs'
  },

  rpc: {
    timeout: parseInt(process.env.RPC_TIMEOUT) || 1500000, // 25 minutes default
    maxConcurrentEvaluations: parseInt(process.env.MAX_CONCURRENT_EVALUATIONS) || 10
  },

  security: {
    authSecretKey: process.env.AUTH_SECRET_KEY
  },

  clients: {
    dir: process.env.CLIENTS_DIR || './clients'
  },

  evals: {
    dir: process.env.EVALS_DIR || './evals'
  }
};

export function validateConfig(requireLLM = false) {
  const errors = [];
  
  // Only require OpenAI API key if LLM judge is explicitly needed
  if (requireLLM && !CONFIG.llm.apiKey) {
    errors.push('OPENAI_API_KEY is required when using LLM judge');
  }
  
  if (CONFIG.server.port < 1 || CONFIG.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  return errors;
}