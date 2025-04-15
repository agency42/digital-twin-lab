/**
 * Test script to view constructed prompts
 * Run with: node src/server/test-prompt.js
 */

// Import required modules
const sqlite3 = require('sqlite3').verbose();
const PromptService = require('../services/PromptService');

async function main() {
  const db = new sqlite3.Database('./database/digital_twin_lab.db');
  
  // User ID to test
  const userId = 'test_user_id';
  const contentType = 'post';
  
  // Get system prompt
  const systemPrompt = await new Promise((resolve, reject) => {
    db.get('SELECT prompt_text FROM system_prompts WHERE user_id = ? AND type = ?', 
      [userId, 'post'], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.prompt_text : null);
      });
  });
  
  // Get instruction template
  const instruction = await new Promise((resolve, reject) => {
    db.get('SELECT instruction_text FROM instruction_templates WHERE user_id = ? AND type = ?', 
      [userId, 'post'], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.instruction_text : null);
      });
  });
  
  console.log('CONSTRUCTED PROMPT:');
  console.log('===================');
  
  // Format as markdown
  const formattedPrompt = `# Digital Twin Prompt

## Character Card
${systemPrompt}

## Instructions
${instruction}
`;
  
  console.log(formattedPrompt);
  
  // Close the database
  db.close();
}

main().catch(err => console.error(err)); 