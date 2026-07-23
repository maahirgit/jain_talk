require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');

// Set up email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the reverse proxy (Vercel) so rate limiter gets the real client IP, not the server's IP
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabling CSP for simplicity in this frontend setup
}));
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting to prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many attempts from this IP, please try again after 15 minutes.' }
});

// Serverless-friendly MongoDB Connection
let isConnected = false;
const connectDB = async () => {
    if (isConnected) {
        return;
    }
    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        isConnected = db.connections[0].readyState === 1;
        console.log('Connected to MongoDB successfully!');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
};

// Middleware to ensure DB connection before handling API routes
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        await connectDB();
    }
    next();
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    sangh: { type: String, required: true },
    password: { type: String, required: true },
    username: { type: String, unique: true },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resetOtp: { type: String },
    resetOtpExpires: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Course Registration Schema
const courseRegistrationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    number: { type: String, required: true },
    age: { type: Number, required: true },
    city: { type: String, required: true },
    screenshotPath: { type: String, required: true },
    isPaymentVerified: { type: Boolean, default: false },
    dailyTasks: { type: [Boolean], default: () => Array(60).fill(false) }
}, { timestamps: true });

const CourseRegistration = mongoose.model('CourseRegistration', courseRegistrationSchema);

// Reel / Post Schema
const reelSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Reel = mongoose.model('Reel', reelSchema);
// Setup multer for file uploads with Cloudinary
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'jain_talks_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    },
});
const upload = multer({ storage: storage });

const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'jain_talks_reels',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm']
    },
});
const uploadVideo = multer({ storage: videoStorage });

// API Routes

