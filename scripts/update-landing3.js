import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('c:/tmp/stitch_landing_body.html', 'utf8');
const jsPath = 'c:/Users/SUYASH NARAWADE/Projects/Ares/src/dashboard/public/js/pages/landing.js';
let js = fs.readFileSync(jsPath, 'utf8');

const startStr = 'document.getElementById(\'page-content\').innerHTML = `';
const start = js.indexOf('document.getElementById(\'page-content\').innerHTML =');

if (start === -1) {
  console.log('Start not found');
  process.exit(1);
}

// Escape backticks and dollars in the HTML content
const escapedContent = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');

const newJs = js.substring(0, start) + 'document.getElementById(\'page-content\').innerHTML = `\\n' + escapedContent + '\\n`;\\n}\\n';

fs.writeFileSync(jsPath, newJs);
console.log('done updating landing');
