require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const User = mongoose.connection.collection('users');
        
        try {
            await User.dropIndex('email_1');
            console.log('Successfully dropped the unique index on email');
        } catch (err) {
            console.log('Index might not exist or already dropped:', err.message);
        }
        
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    } finally {
        mongoose.disconnect();
    }
}

dropIndex();
