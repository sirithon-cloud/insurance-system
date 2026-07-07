// ===============================
// DATABASE
// ===============================

// ดึงข้อมูลทั้งหมด
function getCustomers() {
    return JSON.parse(localStorage.getItem("customers")) || [];
}

// บันทึกข้อมูลทั้งหมด
function saveCustomers(data) {
    localStorage.setItem("customers", JSON.stringify(data));
}

// เพิ่มลูกค้า
function addCustomer(customer) {

    let customers = getCustomers();

    customer.id = Date.now();

    customers.push(customer);

    saveCustomers(customers);

}

// ค้นหาจาก id
function getCustomerById(id) {

    let customers = getCustomers();

    return customers.find(c => c.id == id);

}