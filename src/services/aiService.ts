import ClaudeAPI from '../api/claude';
import { TipiQuestion } from '../lib/tipiUtils';

// Initialize Claude API
const claudeApi = new ClaudeAPI();

/**
 * Simulates an AI assessment by having Claude respond to TIPI questions
 * based on a personality system prompt.
 * 
 * @param systemPrompt - The personality system prompt to use for simulation
 * @param questions - Array of TIPI questions to simulate answers for
 * @param temperature - Optional temperature setting for Claude API (0.0-1.0)
 * @returns Promise resolving to an array of simulated answers
 */
export async function simulateTipiAssessment(
    systemPrompt: string,
    questions: TipiQuestion[],
    temperature: number = 0.7
): Promise<string[]> {
    console.log('Starting AI personality assessment simulation with temperature:', temperature);
    
    // Create a single prompt that asks Claude to respond to all questions at once
    const userPrompt = `
You are simulating how a person with the personality described in your system prompt would respond to a personality assessment.

Instructions:
1. For each question below, respond with a number from 1 to 7, where:
   - 1 = Strongly Disagree
   - 4 = Neutral
   - 7 = Strongly Agree

2. Consider how the person described would honestly rate themselves on each trait pair.

3. IMPORTANT: Respond with ONLY the rating number for each question (e.g. "5"). 
   Do not include any explanations, just the number.

4. Respond to ALL questions in order.

Here are the questions:
${questions.map((q, i) => `Question ${i+1}: ${q.text}`).join('\n')}
`;

    try {
        // Call Claude API
        const response = await claudeApi.generateCompletion(
            [{ role: 'user', content: userPrompt }],
            {
                system: systemPrompt,
                temperature: temperature,
                max_tokens: 500
            }
        ) as string;

        console.log('Raw simulation response:', response);

        // Extract numerical ratings from the response
        const answers = parseSimulationResponse(response, questions.length);
        
        // Validation: Ensure we have the correct number of answers
        if (answers.length !== questions.length) {
            console.warn(`Expected ${questions.length} answers but got ${answers.length}`);
            // Fill in missing answers with "3" (neutral) if needed
            while (answers.length < questions.length) {
                answers.push("4");
            }
            // Trim extra answers if needed
            while (answers.length > questions.length) {
                answers.pop();
            }
        }

        return answers;
    } catch (error) {
        console.error('Error in AI assessment simulation:', error);
        throw new Error('Failed to simulate AI assessment responses');
    }
}

/**
 * Parses the AI response to extract numerical answers
 * 
 * @param responseText - The raw text response from Claude
 * @param expectedCount - The expected number of answers
 * @returns An array of string answers (numerical ratings as strings)
 */
function parseSimulationResponse(responseText: string, expectedCount: number): string[] {
    // Different parsing strategies to try
    const strategies = [
        // Strategy 1: Look for numbers 1-7 at the beginning of lines
        () => {
            const matches = responseText.match(/^([1-7])(?:\s|\.)/gm);
            return matches ? matches.map(m => m.trim().charAt(0)) : [];
        },
        
        // Strategy 2: Look for "Question X: Y" or "X: Y" patterns
        () => {
            const matches = responseText.match(/(?:Question\s+\d+:|Q\d+:|^\d+:)\s*([1-7])/gm);
            return matches ? matches.map(m => {
                const numMatch = m.match(/([1-7])$/);
                return numMatch ? numMatch[1] : "";
            }).filter(n => n) : [];
        },
        
        // Strategy 3: Just extract all standalone digits 1-7
        () => {
            const matches = responseText.match(/\b[1-7]\b/g);
            return matches ? matches.slice(0, expectedCount) : [];
        }
    ];
    
    // Try each strategy in order until we get enough answers
    for (const strategy of strategies) {
        const answers = strategy();
        if (answers.length >= expectedCount) {
            return answers.slice(0, expectedCount);
        }
    }
    
    // If all strategies fail, try a last resort approach - any digits 1-7
    const lastResort = responseText.match(/[1-7]/g);
    return lastResort ? lastResort.slice(0, expectedCount) : [];
} 