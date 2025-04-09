import express, { Router, Request, Response } from 'express';
import { dbRun, dbGet } from '../lib/database';
import { TIPI_QUESTIONS, calculateTipiScores, TipiAnswers, TipiDimensionScores } from '../lib/tipiUtils'; // Import TS types/functions
import { simulateTipiAssessment } from '../services/aiService'; // Import the AI simulation function
import { calculateCorrelation } from '../lib/statsUtils'; // Import TS version
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../lib/asyncHandler'; // Import the wrapper

// Interfaces (Consider moving to a shared types file)
interface AssessmentResult {
    result_id: string;
    user_id: string;
    assessment_type: string;
    source: 'user' | 'ai';
    answers: string; // JSON string
    scores: string; // JSON string
    timestamp: string;
    persona_id?: string | null;
    temperature?: number | null;
    // Parsed versions (optional)
    parsedAnswers?: TipiAnswers;
    parsedScores?: TipiDimensionScores | null;
}

interface AlignmentScores {
    itemAgreement: number;
    traitCorrelation: number | null;
}

// Helper function to parse AI score from text (e.g., "Score: 5/7")
// Keep this local as it's specific to parsing AI string output
// NOTE: This function is no longer needed since we're using the new AI service approach
/*
function parseAIScore(textResponse: string | null | undefined): number | null {
    if (!textResponse) return null;
    // Adjusted regex for 1-7 range
    const match = textResponse.match(/\b([1-7])\b/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    console.warn(`Could not parse score from AI response: "${textResponse}"`);
    return null; // Indicate failure to parse
}
*/

