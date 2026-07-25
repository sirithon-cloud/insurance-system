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

   แก้ไขล่าสุด (สำคัญ - เรื่องความปลอดภัย):
   เดิมไฟล์นี้เก็บรหัสผ่านของผู้ใช้ไว้เป็น plaintext ใน localStorage (คีย์ employeeSecret)
   เพื่อใช้ re-login กับ Firebase Auth แบบเงียบๆ ทุกครั้งที่เปิดหน้าใหม่ (ดู requireLogin() เดิม)
   ซึ่งเป็นความเสี่ยงด้านความปลอดภัย เพราะใครก็ตามที่เข้าถึงเครื่อง/เบราว์เซอร์ของผู้ใช้ได้
   จะเห็นรหัสผ่านจริงตรงๆ ใน DevTools > Application > Local Storage ทันที

   ความจริงแล้วไม่จำเป็นต้องทำแบบนั้นเลย เพราะ Firebase Authentication SDK
   มีกลไก "persistence" ของตัวเองอยู่แล้ว (ค่าเริ่มต้นคือ browserLocalPersistence)
   ซึ่งจะเก็บ session token ไว้ใน IndexedDB ของเบราว์เซอร์โดยอัตโนมัติ และ "restore" ให้เอง
   ทุกครั้งที่เปิดหน้าเว็บใหม่ โดยไม่ต้อง sign-in ซ้ำด้วยอีเมล/รหัสผ่านเลย

   จึงตัดกลไกเก็บ/ใช้รหัสผ่านออกทั้งหมด (SECRET_KEY และทุกจุดที่เกี่ยวข้อง)
   ตอนนี้ requireLogin() แค่ตรวจ flag "login" (สำหรับ redirect ไปหน้า login.html ถ้ายังไม่เคยล็อกอิน)
   ส่วนการเชื่อมต่อ Firebase Auth จริงๆ ปล่อยให้ Firebase SDK จัดการ persist/restore เองทั้งหมด

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

/* แก้ไข: ลบ SECRET_KEY ออกแล้ว (เดิมใช้เก็บรหัสผ่าน plaintext ไว้ใน localStorage)
   ไม่จำเป็นต้องใช้อีกต่อไป เพราะ Firebase Auth persist session ให้เองอยู่แล้ว
   ดูหมายเหตุด้านบนของไฟล์ */

/* =========================================================
   ตั้งค่าได้ตามต้องการ
========================================================= */

/* เปิด/ปิดการรับสมัครพนักงานใหม่ (signup.html)
   ปิดได้ง่ายๆ โดยเปลี่ยนเป็น false เมื่อพนักงานสมัครครบทุกคนแล้ว
   ไม่ต้องลบหรือย้ายไฟล์ signup.html ออกจากเซิร์ฟเวอร์เลย */
const SIGNUP_ENABLED = false;

/* รหัสเชิญสำหรับสมัครสมาชิกใหม่เท่านั้น (ไม่ใช่รหัสผ่านสำหรับ login ประจำวัน)
   ใช้ครั้งเดียวตอนสมัคร ไม่ได้ถูกใช้ซ้ำทุกครั้งที่ล็อกอินเหมือนรหัสกลางเดิม
   เปลี่ยนค่านี้ได้ตลอดเวลาถ้าอยากหมุนเวียนรหัสเชิญใหม่ */
const INVITE_CODE = "";

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

/* ตั้งชื่อที่แสดงผล (displayName) ให้บัญชี Firebase Auth
   เพื่อให้ทุกครั้งที่ล็อกอินด้วยอีเมลนี้ ระบบดึงชื่อ-นามสกุลจริงกลับมาแสดงได้เสมอ
   ไม่ว่าจะล็อกอินจากเครื่องไหนก็ตาม (ชื่อผูกอยู่กับบัญชี ไม่ใช่ผูกกับเครื่องแบบเดิม) */
async function firebaseSetDisplayName(user, displayName) {
    const { updateProfile } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
    await updateProfile(user, { displayName });
}

/* เพิ่มใหม่: ออกจากระบบฝั่ง Firebase Auth จริงๆ (เดิมมีแค่ logoutEmployee() ที่ล้าง
   localStorage อย่างเดียว ไม่เคยสั่ง Firebase signOut() เลย ทำให้ session ฝั่ง Firebase
   ยังค้างอยู่ใน IndexedDB ต่อไปแม้จะ "ออกจากระบบ" ในหน้าเว็บไปแล้วก็ตาม) */
