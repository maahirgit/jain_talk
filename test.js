require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const Reel = mongoose.model('Reel', new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId }
        }, { strict: false }));
        
        const rawReels = await Reel.find();
        console.log('Total Raw Reels:', rawReels.length);

        const reels = await Reel.aggregate([
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } }
        ]);
        console.log('Aggregated Reels count:', reels.length);
        if(reels.length > 0) {
            console.log('First reel userId is object?', typeof reels[0].userId === 'object' && reels[0].userId !== null);
            if (reels[0].userId) {
                console.log('Has _id?', reels[0].userId._id ? true : false);
            } else {
                console.log('UserId is null or undefined!');
            }
        }
    } catch (e) {
        console.error(e);
    }
    mongoose.disconnect();
});
