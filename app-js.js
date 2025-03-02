// ตั้งค่า Firebase
const firebaseConfig = {
    // !! หมายเหตุสำคัญ !!
    // คุณต้องแก้ไขข้อมูลนี้ด้วยค่าจาก Firebase ของคุณ
    // สมัครใช้งาน Firebase (ฟรี) และไปที่ Project settings
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ปัจจุบัน
let currentUser = null;

// DOM Elements
const navLinks = {
    home: document.getElementById('nav-home'),
    assessment: document.getElementById('nav-assessment'),
    history: document.getElementById('nav-history'),
    profile: document.getElementById('nav-profile')
};

const pages = {
    home: document.getElementById('home'),
    auth: document.getElementById('auth'),
    assessment: document.getElementById('assessment'),
    history: document.getElementById('history'),
    profile: document.getElementById('profile')
};

const authElements = {
    status: document.getElementById('auth-status'),
    userInfo: document.getElementById('user-info'),
    authButton: document.getElementById('auth-button'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    showSignup: document.getElementById('show-signup'),
    showSignin: document.getElementById('show-signin'),
    signinForm: document.getElementById('signin-form'),
    signupForm: document.getElementById('signup-form')
};

const modal = {
    container: document.getElementById('modal'),
    message: document.getElementById('modal-message'),
    button: document.getElementById('modal-button'),
    close: document.querySelector('.close')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', init);

// Navigation
for (const key in navLinks) {
    navLinks[key].addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(key);
    });
}

// Auth related
authElements.authButton.addEventListener('click', handleAuthButtonClick);
authElements.showSignup.addEventListener('click', toggleAuthForms);
authElements.showSignin.addEventListener('click', toggleAuthForms);
authElements.signinForm.addEventListener('submit', handleSignIn);
authElements.signupForm.addEventListener('submit', handleSignUp);

// Other elements
document.getElementById('start-assessment').addEventListener('click', function() {
    navigateTo('assessment');
});
document.getElementById('esas-form').addEventListener('submit', handleESASSubmit);
document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
document.getElementById('password-form').addEventListener('submit', handlePasswordChange);
document.getElementById('logout-button').addEventListener('click', handleLogout);

// ESAS form ranges
const rangeInputs = document.querySelectorAll('input[type="range"]');
rangeInputs.forEach(input => {
    input.addEventListener('input', function() {
        const valueDisplay = this.parentElement.nextElementSibling;
        valueDisplay.textContent = this.value;
    });
});

// Modal
modal.close.addEventListener('click', closeModal);
modal.button.addEventListener('click', closeModal);
window.addEventListener('click', function(e) {
    if (e.target == modal.container) {
        closeModal();
    }
});

// Functions

/**
 * Initialize the app
 */
function init() {
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            updateUIForSignedInUser(user);
        } else {
            // User is signed out
            currentUser = null;
            updateUIForSignedOutUser();
        }
    });
}

/**
 * Navigate to a specific page
 * @param {string} page - The page to navigate to
 */
function navigateTo(page) {
    // Check if user is logged in for protected pages
    if ((page === 'assessment' || page === 'history' || page === 'profile') && !currentUser) {
        showModal('กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้');
        toggleAuthForms('login');
        showPage('auth');
        return;
    }

    // Update active nav link
    for (const key in navLinks) {
        navLinks[key].classList.remove('active');
    }
    navLinks[page]?.classList.add('active');

    // Show the selected page
    showPage(page);
    
    // Additional actions for specific pages
    if (page === 'history' && currentUser) {
        loadHistoryData();
    } else if (page === 'profile' && currentUser) {
        loadProfileData();
    }
}

/**
 * Show a specific page and hide others
 * @param {string} pageId - The ID of the page to show
 */
function showPage(pageId) {
    for (const key in pages) {
        pages[key].classList.remove('active');
    }
    pages[pageId]?.classList.add('active');
}

/**
 * Update UI for signed in user
 * @param {Object} user - Firebase user object
 */
function updateUIForSignedInUser(user) {
    // Update auth status
    authElements.userInfo.textContent = `สวัสดี, ${user.displayName || user.email}`;
    authElements.authButton.textContent = 'ออกจากระบบ';
    
    // If on auth page, redirect to home
    if (pages.auth.classList.contains('active')) {
        navigateTo('home');
    }
}

