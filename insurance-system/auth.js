/* =========================================================
   auth.js (แก้ไข: เปลี่ยนมาใช้ "อีเมลจริง" แทนชื่อ-นามสกุล)
   =========================================================

   สิ่งที่เปลี่ยนจากเวอร์ชันเดิม:
   - เดิม: พนักงานพิมพ์ "ชื่อ-นามสกุล" แล้วระบบแปลงเป็นอีเมลปลอม (hash ของชื่อ)
     เพื่อใช้กับ Firebase Auth เบื้องหลัง
   - ใหม่: พนักงานสมัคร/ล็อกอินด้วย "อีเมลจริง" ของตัวเอง ตรงไปตรงมา
     ส่วนชื่อ-นามสกุล ใช้เก็บเป็น "ชื่อที่แสดงผล" (displayName) ผูกไว้กับบัญชี Firebase Auth
     เพื่อให้หน้าอื่นๆ ในระบบ (badge, ชื่อผู้แจ้งงาน, ตัวกรองพนักงาน ฯลฯ) แสดงชื่อเต็มได้เหมือนเดิมทุกจุด
     โดยไม่ต้องแก้ไฟล์อื่นเลย (getEmployeeName() คืนค่าชื่อเต็มเหมือนเดิมทุกประการ)

   หมายเหตุความเข้ากันได้กับระบบเดิม (สำคัญมาก ห้ามลบ):
   หน้าอื่นในระบบ (index.html, form_product.html, form_car.html, report.html ฯลฯ)
   ยังคงใช้คีย์ "employeeName" / "currentUser" ผ่านฟังก์ชัน getEmployeeName() อยู่แล้ว
   ไฟล์นี้ยังคงเขียนคีย์เดิมทั้งสองไว้คู่กันเสมอ (ค่าคือ "ชื่อ นามสกุล")
   เพื่อไม่ให้ต้องแก้ไฟล์อื่นเลยแม้แต่บรรทัดเดียว
========================================================= */

const LOGIN_KEY = "login";
const FULL_NAME_KEY = "fullName";
const FIRST_NAME_KEY = "firstName";
const LAST_NAME_KEY = "lastName";
const EMAIL_KEY = "employeeEmail";

/* คีย์เดิมที่ระบบอื่นใช้อ่านชื่อผู้ใช้งานอยู่แล้ว (คงไว้เพื่อความเข้ากันได้) */
const EMPLOYEE_KEY = "employeeName";
const LEGACY_KEY = "currentUser";

/* เก็บรหัสผ่านของพนักงานที่ล็อกอินอยู่ไว้ในเครื่องนี้เท่านั้น (ดูหมายเหตุด้านบน) */
const SECRET_KEY = "employeeSecret";

/* =========================================================
   ตั้งค่าได้ตามต้องการ
========================================================= */

/* เปิด/ปิดการรับสมัครพนักงานใหม่ (signup.html)
   ปิดได้ง่ายๆ โดยเปลี่ยนเป็น false เมื่อพนักงานสมัครครบทุกคนแล้ว
   ไม่ต้องลบหรือย้ายไฟล์ signup.html ออกจากเซิร์ฟเวอร์เลย */
const SIGNUP_ENABLED = true;

/* รหัสเชิญสำหรับสมัครสมาชิกใหม่เท่านั้น (ไม่ใช่รหัสผ่านสำหรับ login ประจำวัน)
   ใช้ครั้งเดียวตอนสมัคร ไม่ได้ถูกใช้ซ้ำทุกครั้งที่ล็อกอินเหมือนรหัสกลางเดิม
   เปลี่ยนค่านี้ได้ตลอดเวลาถ้าอยากหมุนเวียนรหัสเชิญใหม่ */
const INVITE_CODE = "ploy0889798000";

/* =========================================================
   Firebase config (โปรเจกต์เดียวกับทุกหน้าในระบบ)
========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyCNpaYlwrkJhBA-8tAax022PWWFYMRz7Kw",
  authDomain: "insurance-system-f26b0.firebaseapp.com",
  projectId: "insurance-system-f26b0",
  storageBucket: "insurance-system-f26b0.firebasestorage.app",
  messagingSenderId: "438698153100",
  appId: "1:438698153100:web:a553b97b59701883f057a9"
};

/* =========================================================
   ตัวช่วยแปลงข้อความให้เป็นรูปแบบเดียวกันเสมอ
========================================================= */

/* ทำให้ชื่อที่พิมพ์มาอยู่ในรูปแบบเดียวกันเสมอ (ตัดช่องว่างหัวท้าย ยุบช่องว่างซ้ำ) */
function normalizeName(name) {
    return String(name || "").trim().replace(/\s+/g, " ");
}

/* ทำให้อีเมลที่พิมพ์มาอยู่ในรูปแบบเดียวกันเสมอ (ตัดช่องว่าง + ตัวพิมพ์เล็กทั้งหมด
   เพื่อไม่ให้ "Name@Mail.com" กับ "name@mail.com" กลายเป็นคนละบัญชีกัน) */
