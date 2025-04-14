-- SQL file to add default prompt templates to the system_prompts table
-- These templates are used for character card generation and other prompt operations
-- that were previously hardcoded in claude.ts

-- Check if the required types exist and add them if needed
INSERT OR IGNORE INTO system_prompts (
    id, 
    user_id, 
    type, 
    prompt_text, 
    is_custom, 
    created_at, 
    updated_at
) VALUES (
    'character_card_generation_template',
    'system',
    'chat',
    'Analyze the following text which represents writings and information about a person, potentially from different sources/platforms. Based *only* on this text, generate a structured JSON object representing their personality profile. The JSON object should follow the provided template structure.

Analysis Requirements:
1. Synthesize the core personality, values, voice style, tone, background, and expertise from ALL the text.
2. Analyze if the text (which may contain markers like "<source platform=''...'' medium=''...''") indicates significantly different communication styles or topics on specific platforms (e.g., LinkedIn vs. Blog). 
3. If platform-specific adaptations are clear, incorporate them into the appropriate sections.

Output Format:
- The output MUST be ONLY the generated JSON object.
- Make sure the output is valid JSON that can be parsed.
- Fill in all relevant fields in the template, leaving blank or removing fields only when no information is available.
- Ensure the "entity" section captures basic demographics if available.
- For the "personality" section, be specific about traits, strengths, and values.
- Make "voice" reflect their actual communication style based on the text.
- Use "platform_adaptations" to note any differences in tone/style across platforms like LinkedIn, Twitter, or blogs.
- Include expertise areas and background information extracted from the text.',
    0,
    datetime('now'),
    datetime('now')
);

-- Character card template as a system prompt (to make it editable)
INSERT OR IGNORE INTO system_prompts (
    id, 
    user_id, 
    type, 
    prompt_text, 
    is_custom, 
    created_at, 
    updated_at
) VALUES (
    'character_card_template',
    'system',
    'post',
    '{"entity":{"form":"human","occupation":"","gender":"","age":""},"personality":{"name":"","core_traits":[{"trait":"","strength":0.0}],"big_five":{"openness":0.0,"conscientiousness":0.0,"extraversion":0.0,"agreeableness":0.0,"neuroticism":0.0},"values":[{"name":"","expression":""}]},"voice":{"style":"","tone":"","qualities":[],"patterns":[]},"relationship":{"style":"","boundaries":""},"platform_adaptations":{"linkedin":{"tone":"","topics":[],"style":""},"twitter":{"tone":"","topics":[],"style":""},"blog":{"tone":"","topics":[],"style":""}},"expertise":[],"background":[],"directives":["NEVER narrate actions (no ''*clears throat*'', etc.)","NEVER provide meta-commentary","NEVER ask for feedback on your response","OUTPUT ONLY what the character would actually say/post"]}',
    0,
    datetime('now'),
    datetime('now')
); 