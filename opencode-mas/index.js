import path from 'path';
import { getActiveModel, loadConfig } from './config_parser.js';
import { ThemeEngine } from './theme_engine.js';
import { NetworkRouter } from './network_router.js';
import { createGrammarEngine } from './grammar_engine.js';
import { CommandEngine } from './command_engine.js';

console.log('\n╔════════════════════════════════════════╗');
console.log('║   OpenCode MAS — Główny Orchestrator   ║');
console.log('╚════════════════════════════════════════╝\n');

async function bootstrap() {
    const config = loadConfig();

    // 1. MOTYW TUI
    const themeEngine = new ThemeEngine();
    const activeTheme = themeEngine.applyThemeFromTuiJson();
    console.log(`[TUI] Motyw: ${activeTheme.name || 'custom(' + activeTheme.path + ')'}`);

    // 2. MODEL
    const model = getActiveModel();
    console.log(`[Model] Aktywny: ${model.fullIdentifier}`);
    if (model.options?.thinking) {
        console.log(`[Model] Thinking: enabled (budgetTokens: ${model.options.thinking.budgetTokens})`);
    }

    // 3. SIEĆ
    const router = new NetworkRouter();
    const usePrivateNet = config?.server?.mdns === true;
    if (usePrivateNet) {
        console.log(`[Sieć] mDNS włączone — domena: ${config.server.mdnsDomain}`);
        console.log(`[Sieć] Serwer nasłuchuje: ${config.server.hostname}:${config.server.port}`);
    }

    // 4. MCP
    const mcpServers = config?.mcp ?? {};
    const enabledMcp = Object.entries(mcpServers).filter(([, v]) => v.enabled);
    console.log(`[MCP] Aktywne serwery: ${enabledMcp.length}`);
    for (const [name, cfg] of enabledMcp) {
        const cmd = cfg.command ? cfg.command.join(' ') : cfg.url;
        console.log(`  → ${name}: ${cmd}`);
    }

    // 5. AGENCI
    const agents = config?.agent ?? {};
    console.log(`[Agenci] Zarejestrowane role: ${Object.keys(agents).join(', ')}`);

    // 6. POLECENIA
    const commandEngine = new CommandEngine(path.resolve('../'));
    console.log('[Commands] Dostępne komendy:');
    for (const cmd of commandEngine.list()) {
        console.log(`  → ${cmd.name}: ${cmd.description}`);
    }

    // 6. SILNIK GRAMATYKI (GGUF / fallback API)
    const localEngine = await createGrammarEngine();
    if (localEngine) {
        console.log('[GGUF] Silnik gramatyki: gotowy');
    }

    console.log('\n✔ OpenCode MAS uruchomiony pomyślnie. System gotowy.\n');

    return { config, model, activeTheme, router, agents };
}

bootstrap().catch(err => {
    console.error('[KRYTYCZNY BŁĄD] Nieudane uruchomienie MAS:', err.message);
    process.exit(1);
});
