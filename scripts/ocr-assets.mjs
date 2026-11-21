// Kopiuje czytnik tekstu (Tesseract) i polski słownik do public/ocr – bez zewnętrznych CDN.
import { mkdirSync, copyFileSync } from 'node:fs';
const out = 'public/ocr';
mkdirSync(out, { recursive: true });
const core = 'node_modules/tesseract.js-core/';
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-lstm.js', 'tesseract-core-simd-lstm.js', 'tesseract-core-relaxedsimd-lstm.js',
  'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-relaxedsimd-lstm.wasm']) copyFileSync(core + f, out + '/' + f);
copyFileSync('node_modules/tesseract.js/dist/worker.min.js', out + '/worker.min.js');
copyFileSync('node_modules/@tesseract.js-data/pol/4.0.0_best_int/pol.traineddata.gz', out + '/pol.traineddata.gz');
console.log('OCR: pliki skopiowane do public/ocr');
