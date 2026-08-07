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
   เพิ่มใหม่: ล็อกชื่อที่แสดงผลไว้กับอีเมล (ป้องกันพิมพ์ชื่อผิดตอน login)
   =========================================================
   เดิม: ผู้ใช้พิมพ์ "ชื่อ-นามสกุล" เองทุกครั้งที่ login (ช่องในหน้า login.html)
        ทำให้พิมพ์ผิด/สะกดไม่ตรงกันได้ในแต่ละครั้ง
   ใหม่: กำหนดชื่อที่ถูกต้องไว้ที่นี่ที่เดียว โดยผูกกับอีเมล (key ต้องเป็นตัวพิมพ์เล็กทั้งหมด)
        ถ้าอีเมลที่ login ตรงกับรายการนี้ ระบบจะใช้ชื่อจากตารางนี้เสมอ
        โดยไม่สนใจชื่อที่พิมพ์มาในฟอร์ม (ถ้ามี) เลย

   วิธีเพิ่ม/แก้พนักงานคนใหม่: เพิ่ม/แก้บรรทัดในนี้ตรงๆ ได้เลย
   หมายเหตุ: ค่านี้อยู่ในไฟล์ JS ฝั่ง client ใครก็เปิดดูโค้ดได้ จึงเหมาะกับ "ชื่อที่แสดงผล"
   เท่านั้น ไม่ใช่ข้อมูลลับ (รหัสผ่านยังคงเก็บ/ตรวจสอบผ่าน Firebase Authentication ตามปกติ) */
const EMAIL_TO_NAME = {
    "viriyah127551@gmail.com": "ณุพล วิทยาขาว",
    "viriyah127552@gmail.com": "อรุณลักษณ์ มหาจตุพัฒน์",
    "viriyah17277@gmail.com": "วิภาพร คำเฮ้า",
    "viriyah666@gmail.com": "รัชนก ผางโคกสูง",
    "viriyah888@gmail.com": "วรรณิภา วิเศษบุตร",
    "viriyah17275@gmail.com": "สุนิษา ยางไธสงค์",
    "viriyah14904@gmail.com": "เพ็ญพักตร์ ปลื้มใจ",
    "viriyah17276@gmail.com": "สุชาวดี ภิษุณี",
    "viriyah3333@gmail.com": "ไอลัดดา ดวงกุลสา",
    "viriyah111@gmail.com": "น้ำทิพย์ ใบลี",
    "viriyah14821@gmail.com": "ศิริธร สอนสอาด"
};

/* คืนชื่อที่ล็อกไว้สำหรับอีเมลนี้ (ถ้ามีในตาราง) ไม่มีก็คืนค่าว่าง */
function getLockedNameForEmail(email) {
    return EMAIL_TO_NAME[normalizeEmail(email)] || "";
}

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

/* =========================================================
   เพิ่มใหม่: ระบบแสดงสถานะ "กำลังใช้งานอยู่" (Presence)
   =========================================================
   หลักการ: ทุกหน้าที่เรียก requireLogin() สำเร็จ จะเริ่มส่ง "heartbeat"
   (บันทึกเวลาล่าสุดที่ยังเปิดหน้าอยู่) ไปที่ Firestore collection "activeUsers"
   ทุกๆ 25 วินาที โดยใช้อีเมลของผู้ใช้เป็น document id (คนเดียวกันจะมีเอกสารเดียว
   ไม่ว่าจะเปิดกี่แท็บ/กี่หน้าก็ตาม อัปเดตทับกันไปเรื่อยๆ)

   หน้า online_users.html จะอ่าน collection นี้แบบ realtime แล้วถือว่าใคร
   "ออนไลน์" อยู่ถ้าเวลาล่าสุด (lastActive) ไม่เกิน ~90 วินาทีที่ผ่านมา
   (ไม่มีกลไก "ออนไลน์/ออฟไลน์" แบบ Realtime Database ตรงๆ ใน Firestore
   จึงใช้วิธีนี้แทน ซึ่งเพียงพอสำหรับใช้งานจริง)

   เมื่อกด "ออกจากระบบ" จะลบเอกสารสถานะของตัวเองออกทันที (removePresence) */