/**
 * Update UI for signed out user
 */
function updateUIForSignedOutUser() {
    // Update auth status
    authElements.userInfo.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
    authElements.authButton.textContent = 'เข้าสู่ระบบ';
    
    // If on protected page, redirect to home
    if (
        pages.assessment.classList.contains('active') || 
        pages.history.classList.contains('active') || 
        pages.profile.classList.contains('active')
    ) {
        navigateTo('home');
    }
}

/**
 * Handle auth button click
 */
function handleAuthButtonClick() {
    if (currentUser) {
        // User is signed in, log them out
        handleLogout();
    } else {
        // User is signed out, show login page
        showPage('auth');
        toggleAuthForms('login');
    }
}

/**
 * Toggle between login and registration forms
 * @param {string} form - Which form to show ('login' or 'register')
 */
function toggleAuthForms(form) {
    if (form === 'register' || authElements.loginForm.style.display !== 'none') {
        authElements.loginForm.style.display = 'none';
        authElements.registerForm.style.display = 'block';
    } else {
        authElements.loginForm.style.display = 'block';
        authElements.registerForm.style.display = 'none';
    }
}

/**
 * Handle sign in form submission
 * @param {Event} e - Form submit event
 */
async function handleSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Clear form
        e.target.reset();
    } catch (error) {
        showModal(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Handle sign up form submission
 * @param {Event} e - Form submit event
 */
async function handleSignUp(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const patientId = document.getElementById('patient-id').value;
    const lineUserId = document.getElementById('line-user-id-signup').value;
    
    // Validate password match
    if (password !== confirmPassword) {
        showModal('รหัสผ่านไม่ตรงกัน กรุณาลองอีกครั้ง');
        return;
    }
    
    try {
        // Create user
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile
        await result.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(result.user.uid).set({
            name: name,
            email: email,
            patientId: patientId || null,
            lineUserId: lineUserId || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear form
        e.target.reset();
        
        showModal('ลงทะเบียนสำเร็จ!');
    } catch (error) {
        showModal(`ลงทะเบียนไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Handle ESAS form submission
 * @param {Event} e - Form submit event
 */
async function handleESASSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showModal('กรุณาเข้าสู่ระบบก่อนบันทึกการประเมิน');
        return;
    }
    
    // Get all symptom values
    const symptoms = {};
    const form = e.target;
    const symptomInputs = form.querySelectorAll('input[type="range"]');
    
    symptomInputs.forEach(input => {
        symptoms[input.name] = parseInt(input.value);
    });
    
    // Add other symptom text if provided
    const otherSymptomText = document.getElementById('other_symptom_text').value;
    if (otherSymptomText) {
        symptoms.other_symptom_text = otherSymptomText;
    }
    
    try {
        // Add to Firestore
        const docRef = await db.collection('assessments').add({
            userId: currentUser.uid,
            symptoms: symptoms,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showModal('บันทึกการประเมินเรียบร้อยแล้ว!');
        form.reset();
        
        // Reset displays
        const valueDisplays = form.querySelectorAll('.value-display');
        valueDisplays.forEach(display => {
            display.textContent = '0';
        });
        
        // ส่งข้อมูลไปยัง LINE OA ถ้ามีการเชื่อมต่อ
        try {
            // ดึงข้อมูลผู้ใช้เพื่อหา LINE User ID
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists && userDoc.data().lineUserId && window.lineModule) {
                // ดึงข้อมูลการประเมินที่เพิ่งบันทึก
                const assessmentDoc = await docRef.get();
                if (assessmentDoc.exists) {
                    // ส่งข้อมูลไปยัง LINE
                    window.lineModule.sendAssessment(assessmentDoc.data(), userDoc.data().lineUserId);
                }
            }
        } catch (lineError) {
            console.error('Error sending to LINE:', lineError);
            // ไม่แจ้งเตือนผู้ใช้เนื่องจากการบันทึกข้อมูลสำเร็จแล้ว
        }
    } catch (error) {
        showModal(`บันทึกไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Load history data from Firestore
 */
async function loadHistoryData() {
    if (!currentUser) return;
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<p class="loading">กำลังโหลดข้อมูล...</p>';
    
    try {
        // Get date range filter
        const dateRange = document.getElementById('date-range').value;
        let startDate = null;
        
        if (dateRange !== 'all') {
            const days = parseInt(dateRange);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }
        
        // Query Firestore
        let query = db.collection('assessments')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc');
        
        if (startDate) {
            query = query.where('createdAt', '>=', startDate);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="no-data">ยังไม่มีประวัติการประเมิน</p>';
            return;
        }
        
        // Display data
        historyList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt.toDate();
            const dateStr = formatDate(date);
            const symptoms = data.symptoms;
            
            // Create history item
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.setAttribute('data-id', doc.id);
            
            // Calculate average symptom score
            const symptomValues = Object.values(symptoms).filter(val => typeof val === 'number');
            const avgScore = symptomValues.reduce((sum, val) => sum + val, 0) / symptomValues.length;
            
            historyItem.innerHTML = `
                <div class="history-item-date">${dateStr}</div>
                <div class="history-item-score">คะแนนเฉลี่ย: ${avgScore.toFixed(1)}</div>
            `;
            
            historyList.appendChild(historyItem);
            
            // Add click event to show details
            historyItem.addEventListener('click', () => showAssessmentDetails(doc.id));
        });
        
        // Also update chart if we have data
        updateHistoryChart(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
        historyList.innerHTML = `<p class="error">เกิดข้อผิดพลาด: ${error.message}</p>`;
    }
}

/**
 * Show assessment details for a specific assessment
 * @param {string} assessmentId - Firestore document ID
 */
async function showAssessmentDetails(assessmentId) {
    try {
        const doc = await db.collection('assessments').doc(assessmentId).get();
        
        if (!doc.exists) {
            showModal('ไม่พบข้อมูลการประเมิน');
            return;
        }
        
        const data = doc.data();
        const date = data.createdAt.toDate();
        const dateStr = formatDate(date);
        const symptoms = data.symptoms;
        
        // Format symptoms for display
        const symptomLabels = {
            pain: 'ความปวด',
            tiredness: 'ความเหนื่อยล้า',
            nausea: 'คลื่นไส้อาเจียน',
            depression: 'ความรู้สึกซึมเศร้า',
            anxiety: 'ความวิตกกังวล',
            drowsiness: 'ความง่วงซึม',
            appetite: 'อาการเบื่ออาหาร',
            wellbeing: 'ความรู้สึกไม่สบาย',
            shortness_of_breath: 'หายใจลำบาก',
            other_symptom: 'อาการอื่นๆ'
        };
        
        let symptomsHtml = '<h3>รายละเอียดการประเมิน</h3>';
        symptomsHtml += `<p>วันที่: ${dateStr}</p><ul>`;
        
        for (const key in symptoms) {
            if (key === 'other_symptom_text') continue;
            
            const label = symptomLabels[key] || key;
            const value = symptoms[key];
            
            let severityClass = '';
            if (value >= 0 && value <= 3) {
                severityClass = 'symptom-severity-0-3';
            } else if (value >= 4 && value <= 6) {
                severityClass = 'symptom-severity-4-6';
            } else if (value >= 7 && value <= 10) {
                severityClass = 'symptom-severity-7-10';
            }
            
            symptomsHtml += `<li class="${severityClass}">${label}: ${value}`;
            
            if (key === 'other_symptom' && symptoms.other_symptom_text) {
                symptomsHtml += ` (${symptoms.other_symptom_text})`;
            }
            
            symptomsHtml += '</li>';
        }
        
        symptomsHtml += '</ul>';
        
        // Show in modal
        showModal(symptomsHtml, 'ปิด');
    } catch (error) {
        showModal(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}

/**
 * Update history chart with assessment data
 * @param {Array} assessments - Array of assessment data
 */
function updateHistoryChart(assessments) {
    const chartContainer = document.getElementById('history-chart');
    
    if (assessments.length === 0) {
        chartContainer.innerHTML = '<p class="no-data">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>';
        return;
    }
    
    // Helper to create canvas
    if (!document.getElementById('symptom-chart')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'symptom-chart';
        chartContainer.innerHTML = '';
        chartContainer.appendChild(canvas);
    }
    
    // Prepare data for chart
    // Note: This is a simplified version since we don't have a chart library
    // In a real implementation, you would use a library like Chart.js
    
    chartContainer.innerHTML = `
        <p>หมายเหตุ: ในการใช้งานจริง ส่วนนี้จะแสดงกราฟการเปลี่ยนแปลงของอาการต่างๆ</p>
        <p>คุณจะต้องเพิ่ม Chart.js หรือไลบรารีอื่นๆ สำหรับการสร้างกราฟ</p>
    `;
    
    // A real chart implementation would go here
    // Example with Chart.js (not included in this code):
    /*
    new Chart(document.getElementById('symptom-chart'), {
        type: 'line',
        data: {
            labels: assessments.map(a => formatDate(a.createdAt.toDate())).reverse(),
            datasets: [
                {
                    label: 'ความปวด',
                    data: assessments.map(a => a.symptoms.pain).reverse(),
                    borderColor: 'red',
                    fill: false
                },
                // Add more datasets for other symptoms
            ]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'การเปลี่ยนแปลงของอาการตามเวลา'
            },
            scales: {
                y: {
                    min: 0,
                    max: 10
                }
            }
        }
    });
    */
}

/**
 * Load profile data from Firestore
 */
async function loadProfileData() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Update form fields
            document.getElementById('profile-name').value = data.name || '';
            document.getElementById('profile-email').value = currentUser.email || '';
            document.getElementById('profile-phone').value = data.phone || '';
            document.getElementById('profile-age').value = data.age || '';
            document.getElementById('profile-gender').value = data.gender || '';
        } else {
            // No user document, create one
            await db.collection('users').doc(currentUser.uid).set({
                name: currentUser.displayName || '',
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            document.getElementById('profile-name').value = currentUser.displayName || '';
            document.getElementById('profile-email').value = currentUser.email || '';
        }
    } catch (error) {
        showModal(`เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์: ${error.message}`);
    }
}

/**
 * Handle profile update form submission
 * @param {Event} e - Form submit event
 */
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showModal('กรุณาเข้าสู่ระบบก่อนอัปเดตโปรไฟล์');
        return;
    }
    
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const age = document.getElementById('profile-age').value;
    const gender = document.getElementById('profile-gender').value;
    
    try {
        // Update Firestore document
        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            phone: phone,
            age: age ? parseInt(age) : null,
            gender: gender,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update Firebase Auth profile
        await currentUser.updateProfile({
            displayName: name
        });
        
        // Update UI
        authElements.userInfo.textContent = `สวัสดี, ${name || currentUser.email}`;
        
        showModal('อัปเดตโปรไฟล์เรียบร้อยแล้ว!');
    } catch (error) {
        showModal(`อัปเดตไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Handle password change form submission
 * @param {Event} e - Form submit event
 */
async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showModal('กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน');
        return;
    }
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    // Validate password match
    if (newPassword !== confirmNewPassword) {
        showModal('รหัสผ่านใหม่ไม่ตรงกัน กรุณาลองอีกครั้ง');
        return;
    }
    
    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Change password
        await currentUser.updatePassword(newPassword);
        
        // Clear form
        e.target.reset();
        
        showModal('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!');
    } catch (error) {
        showModal(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await auth.signOut();
        showModal('ออกจากระบบเรียบร้อยแล้ว');
    } catch (error) {
        showModal(`ออกจากระบบไม่สำเร็จ: ${error.message}`);
    }
}

/**
 * Format date to Thai format
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} น.`;
}

/**
 * Show modal with message
 * @param {string} message - Message to display
 * @param {string} buttonText - Button text (default: 'ตกลง')
 */
function showModal(message, buttonText = 'ตกลง') {
    modal.message.innerHTML = message;
    modal.button.textContent = buttonText;
    modal.container.style.display = 'block';
}

/**
 * Close modal
 */
function closeModal() {
    modal.container.style.display = 'none';
}
