require('dotenv').config();
const mongoose = require('mongoose');

async function getObjectId() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const User = mongoose.connection.collection('users');
        
        const user = await User.findOne({ email: 'maahirmshah4252@gmail.com' });
        if (user) {
            console.log('Object ID:', user._id);
        } else {
            console.log('User not found.');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

getObjectId();
