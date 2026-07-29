const fs = require('fs');
const content = fs.readFileSync('public/home.html', 'utf8');
const scripts = [];
const regex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = regex.exec(content)) !== null) {
    scripts.push(match[1]);
}
fs.writeFileSync('script_test.js', scripts.join('\n'));
