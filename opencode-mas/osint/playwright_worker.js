import { chromium } from 'playwright';

/**
 * Zastępuje Native Messaging Host używając Playwright (CDP)
 * Fetching the Accessibility Tree for context token compression.
 */
export async function fetchAccessibilityTree(url) {
    console.log(`[OSINT CDP] Uruchamianie bezstanowej instancji Chromium dla: ${url}`);
    
    // Uruchomienie przeglądarki z flagami OPSEC (Headless)
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        // Pobieranie drzewa dostępności z CDP (Chrome DevTools Protocol)
        const cdpSession = await page.context().newCDPSession(page);
        const { nodes } = await cdpSession.send('Accessibility.getFullAXTree');
        
        console.log(`[OSINT CDP] Pomyślnie zrzucono drzewo dostępności: ${nodes.length} węzłów.`);
        
        // Ekstrakcja kluczowego tekstu (oszczędność tokenów w stosunku do pełnego HTML)
        const textContent = nodes
            .filter(n => n.name && n.name.value)
            .map(n => n.name.value)
            .join('\n');
            
        await browser.close();
        return textContent;
    } catch (e) {
        console.error(`[OSINT CDP] Błąd: ${e.message}`);
        await browser.close();
        throw e;
    }
}
