// Define interface for TIPI question structure
interface TipiQuestion {
    id: string;
    text: string;
    dimension: 'extraversion' | 'agreeableness' | 'conscientiousness' | 'neuroticism' | 'openness';
    reversed: boolean;
}

// Define type for the answers object
// Allows any string key (q1, q2, ...) mapped to a number or undefined
type TipiAnswers = { [key: string]: number | undefined };

// Define type for the calculated scores
type TipiDimensionScores = {
    extraversion: number | null;
    agreeableness: number | null;
    conscientiousness: number | null;
    neuroticism: number | null;
    openness: number | null;
};

const TIPI_QUESTIONS: TipiQuestion[] = [
  { id: 'q1', text: 'Extraverted, enthusiastic.', dimension: 'extraversion', reversed: false },
  { id: 'q2', text: 'Critical, quarrelsome.', dimension: 'agreeableness', reversed: true },
  { id: 'q3', text: 'Dependable, self-disciplined.', dimension: 'conscientiousness', reversed: false },
  { id: 'q4', text: 'Anxious, easily upset.', dimension: 'neuroticism', reversed: false },
  { id: 'q5', text: 'Open to new experiences, complex.', dimension: 'openness', reversed: false },
  { id: 'q6', text: 'Reserved, quiet.', dimension: 'extraversion', reversed: true },
  { id: 'q7', text: 'Sympathetic, warm.', dimension: 'agreeableness', reversed: false },
  { id: 'q8', text: 'Disorganized, careless.', dimension: 'conscientiousness', reversed: true },
  { id: 'q9', text: 'Calm, emotionally stable.', dimension: 'neuroticism', reversed: true },
  { id: 'q10', text: 'Conventional, uncreative.', dimension: 'openness', reversed: true },
];

/**
 * Calculates Big Five dimension scores from TIPI answers.
 * Assumes answers is an object like { q1: 5, q2: 2, ... }
 * where values are on a 1-7 scale.
 * @param {TipiAnswers} answers - Object mapping question IDs to scores (1-7).
 * @returns {TipiDimensionScores} Object containing scores for each dimension (average of items).
 */
function calculateTipiScores(answers: TipiAnswers): TipiDimensionScores {
    // Initialize score accumulators for each dimension
    const scores: { [key in keyof TipiDimensionScores]: number[] } = {
        extraversion: [],
        agreeableness: [],
        conscientiousness: [],
        neuroticism: [], // Also called Emotional Stability
        openness: [],      // Also called Openness to Experience
    };

    TIPI_QUESTIONS.forEach((q: TipiQuestion) => {
        let score = answers[q.id];
        // Validate score type and range
        if (typeof score !== 'number' || score < 1 || score > 7) {
            console.warn(`Invalid score for ${q.id}: ${score}. Skipping.`);
            return; // Skip if score is invalid
        }

        // Reverse score if necessary (1=7, 2=6, ..., 7=1)
        if (q.reversed) {
            score = 8 - score;
        }

        // Check if the dimension exists before pushing
        if (q.dimension in scores) {
            scores[q.dimension].push(score);
        } else {
             // This case should theoretically not happen with the defined types,
             // but good for robustness if TIPI_QUESTIONS were modified incorrectly.
             console.warn(`Unknown dimension ${q.dimension} for question ${q.id}`);
        }
    });

    // Calculate average score for each dimension
    const dimensionScores: Partial<TipiDimensionScores> = {}; // Use Partial initially
    for (const dim in scores) {
        // Type assertion to ensure dim is a key of TipiDimensionScores
        const dimensionKey = dim as keyof TipiDimensionScores;
        const items = scores[dimensionKey];
        if (items.length > 0) {
             // Average the scores for the items in this dimension
            dimensionScores[dimensionKey] = items.reduce((sum, val) => sum + val, 0) / items.length;
        } else {
            // Handle case where no valid scores were provided for a dimension
            dimensionScores[dimensionKey] = null; // Assign null if no scores
             console.warn(`No valid scores found for dimension: ${dimensionKey}`);
        }
    }

    // Ensure all dimensions are present in the final object, even if null
    const finalScores: TipiDimensionScores = {
        extraversion: dimensionScores.extraversion !== undefined ? dimensionScores.extraversion : null,
        agreeableness: dimensionScores.agreeableness !== undefined ? dimensionScores.agreeableness : null,
        conscientiousness: dimensionScores.conscientiousness !== undefined ? dimensionScores.conscientiousness : null,
        neuroticism: dimensionScores.neuroticism !== undefined ? dimensionScores.neuroticism : null,
        openness: dimensionScores.openness !== undefined ? dimensionScores.openness : null,
    };

    return finalScores;
}

export {
    TipiQuestion, // Export interface if needed elsewhere
    TipiAnswers, // Export type if needed elsewhere
    TipiDimensionScores, // Export type if needed elsewhere
    TIPI_QUESTIONS,
    calculateTipiScores,
}; 