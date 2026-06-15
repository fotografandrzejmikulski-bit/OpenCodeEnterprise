import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

/**
 * Kryminalistyczna ekstrakcja (Forensic RAG).
 * Ekstrakcja danych z dokumentów PDF oraz OCR z obrazów.
 * Przeznaczone do logowania jako `osint-artifact` do pamięci hybrydowej agentów.
 */

export async function parsePdf(filePath) {
    console.log(`[Forensic RAG] Rozpoczynam parsowanie PDF: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdfParse(dataBuffer);
        console.log(`[Forensic RAG] Wyekstrahowano ${data.numpages} stron z PDF.`);
        return {
            source: filePath,
            type: 'osint-artifact-pdf',
            text: data.text
        };
    } catch (e) {
        console.error(`[Forensic RAG] Błąd parsowania PDF: ${e.message}`);
        throw e;
    }
}

export async function performOCR(imagePath, language = 'eng+pol') {
    console.log(`[Forensic RAG] Uruchamianie analizy OCR (Tesseract) na: ${imagePath}`);
    const worker = await createWorker(language);
    try {
        const { data: { text } } = await worker.recognize(imagePath);
        console.log(`[Forensic RAG] Zakończono ekstrakcję OCR.`);
        await worker.terminate();
        return {
            source: imagePath,
            type: 'osint-artifact-ocr',
            text: text
        };
    } catch (e) {
        console.error(`[Forensic RAG] Błąd OCR: ${e.message}`);
        await worker.terminate();
        throw e;
    }
}
