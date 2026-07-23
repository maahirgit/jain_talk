require('dotenv').config();
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const reelSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});
const Reel = mongoose.model('Reel', reelSchema);

async function deleteAllReels() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Initialize Cloudinary
        console.log('Cloudinary config:', cloudinary.config().cloud_name ? 'Loaded' : 'Not loaded');

        const reels = await Reel.find();
        console.log(`Found ${reels.length} reels in database.`);

        for (const reel of reels) {
            console.log(`Processing reel: ${reel._id}`);
            if (reel.videoUrl && reel.videoUrl.includes('cloudinary.com')) {
                try {
                    // Extract public_id from Cloudinary URL
                    // Example URL: https://res.cloudinary.com/demo/video/upload/v1612345678/jain_talks_reels/abcde12345.mov
                    const parts = reel.videoUrl.split('/upload/');
                    if (parts.length > 1) {
                        const afterUpload = parts[1]; // v1612345678/jain_talks_reels/abcde12345.mov
                        const withoutVersion = afterUpload.substring(afterUpload.indexOf('/') + 1); // jain_talks_reels/abcde12345.mov
                        
                        // Handle the case where there is no version (e.g. jain_talks_reels/abcde12345.mov directly after upload/)
                        // Cloudinary URLs usually have a 'v' followed by digits.
                        let publicIdWithExtension = withoutVersion;
                        if (!afterUpload.startsWith('v') || isNaN(parseInt(afterUpload.charAt(1)))) {
                            // There was no version string
                            publicIdWithExtension = afterUpload;
                        }

                        // Remove extension
                        const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
                        const publicId = lastDotIndex !== -1 ? publicIdWithExtension.substring(0, lastDotIndex) : publicIdWithExtension;
                        
                        console.log(`Extracted public_id: ${publicId}`);

                        // Delete from Cloudinary
                        const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
                        console.log(`Cloudinary deletion result:`, result);
                    }
                } catch (cloudErr) {
                    console.error(`Error deleting from Cloudinary: ${cloudErr.message}`);
                }
            } else {
                console.log(`Not a Cloudinary URL or missing URL: ${reel.videoUrl}`);
            }
        }

        console.log('Deleting all reels from MongoDB...');
        const deleteResult = await Reel.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} reels from database.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

deleteAllReels();
