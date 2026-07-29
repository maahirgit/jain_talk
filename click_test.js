const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('public/home.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (error) => {});
virtualConsole.on("jsdomError", (error) => {});
virtualConsole.on("log", (message) => { console.log("Log:", message); });

const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole, url: "http://localhost/home.html" });

// Wait for a brief moment for any synchronous scripts to finish
setTimeout(() => {
    const window = dom.window;
    const document = window.document;
    
    console.log("previewAaradhnaForm defined?", typeof window.previewAaradhnaForm);
    
    const modal = document.getElementById('aradhana-form-modal');
    console.log("Modal active before click?", modal.classList.contains('active'));
    
    // Override alert to see if the try-catch caught anything!
    window.alert = function(msg) { console.log("ALERT:", msg); };
    
    if (typeof window.previewAaradhnaForm === 'function') {
        window.previewAaradhnaForm();
    }
    
    setTimeout(() => {
        console.log("Modal active after click?", modal.classList.contains('active'));
        console.log("Modal classes:", modal.className);
    }, 100);
}, 500);
