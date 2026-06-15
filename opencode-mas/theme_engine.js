import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('--- Inicjalizacja silnika motywów TUI ---');

export class ThemeEngine {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.userConfigDir = path.join(os.homedir(), '.config/opencode/themes');
        this.projectConfigDir = path.join(this.projectRoot, '.opencode/themes');
        this.cwdConfigDir = path.join(process.cwd(), '.opencode/themes');
        
        // Wbudowane motywy
        this.builtinThemes = [
            'system', 'tokyonight', 'everforest', 'ayu', 
            'catppuccin', 'catppuccin-macchiato', 'gruvbox', 
            'kanagawa', 'nord', 'matrix', 'one-dark'
        ];
    }

    checkTruecolorSupport() {
        if (process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') {
            console.log('Truecolor wspierany natywnie.');
            return true;
        }
        console.warn('OSTRZEŻENIE: Brak zmiennej $COLORTERM=truecolor. Kolory mogą wyświetlać się nieprawidłowo.');
        return false;
    }

    resolveTheme(themeName) {
        if (this.builtinThemes.includes(themeName)) {
            console.log(`Załadowano wbudowany motyw: ${themeName}`);
            return { type: 'builtin', name: themeName };
        }

        const customPaths = [
            path.join(this.cwdConfigDir, `${themeName}.json`),
            path.join(this.projectConfigDir, `${themeName}.json`),
            path.join(this.userConfigDir, `${themeName}.json`)
        ];

        for (const p of customPaths) {
            if (fs.existsSync(p)) {
                try {
                    const themeData = JSON.parse(fs.readFileSync(p, 'utf-8'));
                    console.log(`Załadowano własny motyw z: ${p}`);
                    return { type: 'custom', path: p, data: themeData };
                } catch (e) {
                    console.error(`Błąd parsowania motywu ${p}:`, e.message);
                }
            }
        }
        
        console.warn(`Nie znaleziono motywu: ${themeName}. Fallback do 'system'.`);
        return { type: 'builtin', name: 'system' };
    }

    applyThemeFromTuiJson() {
        this.checkTruecolorSupport();
        
        const tuiJsonPath = path.resolve('../tui.json');
        let themeName = 'system';
        
        if (fs.existsSync(tuiJsonPath)) {
            try {
                const tuiConfig = JSON.parse(fs.readFileSync(tuiJsonPath, 'utf-8'));
                if (tuiConfig.theme) {
                    themeName = tuiConfig.theme;
                }
            } catch (e) {
                console.error('Błąd parsowania tui.json:', e.message);
            }
        }
        
        return this.resolveTheme(themeName);
    }
}
