/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 * @param {number[]} arr1 - The first array of numbers.
 * @param {number[]} arr2 - The second array of numbers.
 * @returns {number | null} The correlation coefficient, or null if calculation is not possible.
 */
function calculateCorrelation(arr1: number[], arr2: number[]): number | null {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length || arr1.length < 2) {
        console.warn('Invalid input for correlation calculation. Arrays must be of the same length and have at least 2 elements.');
        return null;
    }

    const n = arr1.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const x = arr1[i];
        const y = arr2[i];

        // Ensure values are numbers
        if (typeof x !== 'number' || typeof y !== 'number') {
            console.warn(`Non-numeric value encountered at index ${i} during correlation calculation. Skipping pair.`);
            // Depending on requirements, could return null here or skip the pair.
            // Skipping allows calculation with remaining pairs if some are invalid.
            // If strictness is needed, return null immediately.
            // Let's return null for stricter handling.
            console.error('Correlation calculation aborted due to non-numeric values.');
            return null; 
        }

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
        // Correlation is undefined if one or both arrays have zero variance.
        // Can happen if all elements in an array are the same.
        console.warn('Correlation denominator is zero, indicating zero variance in one or both arrays.');
        // Return 0 or null? Returning 0 might be misleading. Null indicates calculation wasn't meaningful.
        return null; 
    }

    const correlation = numerator / denominator;

    // Clamp correlation to [-1, 1] due to potential floating point inaccuracies
    return Math.max(-1, Math.min(1, correlation));
}

export {
    calculateCorrelation
}; 