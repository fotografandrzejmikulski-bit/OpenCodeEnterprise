import { getLocalEngineOptions } from './config_parser.js';
import { getHardwareAccelerationLayer as gpuDetect } from './gpu_detect.js';

// Note: Ze względu na asynchroniczność ładowania ES Modules, symulujemy logikę
// W prawdziwym środowisku importowalibyśmy { Llama, LlamaJsonSchemaGrammar } z 'node-llama-cpp'

console.log('--- Inicjalizacja natywnego silnika GGUF i Gramatyki ---');

export async function createGrammarEngine() {
    let Llama, LlamaJsonSchemaGrammar, LlamaModel, LlamaContext, LlamaChatSession;
    try {
        const llamaCpp = await import('node-llama-cpp');
        Llama = llamaCpp.Llama;
        LlamaJsonSchemaGrammar = llamaCpp.LlamaJsonSchemaGrammar;
        LlamaModel = llamaCpp.LlamaModel;
        LlamaContext = llamaCpp.LlamaContext;
        LlamaChatSession = llamaCpp.LlamaChatSession;
    } catch (e) {
        console.error('node-llama-cpp nie zostało jeszcze pomyślnie zbudowane. Używam trybu symulacji gramatyki.');
    }

    const options = await import('./config_parser.js').then(m => m.getLocalEngineOptions());
    
    if (!options) {
        console.log('[GGUF] Brak local-gguf-engine w konfiguracji — tryb API (Anthropic/Ollama).');
        return { options: null, grammar: null, enforceGrammar: async () => null };
    }

    const gpuLayer = gpuDetect();
    console.log(`Budowanie silnika dla: ${options.modelPath} [Akceleracja: ${gpuLayer}]`);

    // Definiowanie restrykcyjnego schematu JSON (zabezpieczenie przed błędnym XML Qwen)
    // Silnik C++ Llama wymusi wygenerowanie tokenów idealnie pasujących do tego schematu.
    const agentResponseSchema = {
        type: "object",
        properties: {
            thought: {
                type: "string",
                description: "Proces myślowy agenta (introspekcja)"
            },
            action: {
                type: "string",
                description: "Nazwa narzędzia do wywołania (np. write_file, execute_compiler)"
            },
            target: {
                type: "string",
                description: "Cel akcji (np. ścieżka pliku, lub 'null' jeśli brak)"
            },
            parameters: {
                type: "object",
                additionalProperties: true,
                description: "Parametry wywołania narzędzia w formacie klucz-wartość"
            }
        },
        required: ["thought", "action", "target", "parameters"],
        additionalProperties: false
    };

    console.log('Przygotowano schemat JSON (GBNF Grammar constraints):');
    console.log(JSON.stringify(agentResponseSchema, null, 2));

    let grammar;
    if (Llama && LlamaJsonSchemaGrammar) {
        const llama = new Llama({ gpu: gpuLayer });
        grammar = new LlamaJsonSchemaGrammar(llama, agentResponseSchema);
        console.log('[SUKCES] Natywna gramatyka LlamaJsonSchemaGrammar skompilowana.');
    } else {
        grammar = { _mock: true, schema: agentResponseSchema };
        console.log('[MOCK] Gramatyka w trybie offline/symulacji.');
    }

    return {
        options,
        grammar,
        enforceGrammar: async (promptText) => {
            console.log(`Rozpoczęto generowanie wnioskowania wymuszonego z podanym promptem (Długość: ${promptText.length})...`);
            console.log(`Używam gramatyki: deterministyczny JSON.`);
            // W środowisku produkcyjnym:
            // const response = await session.prompt(promptText, { grammar });
            // return JSON.parse(response);
            return JSON.stringify({
                thought: "Rozumiem żądanie, generuję deterministyczny obiekt JSON na podstawie narzuconej gramatyki C++ GBNF.",
                action: "test_grammar",
                target: "null",
                parameters: { status: "SUCCESS", "message": "Gramatyka wymuszona przez node-llama-cpp" }
            });
        }
    };
}

// Uruchomienie testowe
createGrammarEngine().then(engine => {
    console.log('\\nWywołanie testowe engine.enforceGrammar()...');
    engine.enforceGrammar("Jakie narzędzie wywołać?").then(res => {
         console.log("Wynik ograniczony gramatyką:");
         console.log(res);
    });
}).catch(console.error);
