/**
 * Migration script to convert flat prompt structure to component-based structure
 * 
 * This script:
 * 1. Reads existing base_prompts table
 * 2. Parses the JSON to separate character info from instructions
 * 3. Creates entries in character_cards and instruction_sets tables
 * 4. Creates new prompt_templates linking components
 * 5. Updates user references
 * 6. Migrates prompt_variations
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Path to database
const DB_PATH = path.join(__dirname, '..', 'database', 'digital_twin_lab.db');

// Utility to separate character card data from instructions
function separateComponentsFromJson(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    
    // Character card fields
    const characterFields = [
      'name', 'handle', 'background', 'personality_traits',
      'voice_characteristics', 'communication_patterns',
      'gender', 'age', 'occupation', 'form'
    ];
    
    // Instruction fields
    const instructionFields = [
      'directives', 'platform_adaptations', 'platform_instructions',
      'output_format', 'generation_instructions', 'main_goal',
      'twitter_instructions', 'linkedin_instructions', 'blog_instructions'
    ];
    
    // Separate the data
    const characterData = {};
    const instructionData = {};
    
    // Copy all fields to their respective objects
    for (const [key, value] of Object.entries(data)) {
      if (characterFields.includes(key)) {
        characterData[key] = value;
      } else if (instructionFields.includes(key)) {
        instructionData[key] = value;
      } else {
        // For unknown fields, add to both to be safe
        characterData[key] = value;
        instructionData[key] = value;
      }
    }
    
    // Ensure characterData has a name
    if (!characterData.name && data.name) {
      characterData.name = data.name;
    }
    
    return {
      characterData,
      instructionData,
      originalData: data
    };
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return {
      characterData: { name: 'Unknown' },
      instructionData: {},
      originalData: {}
    };
  }
}

async function migrateDatabase() {
  let db;
  
  try {
    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    console.log('Connected to database:', DB_PATH);
    
    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON');
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    // 1. Get all base prompts
    const basePrompts = await db.all('SELECT * FROM base_prompts');
    console.log(`Found ${basePrompts.length} base prompts to migrate`);
    
    // 2. Process each base prompt
    for (const prompt of basePrompts) {
      console.log(`\nProcessing base prompt for user: ${prompt.user_id}`);
      
      // Parse prompt and separate components
      const { characterData, instructionData, originalData } = 
        separateComponentsFromJson(prompt.prompt_text);
      
      // Generate new IDs
      const cardId = uuidv4();
      const instructionId = uuidv4();
      const templateId = uuidv4();
      
      // Insert character card
      await db.run(
        `INSERT INTO character_cards 
        (card_id, user_id, card_name, card_data, based_on_assets, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          cardId,
          prompt.user_id,
          `${characterData.name || 'Character'} Card`,
          JSON.stringify(characterData),
          prompt.based_on_assets,
          prompt.created_at,
          prompt.updated_at
        ]
      );
      console.log(`  Created character card: ${cardId}`);
      
      // Insert instruction set
      await db.run(
        `INSERT INTO instruction_sets
        (instruction_id, user_id, instruction_name, instruction_data, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [
          instructionId,
          prompt.user_id,
          'Default Instructions',
          JSON.stringify(instructionData),
          prompt.created_at,
          prompt.updated_at
        ]
      );
      console.log(`  Created instruction set: ${instructionId}`);
      
      // Insert prompt template
      await db.run(
        `INSERT INTO prompt_templates
        (template_id, user_id, template_name, card_id, instruction_id, assembled_prompt, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          templateId,
          prompt.user_id,
          `${characterData.name || 'Default'} Template`,
          cardId,
          instructionId,
          prompt.prompt_text, // Keep original assembled prompt for compatibility
          prompt.created_at,
          prompt.updated_at
        ]
      );
      console.log(`  Created prompt template: ${templateId}`);
      
      // Update user reference
      await db.run(
        `UPDATE users SET 
        default_template_id = ?,
        default_card_id = ?,
        default_instruction_id = ?
        WHERE user_id = ?`,
        [templateId, cardId, instructionId, prompt.user_id]
      );
      console.log(`  Updated user references for: ${prompt.user_id}`);
      
      // Migrate prompt variations for this user
      const variations = await db.all(
        'SELECT * FROM prompt_variations WHERE base_prompt_id = ?', 
        [prompt.base_prompt_id]
      );
      
      for (const variation of variations) {
        // For each variation, create a new entry in prompt_variations_new
        await db.run(
          `INSERT INTO prompt_variations_new
          (variation_id, user_id, template_id, module_context, assembled_prompt, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            variation.variation_id,
            variation.user_id,
            templateId,
            variation.module_context,
            variation.system_prompt_override,
            variation.created_at,
            variation.updated_at
          ]
        );
        console.log(`  Migrated variation for context: ${variation.module_context}`);
      }
    }
    
    // Commit transaction
    await db.run('COMMIT');
    console.log('\nMigration completed successfully!');
    
    // Optional: Print instructions for manual steps
    console.log('\nNext steps:');
    console.log('1. Verify the migrated data');
    console.log('2. Update application code to use new tables');
    console.log('3. When ready, drop old tables and rename new ones');
    
  } catch (error) {
    if (db) {
      // Rollback on error
      await db.run('ROLLBACK');
    }
    console.error('Migration failed:', error);
  } finally {
    if (db) {
      await db.close();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
migrateDatabase().catch(console.error); 