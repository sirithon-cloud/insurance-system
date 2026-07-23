/* =========================================================
   auth.js
   ระบบ Login แบบง่าย: ชื่อ-นามสกุล (ช่องเดียว) + รหัสผ่านกลาง
   (ไม่มีฐานข้อมูล/Firebase ผูกกับระบบ Login นี้)

   - login = true   -> สถานะว่าล็อกอินอยู่หรือไม่
   - fullName       -> ชื่อ-นามสกุลที่กรอกตอน Login (ใช้แสดงว่าใครกำลังใช้งาน ไม่ตรวจสอบความถูกต้อง)
   - รหัสผ่านกลาง (MASTER_PASSWORD) ใช้ตรวจตอน Login เท่านั้น ไม่ถูกบันทึกเก็บไว้ที่ไหนทั้งสิ้น

   หมายเหตุความเข้ากันได้กับระบบเดิม (สำคัญมาก ห้ามลบ):
   หน้าอื่นในระบบ (index.html, form_product.html, form_car.html, report.html ฯลฯ)
   เดิมใช้คีย์ "employeeName" / "currentUser" ผ่านฟังก์ชัน getEmployeeName() อยู่แล้ว
   ไฟล์นี้ยังคงเขียนคีย์เดิมทั้งสองไว้คู่กันเสมอ (ค่าคือ fullName ที่กรอกตอน Login)
   เพื่อไม่ให้ต้องแก้ไฟล์อื่นเลยแม้แต่บรรทัดเดียว
========================================================= */

const LOGIN_KEY = "login";
const FULL_NAME_KEY = "fullName";

/* คีย์เดิมที่ระบบอื่นใช้อ่านชื่อผู้ใช้งานอยู่แล้ว (คงไว้เพื่อความเข้ากันได้) */
const EMPLOYEE_KEY = "employeeName";
const LEGACY_KEY = "currentUser";

/* รหัสผ่านกลางเพียงรหัสเดียวของระบบ */
const MASTER_PASSWORD = "ploy0889798000";

/* ตรวจสอบว่าล็อกอินอยู่หรือไม่ */
function isLoggedIn() {
    return localStorage.getItem(LOGIN_KEY) === "true";
}

/* ชื่อ-นามสกุลเต็มที่กรอกตอน Login */
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

/* ตรวจรหัสผ่านกับรหัสผ่านกลาง */
function checkPassword(password) {
    return password === MASTER_PASSWORD;
}

/* เข้าสู่ระบบ:
   - ตรวจรหัสผ่านก่อนเสมอ ถ้าผิดคืนค่า false ทันที (ไม่บันทึกอะไรเลย)
   - ถ้าถูก บันทึกเฉพาะ login=true, fullName เท่านั้น (ห้ามเก็บรหัสผ่าน) */
function loginUser(fullName, password) {

    if (!checkPassword(password)) {
        return false;
    }

    fullName = String(fullName || "").trim();

    if (!fullName) {
        return false;
    }

    localStorage.setItem(LOGIN_KEY, "true");
    localStorage.setItem(FULL_NAME_KEY, fullName);

    /* เก็บคู่กับคีย์เดิมที่หน้าอื่นในระบบใช้อยู่แล้ว เพื่อไม่ต้องแก้ไฟล์อื่นเลย */
    localStorage.setItem(EMPLOYEE_KEY, fullName);
    sessionStorage.setItem(EMPLOYEE_KEY, fullName);
    localStorage.setItem(LEGACY_KEY, fullName);
    sessionStorage.setItem(LEGACY_KEY, fullName);

    return true;
}

/* ออกจากระบบ: ล้างข้อมูลทั้งหมด แล้วพากลับไปหน้า login.html */
function logoutEmployee() {
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(FULL_NAME_KEY);

    localStorage.removeItem(EMPLOYEE_KEY);
    sessionStorage.removeItem(EMPLOYEE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(LEGACY_KEY);

    window.location.href = "login.html";
}

/* เรียกใช้ต้นหน้าทุกหน้า (ยกเว้น login.html) เพื่อบังคับให้ต้อง Login ก่อนใช้งาน
   ถ้ายังไม่ได้ Login -> redirect ไป login.html
   ถ้า Login แล้ว -> คืนค่า true ใช้งานหน้าได้ตามปกติ */
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
window.checkPassword = checkPassword;
window.loginUser = loginUser;
window.logoutEmployee = logoutEmployee;
window.requireLogin = requireLogin;