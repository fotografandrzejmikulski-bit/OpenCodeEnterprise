import { execSync } from 'child_process';
import process from 'process';

console.log('Rozpoczynam kompilację natywną node-llama-cpp z limitami...');

// Ustawienie flag CMake dla kompilatora zgodnie z wytycznymi Zadania 1.1
process.env.CMAKE_ARGS = '-DBUILD_SHARED_LIBS=OFF';
// Ograniczenie liczby wątków za pomocą zmiennej środowiskowej
process.env.CMAKE_BUILD_PARALLEL_LEVEL = '4';

try {
    execSync('npx --no node-llama-cpp source download', { stdio: 'inherit' });
    execSync('npx --no node-llama-cpp source build', { stdio: 'inherit' });
    console.log('Kompilacja natywna zakończona sukcesem.');
} catch (error) {
    console.error('Błąd podczas kompilacji:', error);
    process.exit(1);
}
