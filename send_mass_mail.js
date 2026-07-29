require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const EMAIL_SUBJECT = '🌟 આપણી ધર્મ આરાધના ૨૮ તારીખથી શરૂ - Jain Talk';

const EMAIL_BODY = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>પ્રણામ પુણ્યશાળી,</p>

    <p>આપ સૌની ધર્મ આરાધનાને ડિજિટલ માધ્યમથી વધુ સરળ અને સુંદર બનાવવા માટે, આ <strong>'Jain Talk'</strong> વેબસાઇટનું સંપૂર્ણ નિર્માણ અને ડેવલપમેન્ટ (Web Development) <strong>Design Ville by Maahir Shah</strong> દ્વારા કરવામાં આવ્યું છે (એજન્સીની વેબસાઇટ: <a href="https://design-ville.com/" style="color: #FF9800;">https://design-ville.com/</a>).</p>

    <p>આપ સૌ જાણો છો તેમ, આપણી વિશેષ આરાધના આગામી <strong>૨૮ તારીખથી શરૂ થવા જઈ રહી છે</strong>. જે પણ યુઝર્સે <strong>'સૌ ચાલો આરાધના કરીએ' (Sau Chalo Aaradhna Karie)</strong> માં રજીસ્ટ્રેશન કરાવેલ છે, તેમના એકાઉન્ટ ૨૮ તારીખ પહેલાં એક્ટિવેટ કરી દેવામાં આવશે. જો આપે હજુ સુધી રજીસ્ટ્રેશન નથી કરાવ્યું, તો કૃપા કરીને આજે જ વેબસાઇટ પર જઈને કરાવી લેજો, જેથી આપ સૌ આરાધનામાં જોડાઈ શકો.</p>

    <p><strong>Design Ville</strong> ની મદદથી અમે આ વેબસાઇટને ખૂબ જ સુંદર અને આકર્ષક રીતે ડિઝાઇન કરી છે, જેમાં આપ સૌ માટે નીચે મુજબની અદભુત સુવિધાઓ (Features) રાખવામાં આવી છે:</p>

    <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
        <p style="margin-bottom: 15px;">✨ <strong>જૈન પંચાંગ અને તિથિ રિમાઇન્ડર:</strong><br> દરરોજની સચોટ તિથિ અને પર્વ તિથિની નોટિફિકેશન.</p>
        
        <p style="margin-bottom: 15px;">🌅 <strong>નવકારશી અને ચૌવિહાર રિમાઇન્ડર:</strong><br> આપના સમય મુજબ સીધા તમારા ઇમેઇલ પર દરરોજ રિમાઇન્ડર.</p>
        
        <p style="margin-bottom: 15px;">🎥 <strong>જૈન રીલ્સ (Jain Reels):</strong><br> આપ આ વિભાગમાં ધાર્મિક રીલ્સ જોઈ શકો છો અને પોતાની ધર્મની રીલ્સ પોસ્ટ પણ કરી શકો છો!</p>
        
        <p style="margin-bottom: 15px;">📊 <strong>દૈનિક આરાધના અને લીડરબોર્ડ:</strong><br> રોજની આરાધના સબમિટ કરો અને લીડરબોર્ડમાં ટોપ 10 માં તમારું સ્થાન જુઓ.</p>
        
        <p>🔐 <strong>મલ્ટીપલ એકાઉન્ટ્સ:</strong><br> એક જ ઈમેલ આઈડીનો ઉપયોગ કરીને પરિવારના દરેક સભ્યો માટે અલગ એકાઉન્ટ બનાવવાની સુવિધા.</p>
    </div>

    <p>આ તમામ ફીચર્સનો લાભ લો અને આપની આરાધનાને વધુ પ્રેરણાદાયક બનાવો.</p> 

    <p>જય જિનેન્દ્ર!</p>

    <p>લી.,<br>
    <strong>Team Jain Talk</strong><br>
    Designed and Powered by <a href="https://design-ville.com/" style="color: #FF9800; text-decoration: none;"><strong>Design Ville by Maahir Shah</strong></a></p>
</div>
`;

async function sendMassMail() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ email: String }, { strict: false }));
        
        const users = await User.find({});
        
        // Filter unique emails
        const uniqueEmails = [...new Set(users.map(u => u.email.trim().toLowerCase()))];
        console.log(`Found ${uniqueEmails.length} unique email addresses.`);

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

        // Try primary; fall back to secondary on quota/rate-limit errors
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
                console.log(`[${i + 1}/${uniqueEmails.length}] Sent to ${email}`);
            } catch (err) {
                failCount++;
                console.error(`[${i + 1}/${uniqueEmails.length}] Failed for ${email}: ${err.message}`);
            }
            
            // Wait 1.5 seconds between emails to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log(`\nFinished! Sent successfully: ${successCount}, Failed: ${failCount}`);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

sendMassMail();
