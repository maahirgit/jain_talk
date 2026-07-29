require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const EMAIL_SUBJECT = '🌙 આવતીકાલે ચૌમાસી ચૌદસ છે! | Special Parva Tithi Reminder - Jain Talk';

const EMAIL_BODY = `
<div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; color:#333;">

    <!-- Design Ville Top Banner -->
    <div style="background:#FF9800; padding:10px 20px; border-radius:8px 8px 0 0; text-align:center;">
        <span style="color:white; font-size:12px; letter-spacing:1px;">
            ✨ Powered by <strong>Design Ville by Maahir Shah</strong> &nbsp;|&nbsp;
            <a href="https://design-ville.com/" style="color:white; text-decoration:underline;">design-ville.com</a> ✨
        </span>
    </div>

    <!-- Main Card -->
    <div style="background:#fff8f0; padding:30px; border:1px solid #ffe0b2; border-top:none; border-radius:0 0 8px 8px;">

        <!-- Title -->
        <h2 style="color:#e65100; text-align:center; margin-top:0;">🌙 આવતીકાલે ચૌમાસી ચૌદસ છે!</h2>
        <p style="text-align:center; color:#999; font-size:13px; margin-top:-10px;">28 જુલાઈ 2026 | Chaumasi Chaudas Special Reminder</p>

        <hr style="border:none; border-top:1px solid #ffe0b2; margin:20px 0;">

        <p>પ્રણામ પુણ્યશાળી,</p>

        <p>
            આપને પ્રેમપૂર્વક યાદ અપાવવા માટે કે આવતીકાલે, <strong>28 જુલાઈ 2026</strong> ના રોજ,
            <strong>ચૌમાસી ચૌદસ (Chaumasi Chaudas)</strong> ની અત્યંત પવિત્ર અને વિશેષ પર્વ તિથિ છે.
        </p>

        <p>
            ચૌમાસી ચૌદસ એ ચૌમાસ (Paryushan) ની ઋતુ દરમ્યાન આવતી ખૂબ જ મહત્ત્વની તિથિ છે.
            આ દિવસે વિશેષ આરાધના, તપ અને ભક્તિ દ્વારા આત્મ-શુદ્ધિ કરવાનો ઉત્તમ અવસર છે.
        </p>

        <!-- Rules Box -->
        <div style="background:#fff4e6; border-left:5px solid #FF9800; border-radius:4px; padding:15px 20px; margin:20px 0;">
            <p style="margin:0 0 10px 0;"><strong>🙏 આ પવિત્ર દિવસ માટેના નિયમો:</strong></p>
            <ul style="margin:0; padding-left:20px;">
                <li style="margin-bottom:8px;">
                    🥬 <strong>લીલોતરી નો ત્યાગ:</strong> પર્વ તિથિના દિવસે લીલા શાકભાજી અને કંદમૂળનો સંપૂર્ણ ત્યાગ કરવો.
                </li>
                <li style="margin-bottom:8px;">
                    🧘 <strong>તપશ્ચર્યા:</strong> આપની શક્તિ અનુસાર ઉપવાસ, એકાસણા કે બીયાસણા કરી આરાધના કરવી.
                </li>
                <li style="margin-bottom:8px;">
                    📿 <strong>ધર્મ ધ્યાન:</strong> વધુમાં વધુ સમય પ્રભુ સ્મરણ, સામાયિક અને ધર્મ ધ્યાનમાં પસાર કરવો.
                </li>
                <li>
                    🕌 <strong>દેરાસર દર્શન:</strong> આ વિશેષ તિથિ પર ભગવાનના દર્શન-પૂજન અવશ્ય કરવા.
                </li>
            </ul>
        </div>

        <p>
            આપણી <strong>'સૌ ચાલો આરાધના કરીએ' (Jain Talk)</strong> વેબસાઇટ પર
            આવતીકાલ ની ચૌમાસી ચૌદસ ની વિશેષ આરાધના સબમિટ કરવાનું ચૂકશો નહીં!
        </p>

        <p>
            આ પવિત્ર ચૌમાસી ચૌદસ નિમિત્તે આપ સૌની ધર્મ આરાધના નિર્વિઘ્ને પૂર્ણ થાય
            તેવી હૃદયપૂર્વક શુભેચ્છાઓ. 🙏
        </p>

        <p>જય જિનેન્દ્ર!</p>

        <p>
            લી.,<br>
            <strong>Team Jain Talk</strong><br>
            <span style="font-size:12px; color:#999;">
                Powered by <a href="https://design-ville.com/" style="color:#FF9800; text-decoration:none;"><strong>Design Ville by Maahir Shah</strong></a>
            </span>
        </p>

    </div>
</div>
`;

async function sendChaumusiChaudas() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Fetch all users (all registered accounts)
        const User = mongoose.model('User', new mongoose.Schema({ email: String }, { strict: false }));
        const users = await User.find({});
        const uniqueEmails = [...new Set(users.map(u => u.email.trim().toLowerCase()).filter(e => e))];
        console.log(`Found ${uniqueEmails.length} unique email addresses. Starting to send...\n`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const transporter2 = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER_2, pass: process.env.EMAIL_PASS_2 }
        });

        async function sendMailWithFallback(mailOptions) {
            try {
                await transporter.sendMail(mailOptions);
            } catch (err) {
                const isQuotaError = /limit exceeded|550|421|quota|too many/i.test(err.message || '');
                if (isQuotaError && process.env.EMAIL_USER_2 && process.env.EMAIL_PASS_2) {
                    console.warn('[EMAIL] Primary limit reached. Switching to secondary account...');
                    const fallbackOptions = { ...mailOptions, from: process.env.EMAIL_USER_2 };
                    await transporter2.sendMail(fallbackOptions);
                } else {
                    throw err;
                }
            }
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < uniqueEmails.length; i++) {
            const email = uniqueEmails[i];
            try {
                await sendMailWithFallback({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: EMAIL_SUBJECT,
                    html: EMAIL_BODY
                });
                successCount++;
                console.log(`[${i + 1}/${uniqueEmails.length}] ✅ Sent to ${email}`);
            } catch (err) {
                failCount++;
                console.error(`[${i + 1}/${uniqueEmails.length}] ❌ Failed for ${email}: ${err.message}`);
            }

            // 1.5s delay to avoid Gmail rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log(`\n✅ Done! Successfully sent: ${successCount} | Failed: ${failCount}`);

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        mongoose.disconnect();
    }
}

sendChaumusiChaudas();
