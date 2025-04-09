import { Request, Response, NextFunction, RequestHandler } from 'express';

// Define the type for an async function that acts as a route handler
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async route handler function to ensure errors are caught and passed to next().
 * @param fn The async route handler function.
 * @returns A standard Express RequestHandler.
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Ensure the function call is wrapped in a promise resolve/catch
        // to handle both synchronous errors and promise rejections.
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}; 