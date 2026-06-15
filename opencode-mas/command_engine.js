import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { loadConfig } from './config_parser.js';

/**
 * Silnik systemu poleceń OpenCode MAS.
 * Wczytuje komendy z config.json oraz plików Markdown z katalogów:
 * 1. ~/.config/opencode/commands/
 * 2. <project-root>/.opencode/commands/
 * 3. ./.opencode/commands/
 */
export class CommandEngine {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.globalCommandsDir = path.join(os.homedir(), '.config/opencode/commands');
        this.projectCommandsDir = path.join(this.projectRoot, '.opencode/commands');
        this.cwdCommandsDir = path.join(process.cwd(), '.opencode/commands');
        this.commands = {};
        this._load();
    }

    _load() {
        const config = loadConfig();

        // Wczytaj komendy z config.json
        if (config.command) {
            for (const [name, def] of Object.entries(config.command)) {
                this.commands[name] = { ...def, source: 'config.json' };
            }
        }

        // Wczytaj komendy z plików Markdown (nadpisują config.json)
        const dirs = [
            this.globalCommandsDir,
            this.projectCommandsDir,
            this.cwdCommandsDir
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const name = path.basename(file, '.md');
                const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
                const parsed = this._parseMarkdownCommand(raw, file, dir);
                this.commands[name] = { ...parsed, source: path.join(dir, file) };
            }
        }

        console.log(`[Commands] Załadowano ${Object.keys(this.commands).length} poleceń: ${Object.keys(this.commands).join(', ')}`);
    }

    _parseMarkdownCommand(raw, filename, dir) {
        const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            return { template: raw.trim(), description: filename };
        }

        const meta = {};
        for (const line of frontmatterMatch[1].split('\n')) {
            const [k, ...v] = line.split(':');
            if (k && v.length) meta[k.trim()] = v.join(':').trim();
        }

        return {
            template: frontmatterMatch[2].trim(),
            description: meta.description || '',
            agent: meta.agent || 'plan',
            model: meta.model || null,
            subtask: meta.subtask === 'true'
        };
    }

    /**
     * Rozwiązuje szablon komendy:
     * - Zastępuje $ARGUMENTS, $1, $2, $3
     * - Wykonuje !shell-command i wkleja wynik
     * - Wczytuje zawartość @ścieżka/do/pliku
     */
    resolve(commandName, rawArgs = '') {
        const cmd = this.commands[commandName];
        if (!cmd) {
            throw new Error(`Nieznane polecenie: /${commandName}. Dostępne: ${Object.keys(this.commands).join(', ')}`);
        }

        const argParts = rawArgs.trim().split(/\s+/).filter(Boolean);
        let template = cmd.template;

        // Podstawienie $ARGUMENTS i $1, $2, $3...
        template = template.replace(/\$ARGUMENTS/g, rawArgs);
        argParts.forEach((arg, i) => {
            template = template.replace(new RegExp(`\\$${i + 1}`, 'g'), arg);
        });

        // Wykonanie !shell-command
        template = template.replace(/!([^\n]+)/g, (_, shellCmd) => {
            try {
                const output = execSync(shellCmd, { encoding: 'utf-8', cwd: this.projectRoot });
                console.log(`[Commands] Wykonano shell: ${shellCmd}`);
                return output.trim();
            } catch (e) {
                console.error(`[Commands] Błąd shell (!${shellCmd}): ${e.message}`);
                return `[Błąd wykonania: ${shellCmd}]`;
            }
        });

        // Wczytanie @plik
        template = template.replace(/@([\S]+)/g, (_, filePath) => {
            const absPath = path.resolve(this.projectRoot, filePath);
            if (fs.existsSync(absPath)) {
                console.log(`[Commands] Wczytano plik: ${absPath}`);
                return `\`\`\`\n${fs.readFileSync(absPath, 'utf-8')}\n\`\`\``;
            }
            return `[Nie znaleziono pliku: ${filePath}]`;
        });

        return {
            resolvedPrompt: template,
            agent: cmd.agent || 'plan',
            model: cmd.model || null,
            subtask: cmd.subtask || false
        };
    }

    list() {
        return Object.entries(this.commands).map(([name, def]) => ({
            name: `/${name}`,
            description: def.description || '—',
            agent: def.agent || 'plan',
            source: def.source
        }));
    }
}