async function firebaseSignOut() {
    try {
        const { signOut } =
            await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
        const auth = await getAuthInstance();
        await signOut(auth);
    } catch (err) {
        console.error("Firebase signOut ไม่สำเร็จ:", err);
    }
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

/* อีเมลของพนักงานที่ล็อกอินอยู่ (เผื่อหน้าไหนอยากใช้แสดงผล/ตรวจสอบ) */
function getEmployeeEmail() {
    return localStorage.getItem(EMAIL_KEY) || "";
}

/* บันทึกสถานะล็อกอินหลังสมัคร/เข้าสู่ระบบสำเร็จ (ใช้ร่วมกันทั้ง signupUser และ loginUser)
   แก้ไข: เดิมรับพารามิเตอร์ password เพิ่มมาเพื่อเก็บลง SECRET_KEY ด้วย
   ตอนนี้ไม่เก็บรหัสผ่านที่ไหนอีกแล้ว จึงตัดพารามิเตอร์ password ออก */
function completeLogin(fullName, email) {
    localStorage.setItem(LOGIN_KEY, "true");
    localStorage.setItem(FULL_NAME_KEY, fullName);
    localStorage.setItem(EMAIL_KEY, email);

    /* เก็บคู่กับคีย์เดิมที่หน้าอื่นในระบบใช้อยู่แล้ว เพื่อไม่ต้องแก้ไฟล์อื่นเลย */
    localStorage.setItem(EMPLOYEE_KEY, fullName);
    sessionStorage.setItem(EMPLOYEE_KEY, fullName);
    localStorage.setItem(LEGACY_KEY, fullName);
    sessionStorage.setItem(LEGACY_KEY, fullName);
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

    completeLogin(fullName, email_);
    return true;
}

/* เข้าสู่ระบบด้วยอีเมล + รหัสผ่านของตัวเอง
   แก้ไข (สำคัญ): เพิ่มพารามิเตอร์ "name" (ชื่อ-นามสกุล) เพราะเดิมหลายบัญชี
   (โดยเฉพาะบัญชีที่สมัครมาก่อนมีระบบตั้ง displayName หรือบัญชีที่ไม่เคยตั้งชื่อไว้)
   จะไม่มี displayName เลย ทำให้ getEmployeeName()/"ชื่อผู้แจ้ง" fallback ไปใช้อีเมลแทนชื่อจริง
   ตอนนี้หน้า login.html มีช่องให้กรอกชื่อ-นามสกุลด้วย ถ้ากรอกมา (และไม่ตรงกับ
   displayName เดิม) จะตั้ง/อัปเดต displayName ของบัญชีนี้ให้ทันที เพื่อให้จำชื่อไว้
   ในบัญชีจริงถาวร ไม่ต้องพิมพ์ซ้ำทุกครั้งที่ล็อกอิน (ไม่ await เพื่อไม่ให้ล็อกอินช้าลง) */
async function loginUser(email, password, name) {

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

    const typedName = normalizeName(name);

    if (typedName && typedName !== user.displayName) {
        firebaseSetDisplayName(user, typedName).catch(err => {
            console.error("ตั้งชื่อที่แสดงผลไม่สำเร็จ:", err);
        });
    }

    /* ดึงชื่อ-นามสกุลจริงที่ผูกไว้กับบัญชี (displayName)
       ลำดับความสำคัญ: ชื่อที่เพิ่งกรอกมา > displayName เดิมที่มีอยู่แล้ว > อีเมล (fallback สุดท้าย) */
    const fullName = typedName || user.displayName || email_;

    completeLogin(fullName, email_);

    /* เพิ่มใหม่: จำชื่อไว้คู่กับอีเมลนี้ใน localStorage ของเครื่องนี้
       เพื่อ auto-fill ช่องชื่อในหน้า login.html ให้อัตโนมัติในครั้งถัดไป */
    try {
        const savedNames = JSON.parse(localStorage.getItem("savedLoginNames") || "{}");
        savedNames[email_] = fullName;
        localStorage.setItem("savedLoginNames", JSON.stringify(savedNames));
    } catch (e) {
        /* localStorage ใช้งานไม่ได้ ข้ามไป ไม่กระทบการล็อกอินหลัก */
    }

    /* เพิ่มใหม่: จำ "ชื่อล่าสุดที่กรอกสำเร็จ" แยกไว้อีกชุดหนึ่ง (ไม่ผูกกับอีเมล)
       เพราะในหน้า login.html ช่องชื่ออยู่ก่อนช่องอีเมล ผู้ใช้อาจคลิกช่องชื่อ
       ก่อนที่จะพิมพ์อีเมลเลยด้วยซ้ำ จึงต้องมีค่าที่เติมให้ได้ทันทีโดยไม่ต้องรออีเมล */
    try {
        localStorage.setItem("lastLoginName", fullName);
    } catch (e) {
        /* localStorage ใช้งานไม่ได้ ข้ามไป ไม่กระทบการล็อกอินหลัก */
    }

    return true;
}

/* เพิ่มใหม่: ดึงชื่อที่เคยบันทึกไว้คู่กับอีเมลนี้ (ใช้ auto-fill ช่องชื่อในหน้า login.html
   หลังจากพิมพ์/ทราบอีเมลแล้ว ให้ผลแม่นยำกว่า getLastUsedLoginName เพราะผูกกับอีเมลจริง) */
function getSavedNameForEmail(email) {
    try {
        const savedNames = JSON.parse(localStorage.getItem("savedLoginNames") || "{}");
        return savedNames[normalizeEmail(email)] || "";
    } catch (e) {
        return "";
    }
}

/* เพิ่มใหม่: ดึงชื่อล่าสุดที่เคยกรอกสำเร็จ (ไม่สนอีเมล) ใช้ตอนคลิก/โฟกัสช่องชื่อ
   ในหน้า login.html เพื่อเติมให้ทันทีก่อนที่จะรู้อีเมลด้วยซ้ำ */
function getLastUsedLoginName() {
    try {
        return localStorage.getItem("lastLoginName") || "";
    } catch (e) {
        return "";
    }
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
        /* แก้ไข: เดิมมีบรรทัด localStorage.setItem(SECRET_KEY, newPassword) ตรงนี้
           เพื่ออัปเดตรหัสผ่านที่เก็บไว้ในเครื่อง ตอนนี้ไม่เก็บรหัสผ่านที่ไหนแล้ว จึงตัดออก
           Firebase Auth จะจัดการ session ให้เองอยู่แล้วหลังเปลี่ยนรหัสผ่านสำเร็จ */
        alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
        return true;

    } catch (err) {
        console.error("เปลี่ยนรหัสผ่านไม่สำเร็จ:", err);
        alert("เปลี่ยนรหัสผ่านไม่สำเร็จ: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
        return false;
    }
}

/* ออกจากระบบ: ล้างข้อมูลทั้งหมด + สั่ง Firebase signOut() จริง แล้วพากลับไปหน้า login.html */
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

    /* เพิ่มใหม่: สั่ง Firebase signOut() จริง เพื่อเคลียร์ session ที่ Firebase persist ไว้เองด้วย
       (ไม่รอผลลัพธ์ ปล่อยให้ทำงานเบื้องหลัง เพื่อไม่ให้การออกจากระบบดูช้าลง) */
    firebaseSignOut();

    window.location.href = "login.html";
}

