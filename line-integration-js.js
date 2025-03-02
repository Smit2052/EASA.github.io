// LINE OA Integration Script

// LINE Channel ID - ต้องแก้ไขให้ตรงกับ LINE OA ของคุณ
const LINE_CHANNEL_ID = 'YOUR_LINE_CHANNEL_ID';
const LINE_LIFF_ID = 'YOUR_LIFF_ID';

// สถานะการเชื่อมต่อ LINE
let lineConnected = false;
let lineProfile = null;

// DOM Elements
const connectLineBtn = document.getElementById('connect-line-btn');
const connectLineBtnSignup = document.getElementById('connect-line-btn-signup');
const lineLoginBtn = document.getElementById('line-login-btn');
const lineSignupBtn = document.getElementById('line-signup-btn');
const lineUserIdInput = document.getElementById('line-user-id');
const lineUserIdSignupInput = document.getElementById('line-user-id-signup');

// Firebase Cloud Functions endpoint
let sendLineMessageFunction;

// เริ่มต้นการทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', initLINE);

// Event Listeners
connectLineBtn.addEventListener('click', connectLINE);
connectLineBtnSignup.addEventListener('click', connectLINE);
lineLoginBtn.addEventListener('click', loginWithLINE);
lineSignupBtn.addEventListener('click', signupWithLINE);

/**
 * เริ่มต้นการทำงานของ LINE Integration
 */
function initLINE() {
    // เริ่มต้น LIFF (LINE Front-end Framework)
    if (typeof liff !== 'undefined') {
        liff.init({ liffId: LINE_LIFF_ID })
            .then(() => {
                console.log('LIFF initialized!');
                
                // ตรวจสอบว่าผู้ใช้ล็อกอิน LINE หรือไม่
                if (liff.isLoggedIn()) {
                    getLINEProfile();
                }
                
                // ตรวจสอบว่าหน้าเว็บนี้เปิดใน LINE หรือไม่
                if (liff.isInClient()) {
                    // เปิดในแอป LINE
                    showModal('กำลังเปิดในแอป LINE');
                    handleLIFFLogin();
                }
            })
            .catch(err => {
                console.error('LIFF initialization failed', err);
            });
    }
    
    // ตั้งค่า Firebase Cloud Functions
    if (firebase.app().options.projectId) {
        sendLineMessageFunction = firebase.functions().httpsCallable('sendLineFlexMessage');
    }
}

/**
 * เชื่อมต่อบัญชี LINE
 */
