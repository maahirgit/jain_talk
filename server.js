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

// Set up email transporters (primary + secondary fallback)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const transporter2 = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER_2,
        pass: process.env.EMAIL_PASS_2
    }
});

// Helper: try primary transporter first; on quota/rate-limit error fall back to secondary
async function sendMailWithFallback(mailOptions) {
    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        // Gmail daily limit errors contain codes like 550 / 421 / EENVELOPE or 'Daily user sending limit exceeded'
        const isQuotaError = /limit exceeded|550|421|quota|too many/i.test(err.message || '');
        if (isQuotaError && process.env.EMAIL_USER_2 && process.env.EMAIL_PASS_2) {
            console.warn('[EMAIL] Primary account limit reached. Switching to secondary account...');
            const fallbackOptions = { ...mailOptions, from: process.env.EMAIL_USER_2 };
            await transporter2.sendMail(fallbackOptions);
        } else {
            throw err;
        }
    }
}

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
    email: { type: String, required: true },
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

// Daily Aradhana Submission Schema
const aradhanaSubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateString: { type: String, required: true }, // Format: "YYYY-MM-DD"
    points: { type: Number, required: true },
    answers: { type: [Number], required: true } // Stores the index of the selected option for each of the 20 questions
}, { timestamps: true });

const AradhanaSubmission = mongoose.model('AradhanaSubmission', aradhanaSubmissionSchema);

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
const { v2: cloudinary2 } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Account 1 (Primary - existing data, read-only now as storage is full)
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// Account 2 (Secondary - all new uploads go here)
cloudinary2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME_2,
    api_key: process.env.CLOUDINARY_API_KEY_2,
    api_secret: process.env.CLOUDINARY_API_SECRET_2
});