const PRESENCE_COLLECTION = "activeUsers";
const PRESENCE_HEARTBEAT_MS = 25000; /* ส่งสถานะทุก 25 วินาที */

/* ชื่อหน้าภาษาไทย ใช้แสดงในหน้า "ผู้ใช้งานออนไลน์" ว่าใครอยู่หน้าไหน
   (ถ้าไม่มีชื่ออยู่ในตารางนี้ จะ fallback ไปใช้ชื่อไฟล์ตรงๆ แทน) */
const PRESENCE_PAGE_LABELS = {
    "index.html": "หน้าหลัก",
    "documents.html": "เมนูประกันสินค้า",
    "documents_v2.html": "เมนูประกันรถยนต์",
    "form_product.html": "ฟอร์มประกันสินค้า",
    "form_car.html": "ฟอร์มประกันรถยนต์",
    "account_menu.html": "บัญชี (สินค้า)",
    "account_menu_car.html": "บัญชี (รถยนต์)",
    "report.html": "รายงานประกันสินค้า",
    "report_v2.html": "รายงานประกันรถยนต์",
    "customer_debt.html": "ลูกหนี้",
    "customer_debt_product.html": "ลูกหนี้ประกันสินค้า",
    "customer_debt_car.html": "ลูกหนี้ประกันรถยนต์",
    "finance.html": "บันทึกการเงิน (สินค้า)",
    "finance_car.html": "บันทึกการเงิน (รถยนต์)",
    "revenue.html": "ผลงานพนักงาน / กราฟ",
    "contract_print.html": "พิมพ์เอกสาร (สินค้า)",
    "contract_print_car.html": "พิมพ์เอกสาร (รถยนต์)",
    "receipt_print.html": "ใบรับเงิน (สินค้า)",
    "receipt_print_car.html": "ใบรับเงิน (รถยนต์)",
    "product_account.html": "เลือกบริษัท (สินค้า)",
    "product_files.html": "เลือกบริษัท (สินค้า)",
    "form_car.html": "ฟอร์มประกันรถยนต์",
    "online_users.html": "ผู้ใช้งานออนไลน์"
};

function getPresencePageLabel() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf("/") + 1) || "index.html";
    return PRESENCE_PAGE_LABELS[file] || file;
}

/* ใช้ Firestore ร่วม app instance เดียวกับ "authApp" (ผูก service เพิ่มเข้าไปใน
   app เดิมได้ ไม่ต้องสร้าง Firebase app ใหม่ซ้อน) */
async function getPresenceDb() {
    const { initializeApp, getApps, getApp } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
    const { getFirestore } =
        await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");

    const app = getApps().some(a => a.name === "authApp")
        ? getApp("authApp")
        : initializeApp(firebaseConfig, "authApp");

    return getFirestore(app);
}

/* ส่งสถานะ "กำลังใช้งานอยู่" ของตัวเอง 1 ครั้ง (เรียกซ้ำเรื่อยๆ ผ่าน setInterval) */
async function updatePresence() {

    if (!isLoggedIn()) return;

    const email = getEmployeeEmail();
    const name = getEmployeeName();

    if (!email) return;

    try {
        const { doc, setDoc, serverTimestamp } =
            await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
        const db = await getPresenceDb();

        await setDoc(
            doc(db, PRESENCE_COLLECTION, normalizeEmail(email)),
            {
                name: name || email,
                email: normalizeEmail(email),
                page: getPresencePageLabel(),
                lastActive: serverTimestamp()
            },
            { merge: true }
        );
    } catch (err) {
        console.error("อัปเดตสถานะออนไลน์ไม่สำเร็จ:", err);
    }
}

let presenceHeartbeatStarted = false;

