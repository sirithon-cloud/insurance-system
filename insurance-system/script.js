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

    renderTable(getData());
});

/* =========================
   STORAGE
========================= */
function getData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* บันทึกข้อมูลใหม่จากฟอร์ม (เรียกใช้ตอน submit) */
function saveRecord(record) {
    const data = getData();
    record.id = Date.now();
    record.createDate = new Date().toLocaleDateString("th-TH");
    data.push(record);
    saveData(data);
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
function deleteData(id) {
    if (!confirm("ต้องการลบข้อมูลนี้หรือไม่ ?")) return;

    let data = getData();
    data = data.filter(item => item.id !== id);

    saveData(data);
    renderTable(data);
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
                    <button onclick="deleteData(${item.id})">🗑</button>
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