/* เรียกใช้ต้นหน้าทุกหน้า (ยกเว้น login.html/signup.html) เพื่อบังคับให้ต้อง Login ก่อนใช้งาน
   ถ้ายังไม่ได้ Login -> redirect ไป login.html
   ถ้า Login แล้ว -> คืนค่า true ใช้งานหน้าได้ตามปกติ

   แก้ไข (สำคัญ): เดิมฟังก์ชันนี้เรียก firebaseSignIn(email, secret) แบบเงียบๆ ทุกครั้ง
   โดยดึงรหัสผ่านที่เก็บ plaintext ไว้ใน localStorage (SECRET_KEY) มาใช้ ซึ่งเป็นความเสี่ยง
   ด้านความปลอดภัย ตอนนี้ไม่ทำแบบนั้นแล้ว เพราะ Firebase Auth SDK persist session ของตัวเอง
   ไว้ใน IndexedDB อยู่แล้ว (ค่าเริ่มต้น browserLocalPersistence) และจะ restore ให้อัตโนมัติ
   ทุกครั้งที่หน้าเว็บโหลด initializeApp()/getAuth() โดยไม่ต้อง sign-in ซ้ำด้วยรหัสผ่านเลย
   ฟังก์ชันนี้จึงเหลือหน้าที่แค่ตรวจ flag "login" สำหรับ redirect เท่านั้น */
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return false;
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
window.getSavedNameForEmail = getSavedNameForEmail;
window.getLastUsedLoginName = getLastUsedLoginName;
window.changeMyPassword = changeMyPassword;
window.logoutEmployee = logoutEmployee;
window.requireLogin = requireLogin;
window.SIGNUP_ENABLED = SIGNUP_ENABLED;