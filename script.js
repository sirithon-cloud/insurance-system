import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { 
    getFirestore,
    collection,
    addDoc,
    setDoc,
    onSnapshot,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCNpaYlwrkJhBA-8tAax022PWWFYMRz7Kw",
  authDomain: "insurance-system-f26b0.firebaseapp.com",
  projectId: "insurance-system-f26b0",
  storageBucket: "insurance-system-f26b0.firebasestorage.app",
  messagingSenderId: "438698153100",
  appId: "1:438698153100:web:a553b97b59701883f057a9",
  measurementId: "G-XXWCQEMT0B"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

console.log("Firebase เชื่อมสำเร็จ", db);





const STORAGE_KEY = "insuranceData";

/* =========================
   SIDEBAR TOGGLE
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (menuBtn && sidebar && !overlay) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }

    // เปิด Firestore listener เฉพาะหน้าที่มีตาราง #tableBody จริงๆ เท่านั้น
    // (ตอนนี้ไม่มีหน้าไหนใช้ #tableBody แล้ว แต่กันไว้เผื่ออนาคตมีหน้าที่ใช้)
    if (document.getElementById("tableBody")) {
        getData();
    }
});

let editingId = null;

/* =========================
   STORAGE
========================= */

/* เพิ่มใหม่: helper แปลง createdAt (Firestore Timestamp) เป็นตัวเลข millisecond
   เพื่อใช้เรียงลำดับข้อมูลตามลำดับการบันทึกจริง (เก่า -> ใหม่)
   ข้อมูลเก่าที่ยังไม่มี field นี้ (บันทึกไว้ก่อนอัปเดตนี้) จะได้ค่า 0
   จึงถูกจัดให้อยู่ลำดับต้นๆ โดยอัตโนมัติ ไม่หายไปจากระบบ */
function getSortMillis(item) {
    if (item && item.createdAt && typeof item.createdAt.toMillis === "function") {
        return item.createdAt.toMillis();
    }
    return 0;
}

function getData() {

    onSnapshot(
        collection(db, "insuranceData"),
        (snapshot) => {

            let data = [];

            snapshot.forEach((doc) => {

                data.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            // เรียงตามลำดับการบันทึกจริง (เก่า -> ใหม่ อยู่ล่างสุด)
            data.sort((a, b) => getSortMillis(a) - getSortMillis(b));

            renderTable(data);

        }
    );

}



/* บันทึกข้อมูลใหม่จากฟอร์ม (เรียกใช้ตอน submit)
   - ถ้ามี record.id (แปลว่ากำลังแก้ไขข้อมูลเดิมที่มาจาก Firestore) -> อัปเดตเอกสารเดิมด้วย setDoc
     (ไม่แตะ createdAt เดิม เพราะไม่ได้ส่ง field นี้ไปใน fields ที่จะ merge)
   - ถ้าไม่มี record.id (ข้อมูลใหม่) -> สร้างเอกสารใหม่ด้วย addDoc พร้อมประทับเวลา createdAt
     (เพิ่มใหม่: ใช้ serverTimestamp() เพื่อให้ทุกหน้าจัดเรียงลำดับข้อมูลได้แม่นยำและเสถียรหลังรีเฟรช)
   ป้องกันปัญหาเดิมที่แก้ไขข้อมูลแล้วกลายเป็นสร้างซ้ำ */
async function saveRecord(record) {

    let savedId = record.id || null;

    if (record.id) {

        // แก้ไขข้อมูลเดิม: ไม่แตะ createDate / employeeName เดิม
        // (ไม่ได้ส่ง field เหล่านี้มาใน record ตั้งแต่ต้นแล้ว เพราะฝั่งฟอร์มไม่ใส่มาให้ตอนแก้ไข
        // และ merge:true จะอัปเดตเฉพาะ field ที่ส่งมาเท่านั้น ของเดิมใน Firestore จึงยังอยู่ครบ)
        const { id, ...fields } = record;

        await setDoc(
            doc(db, "insuranceData", id),
            fields,
            { merge: true }
        );

        savedId = id;

    } else {

        // บันทึกข้อมูลใหม่เท่านั้น: ประทับวันที่แจ้งงาน + เวลาบันทึกจริง
        record.createDate = new Date().toLocaleDateString("th-TH");
        record.createdAt = serverTimestamp();

        const docRef = await addDoc(
            collection(db, "insuranceData"),
            record
        );

        savedId = docRef.id;

    }

    alert("บันทึกข้อมูลเรียบร้อย");

    // เพิ่มใหม่: คืนค่า id ของเอกสารที่บันทึก/แก้ไขกลับไปให้หน้าฟอร์มใช้ต่อได้
    // (เช่น ตั้ง editingId อัตโนมัติหลังบันทึกครั้งแรก กันไม่ให้กดบันทึกซ้ำ/เปิดเอกสารซ้ำ
    // แล้วกลายเป็นสร้างรายการใหม่ซ้อนขึ้นมาอีกรายการ)
    return savedId;
}


/* เพิ่มใหม่: บันทึก/อัปเดตรายการ "การชำระเงิน" ลง collection กลาง "paymentRecords"
   (collection เดียวกับที่ finance.html แท็บ "รายงานการเงิน" อ่านอยู่ realtime อยู่แล้ว)
   ใช้รูปแบบเดียวกับ saveRecord() ด้านบน:
   - ถ้ามี record.id (เคยสร้างรายการนี้ไว้แล้ว) -> อัปเดตด้วย setDoc({merge:true})
     (ไม่แตะ checked/checkedBy/checkedAt เดิม เผื่อผู้จัดการเช็คไปแล้ว)
   - ถ้าไม่มี record.id (สร้างครั้งแรก) -> addDoc พร้อมตั้งค่าเริ่มต้น checked:false
   คืนค่า id ของเอกสารกลับไปให้หน้าที่เรียกใช้เก็บอ้างอิงไว้ (กันสร้างซ้ำ) */
async function savePaymentRecord(record) {

    let savedId = record.id || null;

    if (record.id) {

        const { id, ...fields } = record;

        await setDoc(
            doc(db, "paymentRecords", id),
            fields,
            { merge: true }
        );

        savedId = id;

    } else {

        record.checked = false;
        record.checkedBy = "";
        record.checkedAt = null;
        record.createdAt = serverTimestamp();

        const docRef = await addDoc(
            collection(db, "paymentRecords"),
            record
        );

        savedId = docRef.id;

    }

    return savedId;
}

/* =========================
   SAFE
========================= */
function safe(v) {
    return (v === undefined || v === null || v === "") ? "-" : v;
}

/* =========================
   DELETE
========================= */
async function deleteData(id) {

    if (!confirm("ต้องการลบข้อมูลนี้หรือไม่ ?")) return;

    await deleteDoc(
        doc(db, "insuranceData", id)
    );

    alert("ลบข้อมูลเรียบร้อย");
}

/* =========================
   TABLE
========================= */
function renderTable(data) {

    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach((item, i) => {

        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${safe(item.createDate)}</td>
                <td>${safe(item.company)}</td>
                <td>${safe(item.customer)}</td>
                <td>
                    <button onclick="deleteData('${item.id}')">🗑</button>
                </td>
            </tr>
        `;
    });
}

/* =========================
   PDF
========================= */
function exportPDF() {
    window.print();
}

/* เปิดหน้า print เอกสาร (เดิมชื่อ openPDF() ชนกับฟังก์ชันในหน้าฟอร์ม เลยเปลี่ยนชื่อ) */
function printContract() {
    window.open("contract_print.html", "_blank");
}

function openDocument(key){

    localStorage.setItem(
        "docKey",
        key
    );


    window.location.href =
    "contract_print.html";

}

/* ==============================
   โหลดข้อมูลสำหรับแก้ไข
   (แก้ไข: เดิมมี editData() ประกาศซ้ำ 2 ตัวในไฟล์นี้ ตัวหลังทับตัวแรก
   และตัวที่ใช้งานจริงเติมข้อมูลไม่ครบ — ไม่มี start, end, sumInsured,
   total, group, installment1-4 และไม่ได้ตั้งค่า editingId เลย
   รวมสองตัวเป็นตัวเดียว อ่านจาก "editData" ตามที่ report.html ตั้งค่าไว้
   และเติมค่าให้ครบทุกฟิลด์ พร้อมตั้ง editingId ให้ถูกต้อง) */
function editData(){

    const raw = localStorage.getItem("editData");

    if(!raw){

        alert("ไม่พบข้อมูลที่ต้องการแก้ไข");

        return;
    }


    const data = JSON.parse(raw);

    editingId = data.id;


    document.getElementById("company").value =
        data.company || "";


    document.getElementById("requestName").value =
        data.requestName || "";


    document.getElementById("name").value =
        data.customer || "";


    document.getElementById("phone").value =
        data.phone || "";


    document.getElementById("address").value =
        data.address || "";


    document.getElementById("brand").value =
        data.brand || "";


    document.getElementById("plate").value =
        data.plate || "";


    document.getElementById("chassis").value =
        data.chassis || "";


    document.getElementById("start").value =
        data.start || "";


    document.getElementById("end").value =
        data.end || "";


    document.getElementById("sumInsured").value =
        data.sumInsured || "";


    document.getElementById("total").value =
        data.total || "";


    document.getElementById("group").value =
        data.group || "";


    document.getElementById("installment1").value =
        data.installment1 || "";


    document.getElementById("installment2").value =
        data.installment2 || "";


    document.getElementById("installment3").value =
        data.installment3 || "";


    document.getElementById("installment4").value =
        data.installment4 || "";


    alert("โหลดข้อมูลเดิมแล้ว สามารถแก้ไขได้");

}

window.saveRecord = saveRecord;
window.savePaymentRecord = savePaymentRecord;
window.editData = editData;
window.deleteData = deleteData;