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

const app = express();
const PORT = process.env.PORT || 5000;

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
    username: { type: String, unique: true }
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