/* เริ่มส่ง heartbeat (เรียกจาก requireLogin() หลังยืนยันว่าล็อกอินอยู่แล้วเท่านั้น)
   ทำแค่ครั้งเดียวต่อการเปิดหน้า กันไม่ให้เกิด setInterval ซ้อนกันหลายตัว */
function startPresenceHeartbeat() {

    if (presenceHeartbeatStarted) return;
    presenceHeartbeatStarted = true;

    updatePresence();

    setInterval(updatePresence, PRESENCE_HEARTBEAT_MS);

    /* กลับมาเปิดแท็บอีกครั้งหลังสลับไปแท็บอื่น -> อัปเดตสถานะทันที ไม่ต้องรอครบรอบ */
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            updatePresence();
        }
    });
}

/* ลบสถานะออนไลน์ของตัวเองออกทันที (เรียกตอนกดออกจากระบบ) */
async function removePresence() {

    const email = getEmployeeEmail();
    if (!email) return;

    try {
        const { doc, deleteDoc } =
            await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
        const db = await getPresenceDb();

        await deleteDoc(doc(db, PRESENCE_COLLECTION, normalizeEmail(email)));
    } catch (err) {
        console.error("ลบสถานะออนไลน์ไม่สำเร็จ:", err);
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

    /* แก้ไข (สำคัญ - ล็อกชื่อไว้กับอีเมล): ถ้าอีเมลนี้มีอยู่ในตาราง EMAIL_TO_NAME
       ให้ใช้ชื่อจากตารางนั้นเสมอ ไม่สนใจชื่อที่พิมพ์มาในฟอร์ม (กันพิมพ์ผิด/สะกดไม่ตรงกัน)
       ถ้าอีเมลนี้ไม่มีในตาราง (เช่น พนักงานใหม่ที่ยังไม่ได้เพิ่มชื่อ) จึงค่อย fallback
       ไปใช้ชื่อที่พิมพ์มา/ displayName เดิม เหมือนพฤติกรรมเดิม */
    const lockedName = getLockedNameForEmail(email_);

    if (lockedName) {
        if (lockedName !== user.displayName) {
            firebaseSetDisplayName(user, lockedName).catch(err => {
                console.error("ตั้งชื่อที่แสดงผลไม่สำเร็จ:", err);
            });
        }
    } else if (typedName && typedName !== user.displayName) {
        firebaseSetDisplayName(user, typedName).catch(err => {
            console.error("ตั้งชื่อที่แสดงผลไม่สำเร็จ:", err);
        });
    }

    /* ดึงชื่อ-นามสกุลจริงที่ใช้แสดงผล
       ลำดับความสำคัญ: ชื่อที่ล็อกไว้กับอีเมล (ตาราง EMAIL_TO_NAME) > ชื่อที่เพิ่งกรอกมา
       > displayName เดิมที่มีอยู่แล้ว > อีเมล (fallback สุดท้าย) */
    const fullName = lockedName || typedName || user.displayName || email_;

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

    /* เพิ่มใหม่: ลบสถานะ "กำลังใช้งานอยู่" ของตัวเองออกทันที ไม่ให้ค้างเป็นออนไลน์
       ในหน้า online_users.html หลังจากออกจากระบบไปแล้ว (ไม่รอผลลัพธ์ ปล่อยให้ทำงานเบื้องหลัง) */
    removePresence();

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

    /* เพิ่มใหม่: เริ่มส่งสถานะ "กำลังใช้งานอยู่" ให้หน้า online_users.html เห็น
       ทำหลังยืนยันว่าล็อกอินจริงแล้วเท่านั้น */
    startPresenceHeartbeat();

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
window.getLockedNameForEmail = getLockedNameForEmail;
window.getLastUsedLoginName = getLastUsedLoginName;
window.changeMyPassword = changeMyPassword;
window.logoutEmployee = logoutEmployee;
window.requireLogin = requireLogin;
window.SIGNUP_ENABLED = SIGNUP_ENABLED;