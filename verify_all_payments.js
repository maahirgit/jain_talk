require('dotenv').config();
const mongoose = require('mongoose');

const courseRegistrationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseName: { type: String },
    name: { type: String },
    email: { type: String },
    number: { type: String },
    age: { type: Number },
    city: { type: String },
    screenshotPath: { type: String },
    isPaymentVerified: { type: Boolean, default: false },
    dailyTasks: { type: [Boolean] }
}, { timestamps: true });

const CourseRegistration = mongoose.model('CourseRegistration', courseRegistrationSchema);

async function verifyAllPayments() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.\n');

        // Count before
        const totalBefore = await CourseRegistration.countDocuments({});
        const alreadyVerified = await CourseRegistration.countDocuments({ isPaymentVerified: true });
        const notVerified = await CourseRegistration.countDocuments({ isPaymentVerified: false });

        console.log(`📊 Total course registrations : ${totalBefore}`);
        console.log(`✅ Already verified            : ${alreadyVerified}`);
        console.log(`⏳ Not yet verified             : ${notVerified}\n`);

        if (notVerified === 0) {
            console.log('✅ All users already have isPaymentVerified = true. Nothing to update.');
            return;
        }

        // Set isPaymentVerified = true for ALL registrations
        const result = await CourseRegistration.updateMany(
            { isPaymentVerified: false },
            { $set: { isPaymentVerified: true } }
        );

        console.log(`✅ Updated ${result.modifiedCount} registrations → isPaymentVerified = true`);
        console.log('\n🎉 All course-registered users now have Aradhana access!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

verifyAllPayments();
