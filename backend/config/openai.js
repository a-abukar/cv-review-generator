const OpenAI = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Debug logging utility
const debug = {
  log: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) console.log('Data:', JSON.stringify(data, null, 2));
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (error) console.error('Error details:', error);
  }
};

// Initialize OpenAI client
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is missing');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  debug.log('OpenAI client initialized successfully');
} catch (error) {
  debug.error('Failed to initialize OpenAI client:', error);
  process.exit(1); // Exit if we can't initialize OpenAI
}

module.exports = { openai, debug }; 