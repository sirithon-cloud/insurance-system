import { initializeApp } from "firebase/app";

import { 
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc
} from "firebase/firestore";


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

    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }

    getData();
});

let editingId = null;

/* =========================
   STORAGE
========================= */

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

            renderTable(data);

        }
    );

}



/* บันทึกข้อมูลใหม่จากฟอร์ม (เรียกใช้ตอน submit) */
async function saveRecord(record) {

    record.createDate = new Date().toLocaleDateString("th-TH");

    await addDoc(
        collection(db, "insuranceData"),
        record
    );

    alert("บันทึกข้อมูลเรียบร้อย");
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