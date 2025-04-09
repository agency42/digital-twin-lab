/**
 * pdfProcessor.ts - Service for extracting text from PDF files
 */

import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

/**
 * Interface for the result of PDF text extraction
 */
interface PDFExtractResult {
  text: string;
  pageCount: number;
  info?: Record<string, any>;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Service for processing PDF files and extracting their content
 */
class PdfProcessor {
  /**
   * Extracts text from a PDF file and saves it as a text file
   * @param pdfPath The path to the PDF file
   * @returns The extraction result with text and metadata
   */
  async extractText(pdfPath: string): Promise<PDFExtractResult> {
    try {
      // Validate the file exists
      await fs.access(pdfPath);
      
      // Read the PDF file
      const dataBuffer = await fs.readFile(pdfPath);
      
      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);
      
      // Create the result object
      const result: PDFExtractResult = {
        text: pdfData.text || '',
        pageCount: pdfData.numpages || 0,
        info: pdfData.info || {},
        metadata: pdfData.metadata || {}
      };
      
      // Write the extracted text to a file with the same name but .txt extension
      const textFilePath = pdfPath.replace(/\.pdf$/i, '.txt');
      await fs.writeFile(textFilePath, result.text, 'utf-8');
      
      console.log(`Successfully extracted text from PDF: ${path.basename(pdfPath)}`);
      console.log(`Text saved to: ${path.basename(textFilePath)}`);
      
      return result;
    } catch (error: any) {
      console.error(`Error extracting text from PDF ${pdfPath}:`, error);
      
      return {
        text: '',
        pageCount: 0,
        error: error.message || 'Unknown error during PDF processing'
      };
    }
  }
}

export default PdfProcessor; 