// Images → Account 2
const storage = new CloudinaryStorage({
    cloudinary: cloudinary2,
    params: {
        folder: 'jain_talks_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    },
});
const upload = multer({ storage: storage });

// Videos → Account 2
const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary2,
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

        const existingUsers = await User.find({ email });
        for (const u of existingUsers) {
            const isMatch = await bcrypt.compare(password, u.password);
            if (isMatch) {
                return res.status(400).json({ error: 'An account with this email and password already exists! Please use a different password to create a new account.' });
            }
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
        
        // Send Welcome Email (Non-blocking)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🎉 Jain Talk માં આપનું હાર્દિક સ્વાગત છે! (Welcome to Jain Talk)',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <p>પ્રણામ પુણ્યશાળી <strong>${name}</strong>,</p>
                    
                    <p>આપ સૌની ધર્મ આરાધનાને ડિજિટલ માધ્યમથી વધુ સરળ અને સુંદર બનાવવા માટે, આ <strong>'Jain Talk'</strong> વેબસાઇટનું સંપૂર્ણ નિર્માણ અને ડેવલપમેન્ટ (Web Development) <strong>Design Ville by Maahir Shah</strong> દ્વારા કરવામાં આવ્યું છે (<a href="https://design-ville.com/" style="color: #FF9800; text-decoration: none;">https://design-ville.com/</a>).</p>
                    
                    <p><strong>Jain Talk</strong> પરિવારમાં આપનું હાર્દિક સ્વાગત છે! અમને ખૂબ આનંદ છે કે આપ અમારી સાથે જોડાયા છો.</p>
                    
                    <p>અમારી આ વેબસાઇટ પર આપને ધર્મ આરાધના માટેની અનેક અદભુત સુવિધાઓ મળશે:</p>
                    
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">✨ <strong>સચોટ જૈન પંચાંગ:</strong> દરરોજની તિથિ અને પર્વ તિથિની જાણકારી.</li>
                        <li style="margin-bottom: 8px;">🌅 <strong>નવકારશી અને ચૌવિહાર:</strong> આપના સમય મુજબના દૈનિક રિમાઇન્ડર.</li>
                        <li style="margin-bottom: 8px;">🎥 <strong>જૈન રીલ્સ (Jain Reels):</strong> ધાર્મિક રીલ્સ જોવા અને પોસ્ટ કરવા માટે.</li>
                        <li style="margin-bottom: 8px;">📊 <strong>દૈનિક આરાધના:</strong> આપની દૈનિક ધર્મ આરાધના નોંધવા અને ટ્રેક કરવા માટેનું પ્લેટફોર્મ.</li>
                    </ul>
                    
                    <p>અમે આશા રાખીએ છીએ કે આ પ્લેટફોર્મ આપની ધર્મ આરાધના અને આધ્યાત્મિક યાત્રામાં ખૂબ જ ઉપયોગી સાબિત થશે.</p>
                    
                    <p>જય જિનેન્દ્ર!</p>
                    
                    <p>લી.,<br>
                    <strong>Team Jain Talk</strong></p>
                </div>
            `
        };

        // Fire and forget email so it doesn't slow down the signup response
        sendMailWithFallback(mailOptions).catch(err => {
            console.error('Failed to send welcome email:', err.message);
        });

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

        const users = await User.find({ email });
        if (!users || users.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        let matchedUser = null;
        for (const u of users) {
            const isMatch = await bcrypt.compare(password, u.password);
            if (isMatch) {
                matchedUser = u;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const user = matchedUser;

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
        const { email } = req.body;
        const users = await User.find({ email: new RegExp('^' + email + '$', 'i') });
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User with this email not found.' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

        // Save OTP to all associated accounts
        for (const user of users) {
            user.resetOtp = otp;
            user.resetOtpExpires = otpExpires;
            await user.save();
        }
        
        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP - Jain Talk',
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await sendMailWithFallback(mailOptions);
            console.log(`[EMAIL] OTP sent to ${email}`);
        } else {
            console.log(`[MOCK EMAIL] Missing email credentials in .env. OTP for ${email} is ${otp}`);
        }
        
        res.status(200).json({ message: 'OTP sent to your email address.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Server error during forgot password.' });
    }
});

// Verify OTP Route (NEW)
app.post('/api/verify-otp', authLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;
        const users = await User.find({ 
            email: new RegExp('^' + email + '$', 'i'),
            resetOtp: otp,
            resetOtpExpires: { $gt: Date.now() }
        });
        
        if (!users || users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }
        
        // Return list of accounts
        const accounts = users.map(u => ({ id: u._id.toString(), username: u.username, name: u.name, email: u.email }));
        res.status(200).json({ accounts });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ error: 'Server error during OTP verification.' });
    }
});

// Reset Password Route
app.post('/api/reset-password', authLimiter, async (req, res) => {
    try {
        const { email, otp, accountId, newPassword } = req.body;
        const user = await User.findOne({ 
            _id: accountId,
            email: new RegExp('^' + email + '$', 'i'),
            resetOtp: otp,
            resetOtpExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid OTP or account not found.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        await user.save();
        
        res.status(200).json({ message: 'Password reset successful.' });
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
        // ── Registration is now CLOSED ──
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        return res.status(403).json({ error: 'Registration is now closed. Please contact the organiser.' });

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

// Admin Route: Verify ALL pending registrations at once
app.put('/api/admin/verify-all', async (req, res) => {
    try {
        const result = await CourseRegistration.updateMany(
            { isPaymentVerified: false },
            { isPaymentVerified: true }
        );
        res.status(200).json({ message: `${result.modifiedCount} registration(s) verified successfully` });
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
        const config = cloudinary2.config();
        
        if (!config.api_secret) {
            return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
        }
        
        const signature = cloudinary2.utils.api_sign_request({
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



const ARADHANA_SCORING = [
    [50, 250, 400, 500, 700, 0], // Q1
    [50, 0], // Q2
    [50, 50, 100, 0], // Q3
    [200, 100, 0], // Q4
    [100, 100, 200, 0], // Q5
    [50, 50, 100, 0], // Q6
    [50, 50, 100, 0], // Q7
    [50, 0], // Q8
    [100, 0], // Q9
    [50, 100, 150, 0], // Q10
    [100, 0], // Q11
    [0, 150, 300, 450], // Q12
    [0, 100, 200, 300], // Q13
    [100, 200, 0], // Q14
    [50, 50, 100, 0], // Q15
    [100, 150, 0], // Q16
    [200, 200, 400, 0], // Q17
    [1500, 500, 2000, 0], // Q18
    [300, 200, 100, 0], // Q19
    [100, 100, 200, 0] // Q20
];

function getLocalDateString(date) {
    const tzOffset = 330 * 60000; // IST is UTC+5:30
    return new Date(date.getTime() + tzOffset).toISOString().split('T')[0];
}

app.get('/api/aradhana/status', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        
        const submissions = await AradhanaSubmission.find({ userId: decoded.id }).sort({ dateString: 1 });
        
        let totalPoints = 0;
        let todaysPoints = 0;
        let yesterdaysPoints = 0;
        
        const todayStr = getLocalDateString(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterdayDate);
        
        const submissionMap = {};
        
        submissions.forEach(sub => {
            totalPoints += sub.points;
            submissionMap[sub.dateString] = sub.points;
            if (sub.dateString === todayStr) todaysPoints = sub.points;
            if (sub.dateString === yesterdayStr) yesterdaysPoints = sub.points;
        });
        
        // Generate calendar
        const calendar = [];
        let startDate = new Date('2026-07-28T00:00:00Z');
        const endDate = new Date('2026-09-15T00:00:00Z');
        
        // If testing before July 28, start the calendar from today so it's visible
        if (todayStr < '2026-07-28') {
            startDate = new Date(todayStr + 'T00:00:00Z');
        }
        
        let currentDate = new Date(startDate);
        const now = new Date();
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            let status = 'UPCOMING';
            if (submissionMap[dateStr] !== undefined) {
                status = 'FILLED';
            } else if (dateStr < todayStr) {
                status = 'MISSED';
            } else if (dateStr === todayStr) {
                status = 'UPCOMING';
            }
            
            calendar.push({
                date: dateStr,
                status: status,
                points: submissionMap[dateStr] || 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        res.status(200).json({
            totalPoints,
            todaysPoints,
            yesterdaysPoints,
            calendar,
            todayStr,
            hasSubmittedToday: submissionMap[todayStr] !== undefined
        });
    } catch (error) {
        console.error('Fetch Aradhana Status Error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

app.post('/api/aradhana/submit', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) return res.status(401).json({ error: 'User not found' });
        
        const { answers, forYesterday } = req.body;
        if (!answers || answers.length !== 20) {
            return res.status(400).json({ error: 'Invalid answers submitted' });
        }
        
        const todayStr = getLocalDateString(new Date());
        
        // Date validation: Only open between July 28 - Sept 25, 2026
        if (todayStr < '2026-07-28' || todayStr > '2026-09-25') {
            return res.status(400).json({ error: 'Aradhana can only be submitted between July 28 and Sept 25' });
        }

        // Determine target date: allow filling yesterday's form if missed (1 day back only)
        let targetDateStr = todayStr;
        if (forYesterday) {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            targetDateStr = getLocalDateString(yesterdayDate);
        }

        console.log('[SUBMIT] User:', user.email, '| Date:', targetDateStr, '| ForYesterday:', !!forYesterday, '| Answers length:', answers.length);
        
        // Check if already submitted for the target date
        const existing = await AradhanaSubmission.findOne({ userId: decoded.id, dateString: targetDateStr });
        if (existing) {
            return res.status(400).json({ error: forYesterday ? 'You have already submitted yesterday\'s Aradhana' : 'You have already submitted today\'s Aradhana' });
        }
        
        // Calculate exact points
        let totalPoints = 0;
        for (let i = 0; i < 20; i++) {
            const optionIndex = answers[i];
            const maxOptions = ARADHANA_SCORING[i].length;
            if (optionIndex < 0 || optionIndex >= maxOptions) {
                return res.status(400).json({ error: `Invalid option for question ${i + 1}` });
            }
            totalPoints += ARADHANA_SCORING[i][optionIndex];
        }
        
        const submission = new AradhanaSubmission({
            userId: decoded.id,
            dateString: targetDateStr,
            points: totalPoints,
            answers: answers
        });
        
        await submission.save();
        
        res.status(200).json({ message: 'Submission successful', points: totalPoints });
    } catch (error) {
        console.error('Submit Aradhana Error:', error);
        res.status(500).json({ error: 'Failed to submit' });
    }
});

const Astronomy = require('astronomy-engine');
const cron = require('node-cron');

function getExactTithi(date) {
    // Traditional Hindu Panchang assigns the day's Tithi based on Sunrise (approx 6:00 AM IST)
    // IST = UTC+5:30, so 6:00 AM IST = 00:30 UTC. We build the date in UTC to represent that moment.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    // 6:00 AM IST expressed as UTC milliseconds
    const sunriseIST_UTC = Date.UTC(year, month, day, 6, 0, 0) - IST_OFFSET_MS;
    const sunriseDate = new Date(sunriseIST_UTC);
    const time = new Astronomy.AstroTime(sunriseDate);
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

// Leaderboard API Endpoint
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await AradhanaSubmission.aggregate([
            {
                $group: {
                    _id: "$userId",
                    totalPoints: { $sum: "$points" }
                }
            },
            {
                $sort: { totalPoints: -1 }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            {
                $unwind: "$userInfo"
            },
            {
                $match: {
                    "userInfo.email": {
                        $not: /maahir/i
                    }
                }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    _id: 1,
                    totalPoints: 1,
                    name: "$userInfo.name",
                    username: "$userInfo.username"
                }
            }
        ]);
        res.status(200).json(leaderboard);
    } catch (error) {
        console.error('Leaderboard API Error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// VERCEL CRON ENDPOINT: Tithi Reminder (called daily at 12:30 UTC = 6:00 PM IST)
// Secured by CRON_SECRET header set in vercel.json
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/cron/tithi-reminder', async (req, res) => {
    // Verify the request is from Vercel Cron (or an authorised caller)
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('[CRON] Running Tithi reminder job...');
        await connectDB();

        // ── Determine tomorrow's date in IST ──────────────────────────────────
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(Date.now() + IST_OFFSET_MS);
        const tomorrowIST = new Date(nowIST);
        tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);

        // Use a plain Date object whose year/month/date reflect IST tomorrow
        const tomorrowForTithi = new Date(
            tomorrowIST.getUTCFullYear(),
            tomorrowIST.getUTCMonth(),
            tomorrowIST.getUTCDate()
        );

        const tomorrowTithi = getExactTithi(tomorrowForTithi);

        // Only send for these major Parva Tithis
        const parvaTithis = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"];

        if (!parvaTithis.includes(tomorrowTithi.name)) {
            console.log(`[CRON] Tomorrow is ${tomorrowTithi.fullName} — no reminder needed.`);
            return res.status(200).json({ message: `No reminder needed. Tomorrow is ${tomorrowTithi.fullName}` });
        }

        console.log(`[CRON] Tomorrow is a Parva Tithi: ${tomorrowTithi.fullName}. Sending reminders...`);

        // Format tomorrow's date as DD/MM/YYYY
        const dd = String(tomorrowIST.getUTCDate()).padStart(2, '0');
        const mm = String(tomorrowIST.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = tomorrowIST.getUTCFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;
        const tithiDisplayName = tomorrowTithi.fullName;

        // Fetch all course-registered users with an email
        const users = await CourseRegistration.find({ email: { $exists: true, $ne: "" } });
        const uniqueEmails = [...new Set(users.map(u => u.email.trim().toLowerCase()))];

        let sent = 0, failed = 0;
        for (let i = 0; i < uniqueEmails.length; i++) {
            const email = uniqueEmails[i];
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `🌙 આવતીકાલે પર્વ તિથિ છે: ${tithiDisplayName} રિમાઇન્ડર - Jain Talk`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>પ્રણામ પુણ્યશાળી,</p>
                    
                        <p>આપને પ્રેમપૂર્વક યાદ અપાવવા માટે કે આવતીકાલે, <strong>${dateStr}</strong> ના રોજ, <strong>${tithiDisplayName}</strong> ની પર્વ તિથિ છે.</p>
                    
                        <p>જૈન ધર્મમાં પર્વ તિથિનું અનેરું આધ્યાત્મિક મહત્વ રહેલું છે. આ પવિત્ર દિવસે નીચે મુજબના નિયમોનું પાલન કરવાનો આગ્રહ રાખવો:</p>
                        
                        <div style="margin: 20px 0; padding: 15px; background-color: #fff4e6; border-left: 5px solid #FF9800; border-radius: 4px;">
                            <ul style="margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 10px;">🥬 <strong>લીલોતરી નો ત્યાગ:</strong> પર્વ તિથિના દિવસે લીલા શાકભાજી અને કંદમૂળનો સંપૂર્ણ ત્યાગ કરવો.</li>
                                <li style="margin-bottom: 10px;">🧘 <strong>તપશ્ચર્યા:</strong> આપની શક્તિ અનુસાર ઉપવાસ, એકાસણા કે બીયાસણા કરી આરાધના કરવી.</li>
                                <li>📿 <strong>ધર્મ ધ્યાન:</strong> વધુમાં વધુ સમય પ્રભુ સ્મરણ, સામાયિક અને ધર્મ ધ્યાનમાં પસાર કરવો.</li>
                            </ul>
                        </div>
                    
                        <p>આપણી <strong>'સૌ ચાલો આરાધના કરીએ'</strong> ની વેબસાઇટ પર આવતીકાલની વિશેષ આરાધના સબમિટ કરવાનું ચૂકશો નહીં!</p>
                    
                        <p>આપની ધર્મ આરાધના નિર્વિઘ્ને પૂર્ણ થાય તેવી શુભકામનાઓ.</p>
                    
                        <p>જય જિનેન્દ્ર!</p>
                    
                        <p>લી.,<br>
                        <strong>Team Jain Talk</strong><br>
                        <span style="font-size: 12px; color: #777;">Powered by Design Ville by Maahir Shah</span></p>
                    </div>
                `
            };
            
            try {
                await sendMailWithFallback(mailOptions);
                console.log(`[${i + 1}/${uniqueEmails.length}] Tithi reminder sent to ${email}`);
                sent++;
            } catch (mailErr) {
                console.error(`Failed to send email to ${email}:`, mailErr.message);
                failed++;
            }
            
            // Wait 1.5 seconds between emails to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log(`[CRON] Tithi reminders done. Sent: ${sent}, Failed: ${failed}`);
        return res.status(200).json({ message: `Tithi reminders sent`, tithi: tithiDisplayName, sent, failed });

    } catch (error) {
        console.error('[CRON] Tithi Reminder Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// VERCEL CRON ENDPOINT: Aradhana Missing Submission Reminder (called daily at 15:30 UTC = 9:00 PM IST)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/cron/aradhana-reminder', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('[CRON] Running Aradhana missing submission check...');
        await connectDB();

        // Get today's date in IST as YYYY-MM-DD
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(Date.now() + IST_OFFSET_MS);
        const yyyy = nowIST.getUTCFullYear();
        const mm = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(nowIST.getUTCDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Find all submissions for today
        const todaysSubmissions = await AradhanaSubmission.find({ dateString: todayStr });
        const submittedUserIds = todaysSubmissions.map(sub => sub.userId.toString());

        // Find all course registrations and filter who hasn't submitted
        const courseRegistrations = await CourseRegistration.find({});
        const missingUsers = courseRegistrations.filter(reg => !submittedUserIds.includes(reg.userId.toString()));

        if (missingUsers.length === 0) {
            console.log('[CRON] All users submitted their Aradhana today!');
            return res.status(200).json({ message: 'All users submitted today. No reminders needed.' });
        }

        const uniqueEmails = [...new Set(missingUsers.map(u => u.email.trim().toLowerCase()))].filter(e => e !== "");
        console.log(`[CRON] ${uniqueEmails.length} users missing. Sending reminders...`);

        let sent = 0, failed = 0;
        for (let i = 0; i < uniqueEmails.length; i++) {
            const email = uniqueEmails[i];
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: '⏳ આજની આરાધના બાકી છે! (Today\'s Aradhana Pending)',
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>પ્રણામ પુણ્યશાળી,</p>
                        
                        <p>અમારી સિસ્ટમ મુજબ, આપની આજની ધર્મ આરાધના હજુ સુધી નોંધાઈ નથી.</p>
                        
                        <p>આપની આરાધનામાં સાતત્ય જળવાઈ રહે તે માટે, કૃપા કરીને આજે રાત્રે સૂતા પહેલાં <strong>'સૌ ચાલો આરાધના કરીએ' (Jain Talk)</strong> વેબસાઇટ પર જઈને આપની આજની આરાધના ચોક્કસથી સબમિટ કરી દેજો.</p>
                        
                        <p>જય જિનેન્દ્ર!</p>
                        
                        <p>લી.,<br>
                        <strong>Team Jain Talk</strong></p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="font-size: 12px; color: #777;">
                            Website Designed and Developed by <a href="https://design-ville.com/" style="color: #FF9800; text-decoration: none;"><strong>Design Ville by Maahir Shah</strong></a>
                        </p>
                    </div>
                `
            };

            try {
                await sendMailWithFallback(mailOptions);
                console.log(`[${i + 1}/${uniqueEmails.length}] Aradhana reminder sent to ${email}`);
                sent++;
            } catch (mailErr) {
                console.error(`Failed to send Aradhana reminder to ${email}:`, mailErr.message);
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log(`[CRON] Aradhana reminders done. Sent: ${sent}, Failed: ${failed}`);
        return res.status(200).json({ message: 'Aradhana reminders sent', sent, failed });

    } catch (error) {
        console.error('[CRON] Aradhana Reminder Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: node-cron does NOT work on Vercel serverless.
// Both cron jobs above are now driven by Vercel Cron in vercel.json.
// ─────────────────────────────────────────────────────────────────────────────

// Daily Cron Job (Runs every day at 21:00 / 9:00 PM) for Missing Aradhana Submissions
cron.schedule('0 21 * * *', async () => {
    try {
        console.log('Running daily Panchang cron job for reminders...');
        
        // Check tomorrow's Tithi
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowTithi = getExactTithi(tomorrow);
        
        const parvaTithis = ["Pancham", "Aatham", "Chaudas", "Amas", "Poonam"];
        
        if (parvaTithis.includes(tomorrowTithi.name)) {
            console.log(`Tomorrow is a Parva Tithi: ${tomorrowTithi.fullName}. Sending reminders...`);
            
            // Format tomorrow's date
            const dateStr = tomorrow.toLocaleDateString('en-GB'); // DD/MM/YYYY
            const tithiDisplayName = tomorrowTithi.fullName;

            // Fetch all users who have registered for the course
            const users = await CourseRegistration.find({ email: { $exists: true, $ne: "" } });
            
            // Filter unique emails
            const uniqueEmails = [...new Set(users.map(u => u.email.trim().toLowerCase()))];
            
            for (let i = 0; i < uniqueEmails.length; i++) {
                const email = uniqueEmails[i];
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: `🌙 આવતીકાલે પર્વ તિથિ છે: ${tithiDisplayName} રિમાઇન્ડર - Jain Talk`,
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <p>પ્રણામ પુણ્યશાળી,</p>
                        
                            <p>આપને પ્રેમપૂર્વક યાદ અપાવવા માટે કે આવતીકાલે, <strong>${dateStr}</strong> ના રોજ, <strong>${tithiDisplayName}</strong> ની પર્વ તિથિ છે.</p>
                        
                            <p>જૈન ધર્મમાં પર્વ તિથિનું અનેરું આધ્યાત્મિક મહત્વ રહેલું છે. આ પવિત્ર દિવસે નીચે મુજબના નિયમોનું પાલન કરવાનો આગ્રહ રાખવો:</p>
                            
                            <div style="margin: 20px 0; padding: 15px; background-color: #fff4e6; border-left: 5px solid #FF9800; border-radius: 4px;">
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 10px;">🥬 <strong>લીલોતરી નો ત્યાગ:</strong> પર્વ તિથિના દિવસે લીલા શાકભાજી અને કંદમૂળનો સંપૂર્ણ ત્યાગ કરવો.</li>
                                    <li style="margin-bottom: 10px;">🧘 <strong>તપશ્ચર્યા:</strong> આપની શક્તિ અનુસાર ઉપવાસ, એકાસણા કે બીયાસણા કરી આરાધના કરવી.</li>
                                    <li>📿 <strong>ધર્મ ધ્યાન:</strong> વધુમાં વધુ સમય પ્રભુ સ્મરણ, સામાયિક અને ધર્મ ધ્યાનમાં પસાર કરવો.</li>
                                </ul>
                            </div>
                        
                            <p>આપણી <strong>'સૌ ચાલો આરાધના કરીએ'</strong> ની વેબસાઇટ પર આવતીકાલની વિશેષ આરાધના સબમિટ કરવાનું ચૂકશો નહીં!</p>
                        
                            <p>આપની ધર્મ આરાધના નિર્વિઘ્ને પૂર્ણ થાય તેવી શુભકામનાઓ.</p>
                        
                            <p>જય જિનેન્દ્ર!</p>
                        
                            <p>લી.,<br>
                            <strong>Team Jain Talk</strong><br>
                            <span style="font-size: 12px; color: #777;">Powered by Design Ville by Maahir Shah</span></p>
                        </div>
                    `
                };
                
                try {
                    await sendMailWithFallback(mailOptions);
                    console.log(`[${i + 1}/${uniqueEmails.length}] Tithi reminder sent to ${email}`);
                } catch (mailErr) {
                    console.error(`Failed to send email to ${email}:`, mailErr.message);
                }
                
                // Wait 1.5 seconds between emails to avoid rate limit
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            console.log('Finished sending Parva Tithi reminders.');
        } else {
            console.log(`Tomorrow is ${tomorrowTithi.fullName}. No reminder needed.`);
        }
    } catch (error) {
        console.error('Cron Job Error:', error);
    }
});

