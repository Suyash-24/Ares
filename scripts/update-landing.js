const fs = require('fs');
const content = fs.readFileSync('c:/tmp/stitch_landing_body.html', 'utf8');
let js = fs.readFileSync('c:/Users/SUYASH NARAWADE/Projects/Ares/src/dashboard/public/js/pages/landing.js', 'utf8');
const start = js.indexOf('document.getElementById(\'page-content\').innerHTML =');
js = js.substring(0, start) + 'document.getElementById(\\'page-content\\').innerHTML = \\\\n' + content.replace(/\\/g, '\\\\\\').replace(/\\$/g, '\\\\$') + '\\;\\n}\\n';
fs.writeFileSync('c:/Users/SUYASH NARAWADE/Projects/Ares/src/dashboard/public/js/pages/landing.js', js);
console.log('done');
