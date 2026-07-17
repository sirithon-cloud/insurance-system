/* =========================================================
   auth.js
   ระบบ Login แบบง่าย (ไม่มี Username / Password)
   ให้ผู้ใช้งานกรอก "ชื่อพนักงานผู้แจ้งงาน" ก่อนเข้าใช้งาน

   ไฟล์นี้เป็นไฟล์ใหม่ทั้งหมด ไม่แตะไฟล์ / ตัวแปรเดิมของระบบ
   ใช้ <script src="auth.js"></script> (ไม่ใช่ type="module")
   เพื่อให้ทุกหน้าเรียกใช้ฟังก์ชันเหล่านี้ผ่าน window ได้ทันที
   (เหมือนกับที่ script.js เดิม expose window.saveRecord ไว้)
========================================================= */

/* คีย์ที่ใช้เก็บชื่อพนักงาน
   หมายเหตุ: ระบบเดิม (login.html / form_product.html) เคยใช้คีย์ "currentUser"
   อยู่แล้วสำหรับเติมชื่อลงช่อง "ผู้แจ้ง" อัตโนมัติ
   เพื่อไม่ให้ของเดิมพัง เราจะเก็บค่าไว้ทั้งสองคีย์คู่กันเสมอ
   (employeeName = คีย์ใหม่ตามที่ระบุ, currentUser = คีย์เดิมที่ของเก่าอ้างถึง) */
const EMPLOYEE_KEY = "employeeName";
const LEGACY_KEY = "currentUser";

/* ดึงชื่อพนักงานที่ล็อกอินอยู่
   เช็คหลายแหล่งเผื่อกรณีเบราว์เซอร์/แท็บถูกล้าง sessionStorage แต่ localStorage ยังอยู่ (หรือกลับกัน)
   และรองรับของเดิมที่เคยเก็บไว้ในคีย์ currentUser */
function getEmployeeName() {
    return (
        localStorage.getItem(EMPLOYEE_KEY) ||
        sessionStorage.getItem(EMPLOYEE_KEY) ||
        localStorage.getItem(LEGACY_KEY) ||
        sessionStorage.getItem(LEGACY_KEY) ||
        ""
    );
}

/* บันทึกชื่อพนักงาน (เรียกตอนกด "เข้าสู่ระบบ" ในหน้า login.html) */
function setEmployeeName(name) {
    if (!name) return;

    name = String(name).trim();

    localStorage.setItem(EMPLOYEE_KEY, name);
    sessionStorage.setItem(EMPLOYEE_KEY, name);

    // เก็บคู่กับคีย์เดิม เพื่อให้โค้ดเดิม (เช่น form_product.html ที่อ่าน currentUser
    // มาเติมช่อง "ผู้แจ้ง" อัตโนมัติ) ยังทำงานเหมือนเดิมทุกประการ
    localStorage.setItem(LEGACY_KEY, name);
    sessionStorage.setItem(LEGACY_KEY, name);
}

/* ออกจากระบบ: ล้างชื่อพนักงานทั้งสองคีย์ แล้วพากลับไปหน้า login */
function logoutEmployee() {
    localStorage.removeItem(EMPLOYEE_KEY);
    sessionStorage.removeItem(EMPLOYEE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(LEGACY_KEY);

    window.location.href = "login.html";
}

/* เรียกใช้ต้นหน้า (เช่น index.html) เพื่อบังคับให้ต้องล็อกอินก่อนใช้งาน
   ถ้ายังไม่มีชื่อพนักงาน จะ redirect ไป login.html ทันที
   คืนค่า true/false เผื่อหน้าที่เรียกอยากรู้สถานะ */
function requireLogin() {
    const name = getEmployeeName();

    if (!name) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// expose ให้ใช้งานได้ทุกหน้าแบบ global (เหมือน window.saveRecord ในไฟล์ script.js เดิม)
window.getEmployeeName = getEmployeeName;
window.setEmployeeName = setEmployeeName;
window.logoutEmployee = logoutEmployee;
window.requireLogin = requireLogin;