// Daily Cron Job (Runs every day at 21:00 / 9:00 PM) for Missing Aradhana Submissions
cron.schedule('0 21 * * *', async () => {
    try {
        console.log('Running daily 9 PM Aradhana missing submission check...');
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        // Find all submissions for today
        const todaysSubmissions = await AradhanaSubmission.find({ dateString: todayStr });
        const submittedUserIds = todaysSubmissions.map(sub => sub.userId.toString());
        
        // Find all course registrations
        const courseRegistrations = await CourseRegistration.find({});
        
        // Filter course users who haven't submitted today
        const missingUsers = courseRegistrations.filter(reg => !submittedUserIds.includes(reg.userId.toString()));
        
        if (missingUsers.length === 0) {
            console.log('All course registered users have submitted their Aradhana today!');
            return;
        }

        // Get unique emails of missing users
        const uniqueEmails = [...new Set(missingUsers.map(u => u.email.trim().toLowerCase()))].filter(email => email !== "");
        
        console.log(`Found ${uniqueEmails.length} missing submissions. Sending reminders...`);
        
        for (let i = 0; i < uniqueEmails.length; i++) {
            const email = uniqueEmails[i];
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: '⏳ આજની આરાધના બાકી છે! (Today\'s Aradhana Pending)',
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>પ્રણામ પુણ્યશાળી,</p>
                        
                        <p>અમારી સિસ્ટમ મુજબ, આપની આજની ધર્મ આરાધના હજુ સુધી નોંધાઈ નથી.</p>
                        
                        <p>આપની આરાધનામાં સાતત્ય જળવાઈ રહે તે માટે, કૃપા કરીને આજે રાત્રે સૂતા પહેલાં <strong>'સૌ ચાલો આરાધના કરીએ' (Jain Talk)</strong> વેબસાઇટ પર જઈને આપની આજની આરાધના ચોક્કસથી સબમિટ કરી દેજો.</p>
                        
                        <p>જય જિનેન્દ્ર!</p>
                        
                        <p>લી.,<br>
                        <strong>Team Jain Talk</strong></p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="font-size: 12px; color: #777;">
                            Website Designed and Developed by <a href="https://design-ville.com/" style="color: #FF9800; text-decoration: none;"><strong>Design Ville by Maahir Shah</strong></a>
                        </p>
                    </div>
                `
            };
            
            try {
                await sendMailWithFallback(mailOptions);
                console.log(`[${i + 1}/${uniqueEmails.length}] Aradhana reminder sent to ${email}`);
            } catch (mailErr) {
                console.error(`Failed to send Aradhana reminder to ${email}:`, mailErr.message);
            }
            
            // Wait 1.5 seconds to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        console.log('Finished sending Aradhana missing reminders.');
    } catch (error) {
        console.error('9 PM Aradhana Cron Job Error:', error);
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
