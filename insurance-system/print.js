const data = JSON.parse(localStorage.getItem("selectedCustomer"));

if (data) {
    document.getElementById("company").innerText = data.company;
    document.getElementById("name").innerText = data.name;
    document.getElementById("address").innerText = data.address;

    document.getElementById("brand").innerText = data.brand;
    document.getElementById("plate").innerText = data.plate;
    document.getElementById("chassis").innerText = data.chassis;

    document.getElementById("start").innerText = data.start;
    document.getElementById("end").innerText = data.end;

    document.getElementById("sumInsured").innerText = Number(data.sumInsured).toLocaleString();
    document.getElementById("total").innerText = Number(data.total).toLocaleString();
    document.getElementById("installment").innerText = Number(data.installment).toLocaleString();
}