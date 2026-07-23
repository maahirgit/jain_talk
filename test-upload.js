const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const fetch = (await import('node-fetch')).default;
        const FormData = require('form-data');
        
        // Create a dummy video file
        const dummyVideoPath = path.join(__dirname, 'dummy.mp4');
        fs.writeFileSync(dummyVideoPath, 'dummy video content');
        
        const form = new FormData();
        form.append('video', fs.createReadStream(dummyVideoPath));
        
        // Get auth token? We don't have one, but we should see the exact error response
        const res = await fetch('http://localhost:5000/api/reels', {
            method: 'POST',
            body: form
        });
        
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
        
        fs.unlinkSync(dummyVideoPath);
    } catch (e) {
        console.error(e);
    }
}
testUpload();
