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
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs'
  },
  
  rpc: {
    timeout: parseInt(process.env.RPC_TIMEOUT) || 30000,
    maxConcurrentEvaluations: parseInt(process.env.MAX_CONCURRENT_EVALUATIONS) || 10
  }
};

export function validateConfig() {
  const errors = [];
  
  if (!CONFIG.llm.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }
  
  if (CONFIG.server.port < 1 || CONFIG.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  return errors;
}