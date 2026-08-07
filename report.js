function openDocument(index) {
    let data = getData();
    let item = data[index];

    if (!item) return;

    localStorage.setItem("selectedCustomer", JSON.stringify(item));

    // ❌ เดิมมันพาไป contract_print เลย
    // location.href = "contract_print.html";

    // ✅ เปลี่ยนเป็นไปหน้าเลือกเอกสารก่อน
    location.href = "form_product.html";
}



