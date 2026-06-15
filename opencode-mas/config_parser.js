import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('--- Inicjalizacja parsera konfiguracji MAS ---');

const CONFIG_PATHS = [
    path.resolve('../config.json'),
    path.join(os.homedir(), '.config/opencode/opencode.json'),
    path.resolve('opencode.json')
];

export function loadConfig() {
    for (const configPath of CONFIG_PATHS) {
        if (fs.existsSync(configPath)) {
            try {
                const rawData = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(rawData);
            } catch (e) {
                console.error(`Błąd parsowania ${configPath}:`, e.message);
            }
        }
    }
    return {};
}

export function getActiveModel(cliModelFlag = null, lastUsedModel = null) {
    const config = loadConfig();
    
    // Priorytet ładowania modeli
    let selectedModel = cliModelFlag || config.model || lastUsedModel || "lmstudio/google/gemma-3n-e4b";
    let providerId = "unknown";
    let modelId = selectedModel;
    
    if (selectedModel.includes('/')) {
        [providerId, modelId] = selectedModel.split('/');
    }

    console.log(`Wybrany model: ${selectedModel} (Provider: ${providerId})`);
    
    // Pobierz opcje modelu (np. reasoning, thinking)
    let modelOptions = {};
    if (config.provider && config.provider[providerId] && config.provider[providerId].models) {
        const modelData = config.provider[providerId].models[selectedModel] || config.provider[providerId].models[modelId];
        if (modelData && modelData.options) {
            modelOptions = modelData.options;
            console.log(`Załadowano opcje dla modelu ${selectedModel}:`, modelOptions);
        }
    }
    
    return { providerId, modelId, fullIdentifier: selectedModel, options: modelOptions };
}

// Kompatybilność wsteczna
export function getLocalEngineOptions() {
    const config = loadConfig();
    const engineConfig = config?.provider?.['local-gguf-engine'];
    if (!engineConfig) {
        return null;
    }
    return engineConfig.options;
}