// Function to create the assessment router
function createAssessmentRouter(): Router {
    const router = express.Router();

    // GET /api/assessment/tipi-questions - Get the TIPI questions
    router.get('/tipi-questions', asyncHandler(async (_: Request, res: Response) => {
        // Transform the raw TIPI questions to a frontend-friendly format
        const frontendQuestions = TIPI_QUESTIONS.map(q => ({
            id: q.id,
            text: q.text,
            direction: q.reversed ? 'negative' : 'positive',
            dimension: q.dimension
        }));
        
        res.status(200).json(frontendQuestions);
    }));

    // POST /api/assessment/:userId/submit - User submits their assessment answers
    router.post('/:userId/submit', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        // Explicitly type the expected body structure
        const { answers }: { answers: TipiAnswers } = req.body;
        
        if (!userId) {
             res.status(400).json({ message: 'Missing userId parameter.' });
             return;
        }
        if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
            res.status(400).json({ message: 'Invalid or incomplete answers provided' });
            return;
        }
        // Optional: Validate answers length matches TIPI_QUESTIONS length?
        if (Object.keys(answers).length !== TIPI_QUESTIONS.length) {
            console.warn(`User ${userId} submitted ${Object.keys(answers).length} answers, expected ${TIPI_QUESTIONS.length}.`);
            // Decide if this should be an error
        }

        // Calculate scores using the imported function
        const scores = calculateTipiScores(answers);

        // Save to database - dbRun throws on error
        const resultId = uuidv4();
        const timestamp = new Date().toISOString();
        const answersJson = JSON.stringify(answers);
        const scoresJson = JSON.stringify(scores);

        await dbRun(
            'INSERT INTO assessment_results (result_id, user_id, assessment_type, source, answers, scores, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [resultId, userId, 'TIPI', 'user', answersJson, scoresJson, timestamp]
        );

        res.status(201).json({ message: 'Assessment submitted successfully', resultId, scores });
        return;
    }));

    // POST /api/assessment/:userId/simulate - Trigger AI simulation
    router.post('/:userId/simulate', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        // Type the expected body structure
        const { personaId, temperature }: { personaId?: string; temperature?: number } = req.body;
        
         if (!userId) {
             res.status(400).json({ message: 'Missing userId parameter.' });
             return;
        }
        if (!personaId) {
            res.status(400).json({ message: 'Missing personaId for simulation' });
            return;
        }

        // 1. Fetch the persona variation or primary persona to get system prompt
        // dbGet throws on error
        let systemPrompt: string | null | undefined = null;
        // Try fetching variation first
        const variation = await dbGet<{ system_prompt: string | null }>(`
            SELECT system_prompt FROM persona_variations 
            WHERE user_id = ? AND persona_id = ? AND module_context = ? 
            ORDER BY updated_at DESC LIMIT 1`, 
            [userId, personaId, 'assessment'] // Assuming personaId passed is the *primary* one
        );
        systemPrompt = variation?.system_prompt;

        if (!systemPrompt) {
             // Fallback to primary persona definition
             const persona = await dbGet<{ persona_json: string }>(`
                SELECT persona_json FROM personas WHERE persona_id = ? AND user_id = ?`, 
                [personaId, userId]
             );
             if (persona?.persona_json) {
                 try {
                     const definitionObj = JSON.parse(persona.persona_json);
                     // Attempt to extract system prompt or use definition as fallback
                     systemPrompt = definitionObj.system_prompt || `Simulate personality based on: ${persona.persona_json}`;
                 } catch (e) {
                     console.warn(`Could not parse primary persona JSON for user ${userId}, using raw.`);
                     systemPrompt = `Simulate personality based on: ${persona.persona_json}`; // Use raw string if not JSON
                 }
             }
        }

        if (!systemPrompt) {
             res.status(404).json({ message: 'Could not determine system prompt for simulation' });
             return;
        }

        // 2. Simulate AI answers using the imported TIPI_QUESTIONS
        const aiAnswersRaw = await simulateTipiAssessment(systemPrompt, TIPI_QUESTIONS, temperature);
        
        // 3. Parse AI answers
        const aiAnswers: TipiAnswers = {};
        const simulationErrors: string[] = [];
        
        if (!aiAnswersRaw || !Array.isArray(aiAnswersRaw)) {
            throw new Error('AI simulation failed: No valid answers returned');
        }
        
        TIPI_QUESTIONS.forEach((q, index) => {
            if (index >= aiAnswersRaw.length) {
                simulationErrors.push(`Missing answer for ${q.id}`);
                aiAnswers[q.id] = 4; // Default to neutral if answer is missing
            } else {
                const score = parseInt(aiAnswersRaw[index], 10);
                if (isNaN(score) || score < 1 || score > 7) {
                    simulationErrors.push(`Invalid score for ${q.id}: ${aiAnswersRaw[index]}`);
                    aiAnswers[q.id] = 4; // Default to neutral if parsing fails
                } else {
                    aiAnswers[q.id] = score;
                }
            }
        });

        // 4. Calculate scores using the imported function
        const aiScores = calculateTipiScores(aiAnswers);

        // 5. Save AI results to database - dbRun throws on error
        const resultId = uuidv4();
        const timestamp = new Date().toISOString();
        const answersJson = JSON.stringify(aiAnswers);
        const scoresJson = JSON.stringify(aiScores);

        await dbRun(
            'INSERT INTO assessment_results (result_id, user_id, assessment_type, source, answers, scores, timestamp, persona_id, temperature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [resultId, userId, 'TIPI', 'ai', answersJson, scoresJson, timestamp, personaId, temperature]
        );

        res.status(201).json({ 
            message: 'AI simulation successful', 
            resultId, 
            scores: aiScores, 
            answers: aiAnswers, 
            errors: simulationErrors.length > 0 ? simulationErrors : undefined
        });
        return;
    }));

    // POST /api/assessment/:userId/calculate-alignment - Calculate and store alignment
    router.post('/:userId/calculate-alignment', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assessmentType = 'TIPI' }: { assessmentType?: string } = req.body;

        if (!userId) {
            res.status(400).json({ message: 'Missing userId parameter' });
            return;
        }

        // 1. Fetch latest user results for this type - dbGet throws on error
        const userResult = await dbGet<AssessmentResult>(
            `SELECT * FROM assessment_results 
             WHERE user_id = ? AND assessment_type = ? AND source = 'user' 
             ORDER BY timestamp DESC LIMIT 1`, [userId, assessmentType]
        );

        // 2. Fetch latest AI results for this type - dbGet throws on error
        const aiResult = await dbGet<AssessmentResult>(
            `SELECT * FROM assessment_results 
             WHERE user_id = ? AND assessment_type = ? AND source = 'ai' 
             ORDER BY timestamp DESC LIMIT 1`, [userId, assessmentType]
        );

        if (!userResult || !aiResult) {
            res.status(404).json({ message: `Missing user or AI assessment results for type '${assessmentType}' needed for alignment.` });
            return;
        }

        // Parse the JSON data
        let userRawAnswers: TipiAnswers = {};
        let aiRawAnswers: TipiAnswers = {};
        let userScores: TipiDimensionScores | null = null;
        let aiScores: TipiDimensionScores | null = null;

        try { userRawAnswers = JSON.parse(userResult.answers); } catch (e) { throw new Error('Failed to parse user answers JSON'); }
        try { aiRawAnswers = JSON.parse(aiResult.answers); } catch (e) { throw new Error('Failed to parse AI answers JSON'); }
        try { userScores = JSON.parse(userResult.scores); } catch (e) { throw new Error('Failed to parse user scores JSON'); }
        try { aiScores = JSON.parse(aiResult.scores); } catch (e) { throw new Error('Failed to parse AI scores JSON'); }
        
        if (!userScores || !aiScores) { // Should not happen if parsing succeeded
             throw new Error('Parsed scores became null unexpectedly.');
        }

        // 3. Calculate Alignment Metrics
        let itemAgreement = 0;
        let matchingItems = 0;
        let comparableItems = 0; // Count items where both user and AI answered
        
        TIPI_QUESTIONS.forEach(question => {
             const qId = question.id;
             const userAnswer = userRawAnswers[qId];
             const aiAnswer = aiRawAnswers[qId];
             
             // Only compare if both provided a valid numeric score
             if (typeof userAnswer === 'number' && typeof aiAnswer === 'number') {
                comparableItems++;
                if (userAnswer === aiAnswer) {
                    matchingItems++;
                }
             }
        });
        itemAgreement = comparableItems > 0 ? (matchingItems / comparableItems) : 0;

        // Trait Correlation (requires scores for all dimensions)
        // Extract score values in a consistent order
        const scoreDims: (keyof TipiDimensionScores)[] = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
        const userScoreValues = scoreDims.map(dim => userScores![dim]).filter(score => score !== null) as number[];
        const aiScoreValues = scoreDims.map(dim => aiScores![dim]).filter(score => score !== null) as number[];

        let traitCorrelation: number | null = null;
        if (userScoreValues.length === scoreDims.length && aiScoreValues.length === scoreDims.length) { // Ensure all dimensions had non-null scores
             traitCorrelation = calculateCorrelation(userScoreValues, aiScoreValues);
        } else {
            console.warn("Cannot calculate trait correlation: Missing non-null scores for one or more dimensions.");
        }

        const alignmentScores: AlignmentScores = {
            itemAgreement: itemAgreement,
            traitCorrelation: traitCorrelation,
        };

        // 4. Save Alignment Metrics to DB - dbRun throws on error
        const metricId = uuidv4();
        const now = new Date().toISOString();
        const alignmentScoresJson = JSON.stringify(alignmentScores);
        
        const insertMetricQuery = `
            INSERT INTO alignment_metrics 
            (metric_id, user_id, assessment_type, user_assessment_result_id, ai_assessment_result_id, alignment_scores_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        // Consider ON CONFLICT logic if needed

        await dbRun(insertMetricQuery, [
            metricId,
            userId,
            assessmentType,
            userResult.result_id, // Use the actual result IDs
            aiResult.result_id,
            alignmentScoresJson,
            now
        ]);

        res.status(201).json({
            message: 'Alignment metrics calculated and saved successfully.',
            metric_id: metricId,
            user_result_id: userResult.result_id,
            ai_result_id: aiResult.result_id,
            alignment_scores: alignmentScores,
            timestamp: now
        });
        return;
    }));

    // GET /api/assessment/results/:resultId - Fetch a specific assessment result
    router.get('/results/:resultId', asyncHandler(async (req: Request, res: Response) => {
        const { resultId } = req.params;

        if (!resultId) {
             res.status(400).json({ message: 'Missing resultId parameter.' });
             return;
        }

        // dbGet throws on error
        const result = await dbGet<AssessmentResult>('SELECT * FROM assessment_results WHERE result_id = ?', [resultId]);

        if (!result) {
            res.status(404).json({ message: 'Assessment result not found' });
            return;
        }

        // Optionally parse JSON fields before returning
        try { result.parsedAnswers = JSON.parse(result.answers); } catch (e) { console.warn(`Failed to parse answers JSON for result ${resultId}`); }
        try { result.parsedScores = JSON.parse(result.scores); } catch (e) { console.warn(`Failed to parse scores JSON for result ${resultId}`); }

        res.status(200).json(result);
        return;
    }));

    return router;
}

export default createAssessmentRouter; 