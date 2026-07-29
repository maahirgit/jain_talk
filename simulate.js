const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('public/home.html', 'utf8');
const virtualConsole = new jsdom.VirtualConsole();

virtualConsole.on("error", (error) => {
  console.error("DOM Error:", error);
});
virtualConsole.on("jsdomError", (error) => {
  console.error("JSDOM Error:", error);
});
virtualConsole.on("log", (message) => {
  console.log("Log:", message);
});

const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
