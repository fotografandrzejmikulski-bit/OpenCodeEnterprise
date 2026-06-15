import os from 'os';
import { execSync } from 'child_process';

console.log('--- Rozpoczynam automatyczną detekcję warstw obliczeniowych GGUF ---');

const platform = os.platform();
console.log(`OS Platform: ${platform}`);

let recommendedLayer = 'vulkan'; // fallback

if (platform === 'darwin') {
    recommendedLayer = 'metal';
    console.log('Wykryto platformę Apple. Rekomendowana warstwa: Metal.');
} else if (platform === 'win32' || platform === 'linux') {
    // Sprawdzenie dostępności CUDA za pomocą powłoki
    try {
        const nvcc = execSync('nvcc --version', { stdio: 'pipe' }).toString();
        if (nvcc.includes('release')) {
            recommendedLayer = 'cuda';
            console.log('Wykryto zestaw narzędzi NVIDIA (nvcc). Rekomendowana warstwa: CUDA.');
        }
    } catch (e) {
        console.log('Brak narzędzi CUDA w systemie (nvcc).');
    }
}

console.log(`[SUKCES] Wybrana optymalna warstwa: ${recommendedLayer.toUpperCase()}`);

// Integracja z diagnostyką node-llama-cpp
console.log('\n--- Uruchamianie wbudowanego testu diagnostycznego node-llama-cpp ---');
try {
    const gpuInspect = execSync('npx --no node-llama-cpp inspect gpu', { stdio: 'pipe' }).toString();
    console.log(gpuInspect);
} catch (e) {
    console.log('OSTRZEŻENIE: Moduł node-llama-cpp inspect gpu zwrócił błąd (może trwać jeszcze kompilacja).');
}

export const getHardwareAccelerationLayer = () => recommendedLayer;
