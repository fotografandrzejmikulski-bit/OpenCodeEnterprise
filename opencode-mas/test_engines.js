import { getActiveModel } from './config_parser.js';
import { ThemeEngine } from './theme_engine.js';

console.log("\n=== TEST SILNIKA MODELI ===");
const modelInfo = getActiveModel();
console.log(JSON.stringify(modelInfo, null, 2));

console.log("\n=== TEST SILNIKA MOTYWÓW ===");
const themeEngine = new ThemeEngine();
const activeTheme = themeEngine.applyThemeFromTuiJson();
console.log("Aktywny motyw w OpenCode:", activeTheme);