function connectLINE() {
    if (typeof liff === 'undefined') {
        showModal('ไม่พบ LINE LIFF SDK กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    if (liff.isLoggedIn()) {
        // ผู้ใช้เข้าสู่ระบบ LINE แล้ว ดึงข้อมูลโปรไฟล์
        getLINEProfile();
    } else {
        // ผู้ใช้ยังไม่ได้เข้าสู่ระบบ LINE ให้ล็อกอิน
        liff.login({ redirectUri: window.location.href });
    }
}

/**
 * ดึงข้อมูลโปรไฟล์ LINE ของผู้ใช้
 */
async function getLINEProfile() {
    try {
        if (!liff.isLoggedIn()) {
            return;
        }
        
        lineProfile = await liff.getProfile();
        
        // บันทึก LINE User ID
        lineUserIdInput.value = lineProfile.userId;
        lineUserIdSignupInput.value = lineProfile.userId;
        
        // อัปเดตสถานะการเชื่อมต่อ
        lineConnected = true;
        
        // อัปเดต UI
        connectLineBtn.textContent = 'เชื่อมต่อแล้ว';
        connectLineBtn.classList.add('btn-success');
        connectLineBtn.classList.remove('btn-secondary');
        
        connectLineBtnSignup.textContent = 'เชื่อมต่อแล้ว';
        connectLineBtnSignup.classList.add('btn-success');
        connectLineBtnSignup.classList.remove('btn-secondary');
        
        console.log('LINE Profile:', lineProfile);
    } catch (error) {
        console.error('Error getting LINE profile', error);
        showModal('ไม่สามารถดึงข้อมูล LINE ได้: ' + error.message);
    }
}

/**
 * ล็อกอินด้วย LINE
 */
function loginWithLINE() {
    if (typeof liff === 'undefined') {
        showModal('ไม่พบ LINE LIFF SDK กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    // ล็อกอิน LINE และกลับมาที่หน้านี้
    liff.login({ redirectUri: window.location.href });
}

/**
 * ลงทะเบียนด้วย LINE
 */
function signupWithLINE() {
    if (typeof liff === 'undefined') {
        showModal('ไม่พบ LINE LIFF SDK กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    // ล็อกอิน LINE และกลับมาที่หน้านี้พร้อมพารามิเตอร์สำหรับการลงทะเบียน
    const redirectUrl = new URL(window.location.href);
    redirectUrl.searchParams.set('mode', 'signup');
    
    liff.login({ redirectUri: redirectUrl.toString() });
}

/**
 * จัดการการล็อกอินจาก LINE LIFF
 */
async function handleLIFFLogin() {
    try {
        // ตรวจสอบว่าผู้ใช้ล็อกอิน LINE แล้ว
        if (!liff.isLoggedIn()) {
            return;
        }
        
        // ดึงข้อมูลโปรไฟล์ LINE
        const profile = await liff.getProfile();
        lineProfile = profile;
        
        // ตรวจสอบว่ามีบัญชีที่เชื่อมโยงกับ LINE User ID นี้หรือไม่
        try {
            const snapshot = await db.collection('users')
                .where('lineUserId', '==', profile.userId)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                // พบบัญชีที่เชื่อมโยงกับ LINE แล้ว
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                
                // ล็อกอินด้วยอีเมลและรหัสผ่านที่เก็บไว้ (ในสถานการณ์จริงควรใช้ Custom Auth Token)
                // นี่เป็นเพียงตัวอย่างสำหรับการสาธิต
                if (userData.email) {
                    // การล็อกอินที่ปลอดภัยกว่าควรทำผ่าน Firebase Functions
                    showModal('กำลังเข้าสู่ระบบด้วยบัญชีที่เชื่อมโยงกับ LINE...');
                }
            } else {
                // ไม่พบบัญชีที่เชื่อมโยง ให้ไปที่หน้าลงทะเบียน
                showModal('ไม่พบบัญชีที่เชื่อมโยงกับ LINE ของคุณ กรุณาลงทะเบียน');
                toggleAuthForms('register');
                lineUserIdSignupInput.value = profile.userId;
                
                // ใส่ข้อมูลจาก LINE ในฟอร์มลงทะเบียน
                document.getElementById('signup-name').value = profile.displayName || '';
            }
        } catch (error) {
            console.error('Error checking LINE user', error);
            showModal('เกิดข้อผิดพลาดในการตรวจสอบบัญชี: ' + error.message);
        }
    } catch (error) {
        console.error('LIFF login handling failed', error);
        showModal('การล็อกอินด้วย LINE ล้มเหลว: ' + error.message);
    }
}

/**
 * ส่งข้อมูลการประเมินไปยัง LINE OA
 * @param {Object} assessmentData - ข้อมูลการประเมิน
 * @param {string} lineUserId - LINE User ID
 */
async function sendAssessmentToLINE(assessmentData, lineUserId) {
    if (!sendLineMessageFunction || !lineUserId) {
        console.error('LINE message function not available or no LINE User ID');
        return;
    }
    
    try {
        // เรียกใช้ Cloud Function เพื่อส่งข้อความไปยัง LINE
        const result = await sendLineMessageFunction({
            userId: lineUserId,
            assessmentData: assessmentData
        });
        
        console.log('Sent assessment to LINE:', result);
    } catch (error) {
        console.error('Error sending to LINE:', error);
    }
}

// ส่งออกฟังก์ชัน
window.lineModule = {
    isConnected: () => lineConnected,
    getProfile: () => lineProfile,
    sendAssessment: sendAssessmentToLINE
};