function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   Firebase Authentication (บัญชีรายบุคคล ด้วยอีเมลจริง)
   ใช้ named Firebase app "authApp" แยกจาก app หลักที่ script.js/report.html ฯลฯ สร้างเอง
   เพื่อไม่ให้ initializeApp() ชนกัน (Firebase ไม่อนุญาตให้ initializeApp() ชื่อเดียวกันซ้ำ)
========================================================= */
async function getAuthInstance() {
    const { initializeApp, getApps, getApp } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
    const { getAuth } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");

    const app = getApps().some(a => a.name === "authApp")
        ? getApp("authApp")
        : initializeApp(firebaseConfig, "authApp");

    return getAuth(app);
}

async function firebaseSignIn(email, password) {
    const { signInWithEmailAndPassword } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
    const auth = await getAuthInstance();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

async function firebaseSignUp(email, password) {
    const { createUserWithEmailAndPassword } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
    const auth = await getAuthInstance();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
}

/* เพิ่มใหม่: ตั้งชื่อที่แสดงผล (displayName) ให้บัญชี Firebase Auth
   เพื่อให้ทุกครั้งที่ล็อกอินด้วยอีเมลนี้ ระบบดึงชื่อ-นามสกุลจริงกลับมาแสดงได้เสมอ
   ไม่ว่าจะล็อกอินจากเครื่องไหนก็ตาม (ชื่อผูกอยู่กับบัญชี ไม่ใช่ผูกกับเครื่องแบบเดิม) */
async function firebaseSetDisplayName(user, displayName) {
    const { updateProfile } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
    await updateProfile(user, { displayName });
}

/* ตรวจสอบว่าล็อกอินอยู่หรือไม่ */
function isLoggedIn() {
    return localStorage.getItem(LOGIN_KEY) === "true";
}

/* ชื่อ-นามสกุลเต็มที่แสดงผล */
function getFullName() {
    return (
        localStorage.getItem(FULL_NAME_KEY) ||
        localStorage.getItem(EMPLOYEE_KEY) ||
        sessionStorage.getItem(EMPLOYEE_KEY) ||
        localStorage.getItem(LEGACY_KEY) ||
        sessionStorage.getItem(LEGACY_KEY) ||
        ""
    );
}

/* คงชื่อฟังก์ชันเดิม getEmployeeName() ไว้ เพื่อให้หน้าอื่นในระบบ
   (index.html badge, form_product.html autofill, report.html filter ฯลฯ)
   เรียกใช้ได้เหมือนเดิมทุกประการโดยไม่ต้องแก้ไฟล์เหล่านั้นแม้แต่บรรทัดเดียว */
function getEmployeeName() {
    return getFullName();
}

/* เพิ่มใหม่: อีเมลของพนักงานที่ล็อกอินอยู่ (เผื่อหน้าไหนอยากใช้แสดงผล/ตรวจสอบ) */
function getEmployeeEmail() {
    return localStorage.getItem(EMAIL_KEY) || "";
}

/* บันทึกสถานะล็อกอินหลังสมัคร/เข้าสู่ระบบสำเร็จ (ใช้ร่วมกันทั้ง signupUser และ loginUser) */
function completeLogin(fullName, email, password) {
    localStorage.setItem(LOGIN_KEY, "true");
    localStorage.setItem(FULL_NAME_KEY, fullName);
    localStorage.setItem(EMAIL_KEY, email);

    /* เก็บคู่กับคีย์เดิมที่หน้าอื่นในระบบใช้อยู่แล้ว เพื่อไม่ต้องแก้ไฟล์อื่นเลย */
    localStorage.setItem(EMPLOYEE_KEY, fullName);
    sessionStorage.setItem(EMPLOYEE_KEY, fullName);
    localStorage.setItem(LEGACY_KEY, fullName);
    sessionStorage.setItem(LEGACY_KEY, fullName);

    /* เก็บรหัสผ่านไว้ในเครื่องนี้เท่านั้น เพื่อให้ requireLogin() ใช้เชื่อมต่อ
       Firestore อัตโนมัติทุกหน้าโดยไม่ต้องพิมพ์รหัสซ้ำ (ดูหมายเหตุด้านบนของไฟล์) */
    localStorage.setItem(SECRET_KEY, password);
}

/* สมัครสมาชิกใหม่ด้วย ชื่อ / นามสกุล / อีเมล / รหัสผ่าน (ต้องมีรหัสเชิญที่ถูกต้อง)
   คืนค่า true = สำเร็จ, false = ไม่สำเร็จ (ฟังก์ชันนี้ alert ข้อความเองให้แล้ว) */
async function signupUser(firstName, lastName, email, password, inviteCode) {

    if (!SIGNUP_ENABLED) {
        alert("ขณะนี้ปิดรับสมัครสมาชิกใหม่ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ");
        return false;
    }

    if (inviteCode !== INVITE_CODE) {
        alert("รหัสเชิญไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบเพื่อขอรหัสเชิญ");
        return false;
    }

    const first = normalizeName(firstName);
    const last = normalizeName(lastName);

    if (!first || !last) {
        alert("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
        return false;
    }

    const email_ = normalizeEmail(email);
    if (!isValidEmail(email_)) {
        alert("กรุณากรอกอีเมลให้ถูกต้อง");
        return false;
    }

    if (!password || password.length < 6) {
        alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return false;
    }

    const fullName = `${first} ${last}`;
    let user;

    try {
        user = await firebaseSignUp(email_, password);
        await firebaseSetDisplayName(user, fullName);
    } catch (err) {
        if (err && err.code === "auth/email-already-in-use") {
            alert("อีเมลนี้มีบัญชีอยู่แล้วในระบบ กรุณาเข้าสู่ระบบแทน");
        } else if (err && err.code === "auth/invalid-email") {
            alert("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        } else if (err && err.code === "auth/weak-password") {
            alert("รหัสผ่านไม่ปลอดภัยพอ กรุณาตั้งรหัสผ่านที่คาดเดายากขึ้น");
        } else {
            console.error("สมัครสมาชิกไม่สำเร็จ:", err);
            alert("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
        return false;
    }

    localStorage.setItem(FIRST_NAME_KEY, first);
    localStorage.setItem(LAST_NAME_KEY, last);

    completeLogin(fullName, email_, password);
    return true;
}

/* เข้าสู่ระบบด้วยอีเมล + รหัสผ่านของตัวเอง */
async function loginUser(email, password) {

    const email_ = normalizeEmail(email);
    if (!email_ || !password) {
        return false;
    }

    let user;
    try {
        user = await firebaseSignIn(email_, password);
    } catch (err) {
        console.error("เข้าสู่ระบบไม่สำเร็จ:", err);
        return false;
    }

    /* ดึงชื่อ-นามสกุลจริงที่ผูกไว้กับบัญชีตอนสมัคร (displayName)
       ถ้าไม่มี (เช่น บัญชีเก่าก่อนอัปเดตนี้ที่ยังไม่เคยตั้ง displayName)
       จะ fallback ไปใช้อีเมลแสดงแทนชั่วคราว แทนที่จะปล่อยว่างเปล่า */
    const fullName = user.displayName || email_;

    completeLogin(fullName, email_, password);
    return true;
}

/* เปลี่ยนรหัสผ่านของตัวเอง (ต้องล็อกอินอยู่ก่อน) */
async function changeMyPassword(newPassword) {

    if (!newPassword || newPassword.length < 6) {
        alert("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
        return false;
    }

    try {
        const { updatePassword } =
            await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
        const auth = await getAuthInstance();

        if (!auth.currentUser) {
            alert("กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน");
            return false;
        }

        await updatePassword(auth.currentUser, newPassword);
        localStorage.setItem(SECRET_KEY, newPassword);
        alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
        return true;

    } catch (err) {
        console.error("เปลี่ยนรหัสผ่านไม่สำเร็จ:", err);
        alert("เปลี่ยนรหัสผ่านไม่สำเร็จ: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
        return false;
    }
}

/* ออกจากระบบ: ล้างข้อมูลทั้งหมด แล้วพากลับไปหน้า login.html */
function logoutEmployee() {
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(FULL_NAME_KEY);
    localStorage.removeItem(FIRST_NAME_KEY);
    localStorage.removeItem(LAST_NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);

    localStorage.removeItem(EMPLOYEE_KEY);
    sessionStorage.removeItem(EMPLOYEE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(LEGACY_KEY);

    localStorage.removeItem(SECRET_KEY);

    window.location.href = "login.html";
}

/* เรียกใช้ต้นหน้าทุกหน้า (ยกเว้น login.html/signup.html) เพื่อบังคับให้ต้อง Login ก่อนใช้งาน
   ถ้ายังไม่ได้ Login -> redirect ไป login.html
   ถ้า Login แล้ว -> เชื่อมต่อ Firebase Auth ด้วยอีเมล+รหัสผ่านที่เก็บไว้ในเครื่อง (เงียบๆ ไม่บล็อกหน้าเว็บ)
   แล้วคืนค่า true ใช้งานหน้าได้ตามปกติ */
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return false;
    }

    const email = getEmployeeEmail();
    const secret = localStorage.getItem(SECRET_KEY);

    if (email && secret) {
        firebaseSignIn(email, secret).catch(err => {
            console.error("Firebase Auth เชื่อมต่อไม่สำเร็จ:", err);
        });
    }

    return true;
}

/* expose ให้ใช้งานได้ทุกหน้าแบบ global (เหมือนเดิมกับ window.saveRecord ใน script.js) */
window.isLoggedIn = isLoggedIn;
window.getFullName = getFullName;
window.getEmployeeName = getEmployeeName;
window.getEmployeeEmail = getEmployeeEmail;
window.signupUser = signupUser;
window.loginUser = loginUser;
window.changeMyPassword = changeMyPassword;
window.logoutEmployee = logoutEmployee;
window.requireLogin = requireLogin;
window.SIGNUP_ENABLED = SIGNUP_ENABLED;