// 1. Signup Route (Protected by Rate Limiter)
app.post('/api/signup', authLimiter, async (req, res) => {
    try {
        const { name, number, email, city, sangh, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists!' });
        }

        // Generate unique username: JT_{id}_{firstName}
        const userCount = await User.countDocuments();
        const nextId = String(userCount + 1).padStart(2, '0');
        const firstName = name.trim().split(' ')[0];
        const username = `JT_${nextId}_${firstName}`;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name, number, email, city, sangh, password: hashedPassword, username
        });

        await newUser.save();
        res.status(201).json({ message: 'Account created successfully!' });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// 2. Login Route (Protected by Rate Limiter)
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Send token in an HttpOnly cookie
        res.cookie('auth_token', token, {
            httpOnly: true, // Inaccessible to JavaScript
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000 // 1 hour
        });

        res.status(200).json({ message: 'Login successful!' });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Forgot Password Route
app.post('/api/forgot-password', authLimiter, async (req, res) => {
    try {
        const { number } = req.body;
        const user = await User.findOne({ number });
        if (!user) {
            return res.status(404).json({ error: 'User with this phone number not found.' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
        await user.save();
        
        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset OTP - Jain Talk',
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] OTP sent to ${user.email}`);
        } else {
            // Fallback for development if credentials are not set
            console.log(`[MOCK EMAIL] Missing email credentials in .env. OTP for ${user.email} is ${otp}`);
        }
        
        res.status(200).json({ message: 'OTP sent to your registered email address.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Server error during forgot password.' });
    }
});

// Reset Password Route
app.post('/api/reset-password', authLimiter, async (req, res) => {
    try {
        const { number, otp, newPassword } = req.body;
        const user = await User.findOne({ 
            number,
            resetOtp: otp,
            resetOtpExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        await user.save();
        
        res.status(200).json({ message: 'Password reset successful! You can now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
});

// 3. Verify Authentication Route
app.get('/api/me', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Fetch user's registration
        const registration = await CourseRegistration.findOne({ userId: user._id, courseName: "चलो सब आराधना करें" });

        res.status(200).json({ user, registration });
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// 4. Logout Route
app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.status(200).json({ message: 'Logged out successfully' });
});

// 5. Course Registration Route
app.post('/api/register-course', upload.single('screenshot'), async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            if (req.file) await cloudinary.uploader.destroy(req.file.filename);
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { courseName, name, email, number, age, city } = req.body;

        // Prevent duplicate registrations
        const existingRegistration = await CourseRegistration.findOne({ userId: decoded.id, courseName });
        if (existingRegistration) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(400).json({ error: 'You have already registered for this course.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Payment screenshot is required' });
        }

        const screenshotPath = req.file.path;

        const registration = new CourseRegistration({
            userId: decoded.id,
            courseName,
            name,
            email,
            number,
            age,
            city,
            screenshotPath
        });

        await registration.save();
        res.status(201).json({ message: 'Registration submitted successfully!' });

    } catch (error) {
        console.error('Course Registration Error:', error);
        if (req.file) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (cleanupError) {
                console.error('Failed to clean up image on error:', cleanupError);
            }
        }
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Serve the index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin Route: Verify Payment for testing
app.put('/api/admin/verify/:userId', async (req, res) => {
    try {
        const registration = await CourseRegistration.findOneAndUpdate(
            { userId: req.params.userId },
            { isPaymentVerified: true },
            { new: true }
        );
        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        res.status(200).json({ message: 'Payment verified successfully', registration });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Route: Get all registrations
app.get('/api/admin/registrations', async (req, res) => {
    try {
        const registrations = await CourseRegistration.find().populate('userId', 'name email sangh').sort({ createdAt: -1 });
        res.status(200).json({ registrations });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users/:id/reels', async (req, res) => {
    try {
        const reels = await Reel.find({ userId: req.params.id }).populate('userId', 'name username').sort({ createdAt: -1 });
        res.status(200).json(reels);
    } catch (error) {
        console.error('Fetch User Reels Error:', error);
        res.status(500).json({ error: 'Failed to fetch user reels' });
    }
});

app.get('/api/reels', async (req, res) => {
    try {
        // Fetch randomly using $sample aggregation
        const reels = await Reel.aggregate([
            { $sample: { size: 50 } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
            { $unwind: '$userId' }
        ]);
        res.status(200).json(reels);
    } catch (error) {
        console.error('Fetch Reels Error:', error);
        res.status(500).json({ error: 'Failed to fetch reels' });
    }
});

app.get('/api/cloudinary-signature', (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const timestamp = Math.round((new Date).getTime() / 1000);
        const config = cloudinary.config();
        
        if (!config.api_secret) {
            return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
        }
        
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: 'jain_talks_reels'
        }, config.api_secret);
        
        res.json({ timestamp, signature, apiKey: config.api_key, cloudName: config.cloud_name });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate signature' });
    }
});

app.post('/api/reels', express.json(), async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }
        
        const reel = new Reel({
            userId: decoded.id,
            videoUrl: videoUrl,
            likes: []
        });
        
        await reel.save();
        res.status(201).json({ message: 'Reel posted successfully', reel });
    } catch (error) {
        console.error('Post Reel Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/reels/:id/like', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ error: 'Reel not found' });
        
        const index = reel.likes.indexOf(userId);
        if (index === -1) {
            reel.likes.push(userId); // Like
        } else {
            reel.likes.splice(index, 1); // Unlike
        }
        
        await reel.save();
        res.status(200).json({ likes: reel.likes.length, isLiked: index === -1 });
    } catch (error) {
        console.error('Like Reel Error:', error);
        res.status(500).json({ error: 'Failed to like reel' });
    }
});

// Mark Daily Task Endpoint
app.put('/api/aaradhna/mark-day', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { dayIndex } = req.body;

        if (dayIndex === undefined || dayIndex < 0 || dayIndex >= 60) {
            return res.status(400).json({ error: 'Invalid day index' });
        }

        const registration = await CourseRegistration.findOne({ userId: decoded.id, courseName: "चलो सब आराधना करें" });
        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        registration.dailyTasks[dayIndex] = true;
        registration.markModified('dailyTasks');
        await registration.save();

        res.status(200).json({ message: 'Day marked successfully', dailyTasks: registration.dailyTasks });
    } catch (error) {
        console.error('Mark day error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve home.html manually to avoid bypassing static rules if needed
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Serve admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Follow/Profile APIs
app.get('/api/users/:id/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -resetOtp -resetOtpExpires');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        console.error('Fetch User Profile Error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

app.post('/api/users/:id/follow', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = decoded.id;
        const targetUserId = req.params.id;
        
        if (currentUserId === targetUserId) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }
        
        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);
        
        if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found' });
        
        const followingIndex = currentUser.following.indexOf(targetUserId);
        
        if (followingIndex === -1) {
            // Follow
            currentUser.following.push(targetUserId);
            targetUser.followers.push(currentUserId);
        } else {
            // Unfollow
            currentUser.following.splice(followingIndex, 1);
            targetUser.followers.splice(targetUser.followers.indexOf(currentUserId), 1);
        }
        
        await currentUser.save();
        await targetUser.save();
        
        res.status(200).json({ 
            isFollowing: followingIndex === -1, 
            followersCount: targetUser.followers.length 
        });
    } catch (error) {
        console.error('Follow User Error:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

const Astronomy = require('astronomy-engine');
const cron = require('node-cron');

function getExactTithi(date) {
    const time = new Astronomy.AstroTime(date);
    const moonPhase = Astronomy.MoonPhase(time); // Returns 0 to 360 degrees
    
    // Tithi is exactly 12 degrees of moon phase
    let tithiIndex = Math.floor(moonPhase / 12);
    if (tithiIndex < 0) tithiIndex = 0;
    if (tithiIndex > 29) tithiIndex = 29;
    
    const tithiNames = [
        "Ekam", "Beej", "Trij", "Choth", "Pancham", 
        "Chhath", "Saatam", "Aatham", "Nom", "Dasham", 
        "Agyaras", "Baras", "Teras", "Chaudas", "Poonam",
        "Ekam", "Beej", "Trij", "Choth", "Pancham", 
        "Chhath", "Saatam", "Aatham", "Nom", "Dasham", 
        "Agyaras", "Baras", "Teras", "Chaudas", "Amas"
    ];
    
    const isShukla = tithiIndex < 15;
    const paksha = isShukla ? "Sud" : "Vad";
    
    return {
        name: tithiNames[tithiIndex],
        fullName: tithiNames[tithiIndex] + " (" + paksha + ")",
        paksha: paksha,
        index: tithiIndex
    };
}

// Panchang API Endpoint
app.get('/api/panchang', (req, res) => {
    try {
        const dateParam = req.query.date ? new Date(req.query.date) : new Date();
        const tithi = getExactTithi(dateParam);
        res.status(200).json(tithi);
    } catch (error) {
        console.error('Panchang API Error:', error);
        res.status(500).json({ error: 'Failed to calculate exact Tithi' });
    }
});

// Daily Cron Job (Runs every day at 08:00 AM) for Email Reminders
cron.schedule('0 8 * * *', async () => {
    try {
        console.log('Running daily Panchang cron job for reminders...');
        
        // Check tomorrow's Tithi
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowTithi = getExactTithi(tomorrow);
        
        const parvaTithis = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"];
        
        if (parvaTithis.includes(tomorrowTithi.name)) {
            console.log(`Tomorrow is a Parva Tithi: ${tomorrowTithi.fullName}. Sending reminders...`);
            
            // Fetch all users with email
            const users = await User.find({ email: { $exists: true, $ne: "" } });
            
            for (const user of users) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: '🌟 Reminder: Auspicious Day Tomorrow!',
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                            <h2 style="color: #FF9800;">Jai Jinendra, ${user.name}!</h2>
                            <p>This is a gentle reminder that tomorrow is an auspicious Parva Tithi:</p>
                            <h3 style="color: #D84315; font-size: 24px; margin: 10px 0;">${tomorrowTithi.fullName}</h3>
                            <p>It is a great day for Aradhana, fasting, or spiritual activities.</p>
                            <br/>
                            <p>Warm regards,<br/><strong>Jain Talks Team</strong></p>
                        </div>
                    `
                };
                
                try {
                    await transporter.sendMail(mailOptions);
                } catch (mailErr) {
                    console.error(`Failed to send email to ${user.email}:`, mailErr.message);
                }
            }
            console.log('Finished sending Parva Tithi reminders.');
        } else {
            console.log(`Tomorrow is ${tomorrowTithi.fullName}. No reminder needed.`);
        }
    } catch (error) {
        console.error('Cron Job Error:', error);
    }
});

// Start Server
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}


// Export for Vercel serverless functions
module.exports = app;
