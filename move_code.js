const fs = require('fs');

const file = 'public/home.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Find start and end
const startLineIdx = lines.findIndex(l => l.includes('const ARADHANA_QUESTIONS = ['));
let endLineIdx = startLineIdx;
for (let i = startLineIdx; i < lines.length; i++) {
    if (lines[i].includes('window.previewAaradhnaForm = function() {')) {
        for (let j = i; j < lines.length; j++) {
            if (lines[j].includes('} catch (err) {')) {
                for (let k = j; k < lines.length; k++) {
                    if (lines[k].includes('}')) { // end of previewAaradhnaForm
                        endLineIdx = k;
                        break;
                    }
                }
                break;
            }
        }
        break;
    }
}

console.log('Moving lines', startLineIdx, 'to', endLineIdx);

const extract = lines.splice(startLineIdx, endLineIdx - startLineIdx + 1);

const scriptTagIdx = lines.findIndex(l => l.includes('<script>'));

lines.splice(scriptTagIdx + 1, 0, ...extract);

fs.writeFileSync(file, lines.join('\n'));
console.log('Moved successfully!');
