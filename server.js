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

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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
        const reels = await Reel.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.status(200).json(reels);
    } catch (error) {
        console.error('Fetch User Reels Error:', error);
        res.status(500).json({ error: 'Failed to fetch user reels' });
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

// Start Server
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless functions
module.exports = app;
