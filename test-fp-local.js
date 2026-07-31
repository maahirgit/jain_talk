const mongoose = require('mongoose');
const express = require('express');
const app = express();
app.use(express.json());

const userSchema = new mongoose.Schema({
    email: String,
    resetOtp: String,
    resetOtpExpires: Date
}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await User.find({ email: new RegExp('^' + email + '$', 'i') });
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User with this email not found.' });
        }
        
        const otp = '123456';
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        for (const user of users) {
            await User.updateOne(
                { _id: user._id },
                { $set: { resetOtp: otp, resetOtpExpires: otpExpires } }
            );
        }
        res.status(200).json({ message: 'OTP sent' });
    } catch (e) {
        console.error('ERROR:', e);
        res.status(500).json({ error: e.toString() });
    }
});

async function run() {
    await mongoose.connect('mongodb://localhost:27017/jaintalk').catch(() => console.log('Mongo not found'));
    
    // Create a mock user for testing if one doesn't exist
    await User.updateOne(
        { email: 'test@example.com' },
        { $setOnInsert: { email: 'test@example.com' } },
        { upsert: true }
    );
    
    const server = app.listen(0, async () => {
        const port = server.address().port;
        const res = await fetch(`http://127.0.0.1:${port}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' })
        });
        
        const text = await res.text();
        console.log('Response Status:', res.status);
        console.log('Response Body:', text);
        
        process.exit(0);
    });
}

run();
