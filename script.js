/* =========================================================
   DIGITAL KHATA
   Complete JavaScript
========================================================= */


/* ================= STORAGE ================= */

const STORAGE = {
    customers: "khata_customers",
    transactions: "khata_transactions",
    products: "khata_products",
    sales: "khata_sales"
};

let customers = loadData(STORAGE.customers);
let transactions = loadData(STORAGE.transactions);
let products = loadData(STORAGE.products);
let sales = loadData(STORAGE.sales);

let saleItems = [];

let currentSlipId = null;
let currentSaleReceiptId = null;
let currentKhataCustomerId = null;
let editingProductId = null;


/* ================= BASIC HELPERS ================= */

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId(prefix = "ID") {
    return prefix + "-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substring(2, 7);
}

function formatMoney(amount) {
    return "Rs. " + Number(amount || 0).toLocaleString("en-PK", {
        maximumFractionDigits: 2
    });
}

function todayISO() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date + "T00:00:00");

    if (isNaN(d.getTime())) {
        return date;
    }

    return d.toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ================= IMAGE COMPRESSION ================= */

function readAndResizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {

    return new Promise((resolve, reject) => {

        if (!file) {
            resolve("");
            return;
        }

        if (!file.type.startsWith("image/")) {
            reject(new Error("Please select an image."));
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {

            const img = new Image();

            img.onload = function() {

                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {

                    const ratio = Math.min(
                        maxWidth / width,
                        maxHeight / height
                    );

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");

                ctx.drawImage(img, 0, 0, width, height);

                const compressed =
                    canvas.toDataURL("image/jpeg", quality);

                resolve(compressed);
            };

            img.onerror = reject;

            img.src = event.target.result;
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}


/* ================= TOAST ================= */

let toastTimer;

function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


/* ================= NAVIGATION ================= */

function showPage(pageId, button = null) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    const titles = {
        dashboard: ["Dashboard", "Manage your business easily"],
        customers: ["Customers / Parties", "Manage customer and party accounts"],
        transactions: ["Khata / Transactions", "Manage Lena and Dena entries"],
        products: ["Products & Stock", "Manage products and stock"],
        sales: ["Sales", "Create sales and generate receipts"],
        reports: ["Reports", "Business summary"]
    };

    if (titles[pageId]) {

        document.getElementById("pageTitle").textContent =
            titles[pageId][0];

        document.getElementById("pageSubtitle").textContent =
            titles[pageId][1];
    }

    document.getElementById("sidebar").classList.remove("open");

    refreshAll();
}

function showPageById(pageId) {

    const button =
        [...document.querySelectorAll(".nav-item")]
        .find(btn => btn.getAttribute("onclick")?.includes(`'${pageId}'`));

    showPage(pageId, button);
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}


/* ================= MODALS ================= */

function openModal(id) {
    document.getElementById(id).classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

window.addEventListener("click", function(event) {

    if (event.target.classList.contains("modal")) {
        event.target.classList.remove("show");
    }

});


/* ================= CURRENT DATE ================= */

function updateDate() {

    const el = document.getElementById("currentDate");

    if (!el) return;

    el.textContent = new Date().toLocaleDateString("en-PK", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


/* =========================================================
   CUSTOMERS
========================================================= */

function openCustomerModal() {

    document.getElementById("customerForm").reset();

    openModal("customerModal");
}

document.getElementById("customerForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const customer = {

            id: generateId("CUS"),

            name:
                document.getElementById("customerName").value.trim(),

            phone:
                document.getElementById("customerPhone").value.trim(),

            address:
                document.getElementById("customerAddress").value.trim(),

            notes:
                document.getElementById("customerNotes").value.trim(),

            createdAt: new Date().toISOString()

        };

        customers.push(customer);

        saveData(STORAGE.customers, customers);

        closeModal("customerModal");

        renderCustomers();
        updateDashboard();

        showToast("Customer added successfully");
    });


function getCustomer(id) {
    return customers.find(c => c.id === id);
}


function getCustomerBalance(customerId) {

    let lena = 0;
    let dena = 0;

    transactions
        .filter(t => t.customerId === customerId)
        .forEach(t => {

            if (t.type === "lena") {
                lena += Number(t.amount);
            } else {
                dena += Number(t.amount);
            }

        });

    return {
        lena,
        dena,
        balance: lena - dena
    };
}


function renderCustomers() {

    const tbody =
        document.getElementById("customersTable");

    const search =
        document.getElementById("customerSearch")
            .value
            .toLowerCase()
            .trim();

    let list = customers;

    if (search) {

        list = customers.filter(customer =>
            customer.name.toLowerCase().includes(search) ||
            customer.phone.toLowerCase().includes(search)
        );
    }

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No customers found
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = list.map(customer => {

        const balance = getCustomerBalance(customer.id);

        const balanceClass =
            balance.balance > 0
                ? "lena"
                : balance.balance < 0
                    ? "dena"
                    : "";

        return `

            <tr>

                <td>
                    <strong>${escapeHTML(customer.name)}</strong>
                    ${customer.address
                        ? `<small style="display:block;color:#94a3b8">
                            ${escapeHTML(customer.address)}
                           </small>`
                        : ""}
                </td>

                <td>${escapeHTML(customer.phone || "-")}</td>

                <td style="color:#16a34a;font-weight:bold">
                    ${formatMoney(balance.lena)}
                </td>

                <td style="color:#dc2626;font-weight:bold">
                    ${formatMoney(balance.dena)}
                </td>

                <td>
                    <span class="badge ${balanceClass}">
                        ${formatMoney(Math.abs(balance.balance))}
                        ${balance.balance > 0
                            ? " Lena"
                            : balance.balance < 0
                                ? " Dena"
                                : ""}
                    </span>
                </td>

                <td>

                    <div class="action-buttons">

                        <button class="icon-btn blue"
                                title="View Khata"
                                onclick="viewCustomerKhata('${customer.id}')">
                            <i class="fa-solid fa-book"></i>
                        </button>

                        ${customer.phone
                            ? `
                            <button class="icon-btn green"
                                    title="WhatsApp"
                                    onclick="whatsappCustomer('${customer.id}')">
                                <i class="fa-brands fa-whatsapp"></i>
                            </button>
                            `
                            : ""}

                        <button class="icon-btn red"
                                title="Delete"
                                onclick="deleteCustomer('${customer.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}


function deleteCustomer(id) {

    const customer = getCustomer(id);

    if (!customer) return;

    if (!confirm(
        `Delete ${customer.name}?\n\nTransactions will also be removed.`
    )) return;

    customers =
        customers.filter(c => c.id !== id);

    transactions =
        transactions.filter(t => t.customerId !== id);

    saveData(STORAGE.customers, customers);
    saveData(STORAGE.transactions, transactions);

    refreshAll();

    showToast("Customer deleted");
}


/* =========================================================
   WHATSAPP HELPERS
========================================================= */

function cleanPhone(phone) {

    let value = String(phone || "")
        .replace(/\D/g, "");

    if (value.startsWith("0")) {
        value = "92" + value.substring(1);
    }

    if (value.startsWith("92")) {
        return value;
    }

    return value;
}


function openWhatsApp(phone, message) {

    const number = cleanPhone(phone);

    if (!number) {
        showToast("Customer WhatsApp number is missing");
        return;
    }

    const url =
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
}


function whatsappCustomer(customerId) {

    const customer = getCustomer(customerId);

    if (!customer) return;

    const balance = getCustomerBalance(customerId);

    let status = "Balance Clear";

    if (balance.balance > 0) {
        status = `Lena: ${formatMoney(balance.balance)}`;
    }

    if (balance.balance < 0) {
        status = `Dena: ${formatMoney(Math.abs(balance.balance))}`;
    }

    const message = `Digital Khata

Customer: ${customer.name}

Total Lena: ${formatMoney(balance.lena)}
Total Dena: ${formatMoney(balance.dena)}

Current Balance:
${status}

Thank you.`;

    openWhatsApp(customer.phone, message);
}


/* =========================================================
   TRANSACTIONS
========================================================= */

function fillCustomerSelect(selectId, includeEmpty = false) {

    const select = document.getElementById(selectId);

    if (!select) return;

    let html = "";

    if (includeEmpty) {
        html += `<option value="">Walk-in / No Customer</option>`;
    } else {
        html += `<option value="">Select Customer</option>`;
    }

    customers.forEach(customer => {

        html += `
            <option value="${customer.id}">
                ${escapeHTML(customer.name)}
                ${customer.phone
                    ? " - " + escapeHTML(customer.phone)
                    : ""}
            </option>
        `;
    });

    select.innerHTML = html;
}


function openTransactionModal() {

    fillCustomerSelect("transactionCustomer");

    document.getElementById("transactionForm").reset();

    document.getElementById("transactionDate").value =
        todayISO();

    document.getElementById("transactionScreenshotPreview")
        .innerHTML = "";

    openModal("transactionModal");
}


document.getElementById("transactionScreenshot")
    .addEventListener("change", async function() {

        const file = this.files[0];

        const preview =
            document.getElementById("transactionScreenshotPreview");

        preview.innerHTML = "";

        if (!file) return;

        try {

            const image =
                await readAndResizeImage(file, 700, 700, .70);

            preview.innerHTML =
                `<img src="${image}"
                       class="preview-image"
                       alt="Screenshot Preview">`;

        } catch (error) {

            showToast("Could not read image");
        }

    });


document.getElementById("transactionForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const customerId =
            document.getElementById("transactionCustomer").value;

        const amount =
            Number(document.getElementById("transactionAmount").value);

        if (!customerId) {
            showToast("Please select customer");
            return;
        }

        if (amount <= 0) {
            showToast("Please enter valid amount");
            return;
        }


        let screenshot = "";

        const file =
            document.getElementById("transactionScreenshot").files[0];

        if (file) {

            try {

                screenshot =
                    await readAndResizeImage(
                        file,
                        700,
                        700,
                        .70
                    );

            } catch (error) {

                showToast("Screenshot could not be saved");
                return;
            }
        }


        const type =
            document.getElementById("transactionType").value;


        const transaction = {

            id: generateId("TRX"),

            slipNo:
                generateSlipNumber(type),

            customerId,

            type,

            amount,

            date:
                document.getElementById("transactionDate").value,

            product:
                document.getElementById("transactionProduct").value.trim(),

            note:
                document.getElementById("transactionNote").value.trim(),

            screenshot,

            createdAt:
                new Date().toISOString()

        };


        transactions.unshift(transaction);

        saveData(STORAGE.transactions, transactions);

        closeModal("transactionModal");

        refreshAll();

        showToast(
            `${type === "lena" ? "Lena" : "Dena"} saved successfully`
        );

        setTimeout(() => {
            openTransactionSlip(transaction.id);
        }, 250);

    });


function generateSlipNumber(type) {

    const prefix =
        type === "lena" ? "LENA" : "DENA";

    const count =
        transactions.filter(t => t.type === type).length + 1;

    return `${prefix}-${String(count).padStart(4, "0")}`;
}


function renderTransactions() {

    const tbody =
        document.getElementById("transactionsTable");

    const search =
        document.getElementById("transactionSearch")
            .value
            .toLowerCase()
            .trim();

    const filter =
        document.getElementById("transactionFilter").value;


    let list = [...transactions];


    if (filter !== "all") {

        list =
            list.filter(t => t.type === filter);
    }


    if (search) {

        list = list.filter(t => {

            const customer = getCustomer(t.customerId);

            return (
                (customer?.name || "")
                    .toLowerCase()
                    .includes(search)
                ||
                (t.product || "")
                    .toLowerCase()
                    .includes(search)
                ||
                (t.slipNo || "")
                    .toLowerCase()
                    .includes(search)
            );
        });
    }


    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No transactions found
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = list.map(t => {

        const customer = getCustomer(t.customerId);

        return `
            <tr>

                <td>
                    <strong>${escapeHTML(t.slipNo)}</strong>
                </td>

                <td>${formatDate(t.date)}</td>

                <td>
                    ${escapeHTML(customer?.name || "Unknown")}
                </td>

                <td>
                    <span class="badge ${t.type}">
                        ${t.type === "lena" ? "Lena" : "Dena"}
                    </span>
                </td>

                <td>
                    ${escapeHTML(t.product || "-")}
                </td>

                <td>
                    <strong style="color:${
                        t.type === "lena"
                            ? "#16a34a"
                            : "#dc2626"
                    }">
                        ${formatMoney(t.amount)}
                    </strong>
                </td>

                <td>

                    ${t.screenshot
                        ? `
                        <button class="icon-btn blue"
                                title="View Screenshot"
                                onclick="viewTransactionScreenshot('${t.id}')">
                            <i class="fa-solid fa-image"></i>
                        </button>
                        `
                        : `<span style="color:#94a3b8">-</span>`
                    }

                </td>

                <td>

                    <div class="action-buttons">

                        <button class="icon-btn blue"
                                title="View Slip"
                                onclick="openTransactionSlip('${t.id}')">
                            <i class="fa-solid fa-file-invoice"></i>
                        </button>

                        ${customer?.phone
                            ? `
                            <button class="icon-btn green"
                                    title="WhatsApp Slip"
                                    onclick="whatsappTransaction('${t.id}')">
                                <i class="fa-brands fa-whatsapp"></i>
                            </button>
                            `
                            : ""}

                        <button class="icon-btn red"
                                title="Delete"
                                onclick="deleteTransaction('${t.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}


function deleteTransaction(id) {

    const transaction =
        transactions.find(t => t.id === id);

    if (!transaction) return;

    if (!confirm("Delete this transaction?")) return;

    transactions =
        transactions.filter(t => t.id !== id);

    saveData(STORAGE.transactions, transactions);

    refreshAll();

    showToast("Transaction deleted");
}


/* =========================================================
   KHATA DETAIL
========================================================= */

function viewCustomerKhata(customerId) {

    const customer = getCustomer(customerId);

    if (!customer) return;

    currentKhataCustomerId = customerId;

    const balance =
        getCustomerBalance(customerId);

    document.getElementById("khataCustomerName").textContent =
        customer.name;

    document.getElementById("khataCustomerPhone").textContent =
        customer.phone || "No phone number";

    document.getElementById("khataLena").textContent =
        formatMoney(balance.lena);

    document.getElementById("khataDena").textContent =
        formatMoney(balance.dena);

    document.getElementById("khataBalance").textContent =
        formatMoney(Math.abs(balance.balance)) +
        (
            balance.balance > 0
                ? " Lena"
                : balance.balance < 0
                    ? " Dena"
                    : " Clear"
        );


    const list =
        transactions
            .filter(t => t.customerId === customerId)
            .sort((a,b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
            );


    const tbody =
        document.getElementById("khataTransactions");


    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No transactions found
                </td>
            </tr>
        `;

    } else {

        tbody.innerHTML =
            list.map(t => {

                return `
                    <tr>

                        <td>
                            <strong>${escapeHTML(t.slipNo)}</strong>
                        </td>

                        <td>${formatDate(t.date)}</td>

                        <td>
                            <span class="badge ${t.type}">
                                ${t.type === "lena" ? "Lena" : "Dena"}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(t.product || "-")}
                            ${
                                t.note
                                    ? `<small style="display:block;color:#94a3b8">
                                        ${escapeHTML(t.note)}
                                       </small>`
                                    : ""
                            }
                        </td>

                        <td>
                            <strong>
                                ${formatMoney(t.amount)}
                            </strong>
                        </td>

                        <td>
                            ${
                                t.screenshot
                                    ? `
                                    <button class="icon-btn blue"
                                            onclick="viewTransactionScreenshot('${t.id}')">
                                        <i class="fa-solid fa-image"></i>
                                    </button>
                                    `
                                    : "-"
                            }
                        </td>

                        <td>

                            <div class="action-buttons">

                                <button class="icon-btn blue"
                                        onclick="openTransactionSlip('${t.id}')">
                                    <i class="fa-solid fa-file-invoice"></i>
                                </button>

                                <button class="icon-btn green"
                                        onclick="whatsappTransaction('${t.id}')">
                                    <i class="fa-brands fa-whatsapp"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");
    }


    const whatsappBtn =
        document.getElementById("khataWhatsAppBtn");

    whatsappBtn.onclick =
        () => whatsappCustomer(customerId);


    openModal("khataModal");
}


/* =========================================================
   TRANSACTION SLIP
========================================================= */

function getTransaction(id) {
    return transactions.find(t => t.id === id);
}


function openTransactionSlip(id) {

    const transaction = getTransaction(id);

    if (!transaction) return;

    const customer =
        getCustomer(transaction.customerId);

    currentSlipId = id;


    const isLena =
        transaction.type === "lena";


    document.getElementById("receiptContent").innerHTML = `

        <div class="receipt">

            <div class="receipt-business">

                <h2>Digital Khata</h2>

                <p>
                    Business Transaction Slip
                </p>

            </div>


            <div class="receipt-info">

                <div>
                    <strong>Slip No:</strong>
                    ${escapeHTML(transaction.slipNo)}
                </div>

                <div>
                    <strong>Date:</strong>
                    ${formatDate(transaction.date)}
                </div>

                <div>
                    <strong>Customer:</strong>
                    ${escapeHTML(customer?.name || "-")}
                </div>

                <div>
                    <strong>Phone:</strong>
                    ${escapeHTML(customer?.phone || "-")}
                </div>

                <div>
                    <strong>Type:</strong>
                    ${isLena ? "LENA" : "DENA"}
                </div>

            </div>


            <table class="receipt-table">

                <thead>
                    <tr>
                        <th>Details</th>
                        <th>Amount</th>
                    </tr>
                </thead>

                <tbody>

                    <tr>
                        <td>
                            ${escapeHTML(
                                transaction.product ||
                                "Account Transaction"
                            )}
                        </td>

                        <td>
                            ${formatMoney(transaction.amount)}
                        </td>
                    </tr>

                </tbody>

            </table>


            <div class="receipt-total">

                <div class="grand">
                    <span>
                        ${isLena
                            ? "Amount to Receive"
                            : "Amount to Pay"}
                    </span>

                    <strong>
                        ${formatMoney(transaction.amount)}
                    </strong>
                </div>

            </div>


            ${
                transaction.note
                    ? `
                    <div class="receipt-note">
                        <strong>Note:</strong>
                        ${escapeHTML(transaction.note)}
                    </div>
                    `
                    : ""
            }


            ${
                transaction.screenshot
                    ? `
                    <div style="margin-top:20px;text-align:center">

                        <p style="font-size:11px;color:#64748b;margin-bottom:8px">
                            Attached Payment / Transaction Proof
                        </p>

                        <img src="${transaction.screenshot}"
                             style="max-width:220px;max-height:220px;border-radius:8px;border:1px solid #e2e8f0">

                    </div>
                    `
                    : ""
            }


            <div style="
                text-align:center;
                margin-top:25px;
                color:#94a3b8;
                font-size:10px;
            ">
                Thank you
            </div>

        </div>
    `;


    openModal("receiptModal");
}


/* =========================================================
   RECEIPT IMAGE + WHATSAPP SHARING
   Uses html2canvas on demand. File sharing depends on browser/device support.
========================================================= */
let html2CanvasLoaderPromise = null;

function loadHtml2Canvas() {
    if (typeof window.html2canvas === "function") return Promise.resolve(window.html2canvas);
    if (html2CanvasLoaderPromise) return html2CanvasLoaderPromise;

    html2CanvasLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => typeof window.html2canvas === "function"
            ? resolve(window.html2canvas)
            : reject(new Error("Receipt image tool did not load"));
        script.onerror = () => reject(new Error("Could not load receipt image tool. Check your internet connection."));
        document.head.appendChild(script);
    });
    return html2CanvasLoaderPromise;
}

function normalizeWhatsAppPhone(phone) {
    let value = String(phone || "").replace(/\D/g, "");
    if (value.startsWith("03")) value = "92" + value.slice(1);
    else if (value.startsWith("3") && value.length === 10) value = "92" + value;
    return value;
}

async function shareReceiptImage(elementId, fileName, phone) {
    // Share only the receipt image. No WhatsApp text/message is added.
    let whatsappTab = null;
    try { whatsappTab = window.open("about:blank", "_blank"); } catch (_) {}

    try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error("Receipt preview was not found.");

        const html2canvas = await loadHtml2Canvas();
        const canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false
        });

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(result => result ? resolve(result) : reject(new Error("Could not create receipt image.")), "image/png");
        });

        const file = new File([blob], fileName, { type: "image/png" });
        const shareData = { files: [file] }; // intentionally no text or title

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
            await navigator.share(shareData);
            showToast("Select WhatsApp to share the slip image only.");
            return;
        }

        // Desktop browsers usually cannot attach files directly to WhatsApp Web.
        // Download the image and open the customer's chat without prefilled text.
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);

        const normalizedPhone = normalizeWhatsAppPhone(phone);
        if (normalizedPhone) {
            const waUrl = `https://wa.me/${normalizedPhone}`;
            if (whatsappTab && !whatsappTab.closed) whatsappTab.location.href = waUrl;
            else window.open(waUrl, "_blank");
            showToast("Slip image downloaded. Attach the PNG in WhatsApp; no text is prefilled.");
        } else {
            if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
            showToast("Slip image downloaded. Attach the PNG in WhatsApp.");
        }
    } catch (error) {
        if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
        showToast(error.message || "Could not create receipt image.");
    }
}

async function whatsappTransaction(id) {

    const transaction = getTransaction(id);
    if (!transaction) return;

    const customer = getCustomer(transaction.customerId);
    if (!customer) return;

    openTransactionSlip(id);
    await shareReceiptImage("receiptContent", `Khata-Slip-${transaction.slipNo || id}.png`, customer.phone);
}

async function whatsappCurrentSlip() {
    if (currentSlipId) await whatsappTransaction(currentSlipId);
}


function printCurrentSlip() {

    if (!currentSlipId) return;

    const transaction =
        getTransaction(currentSlipId);

    if (!transaction) return;

    printHTML(
        document.getElementById("receiptContent").innerHTML,
        "Digital Khata Slip"
    );
}


/* =========================================================
   SCREENSHOT VIEW
========================================================= */

function viewTransactionScreenshot(id) {

    const transaction = getTransaction(id);

    if (!transaction || !transaction.screenshot) {
        return;
    }

    document.getElementById("viewerImage").src =
        transaction.screenshot;

    openModal("imageViewerModal");
}


/* =========================================================
   PRODUCTS
========================================================= */

function openProductModal(productId = null) {

    const form = document.getElementById("productForm");
    if (!form) return;

    form.reset();
    editingProductId = productId;
    document.getElementById("minStock").value = 5;
    document.getElementById("productImagePreview").innerHTML = "";

    const title = document.getElementById("productModalTitle");
    const submitButton = form.querySelector('button[type="submit"]');

    if (productId) {
        const product = getProduct(productId);
        if (!product) {
            showToast("Product not found");
            return;
        }

        document.getElementById("productName").value = product.name || "";
        document.getElementById("productCategory").value = product.category || "";
        document.getElementById("purchasePrice").value = Number(product.purchasePrice) || 0;
        document.getElementById("salePrice").value = Number(product.salePrice) || 0;
        document.getElementById("openingStock").value = Number(product.stock) || 0;
        document.getElementById("minStock").value = Number(product.minStock ?? 5);

        if (product.image) {
            document.getElementById("productImagePreview").innerHTML =
                `<img src="${product.image}" class="preview-image" alt="Product Preview">`;
        }
        if (title) title.textContent = "Edit Product";
        if (submitButton) submitButton.textContent = "Update Product";
    } else {
        if (title) title.textContent = "Add Product";
        if (submitButton) submitButton.textContent = "Save Product";
    }

    openModal("productModal");
}


document.getElementById("productImage")
    .addEventListener("change", async function() {

        const file = this.files[0];

        const preview =
            document.getElementById("productImagePreview");

        preview.innerHTML = "";

        if (!file) return;

        try {

            const image =
                await readAndResizeImage(
                    file,
                    700,
                    700,
                    .75
                );

            preview.innerHTML =
                `<img src="${image}"
                       class="preview-image"
                       alt="Product Preview">`;

        } catch (error) {

            showToast("Could not read product image");
        }

    });


document.getElementById("productForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();


        let image = "";

        const file =
            document.getElementById("productImage").files[0];

        if (file) {

            try {

                image =
                    await readAndResizeImage(
                        file,
                        700,
                        700,
                        .75
                    );

            } catch (error) {

                showToast("Product image could not be saved");
                return;
            }
        }


        const existingProduct = editingProductId
            ? getProduct(editingProductId)
            : null;

        const product = {
            id: existingProduct ? existingProduct.id : generateId("PRO"),
            name: document.getElementById("productName").value.trim(),
            category: document.getElementById("productCategory").value.trim(),
            purchasePrice: Number(document.getElementById("purchasePrice").value) || 0,
            salePrice: Number(document.getElementById("salePrice").value) || 0,
            stock: Number(document.getElementById("openingStock").value) || 0,
            minStock: Number(document.getElementById("minStock").value) || 5,
            image: image || existingProduct?.image || "",
            createdAt: existingProduct?.createdAt || new Date().toISOString(),
            updatedAt: existingProduct ? new Date().toISOString() : undefined
        };

        if (existingProduct) {
            products = products.map(item => item.id === existingProduct.id ? product : item);
        } else {
            products.push(product);
        }

        saveData(STORAGE.products, products);
        editingProductId = null;
        closeModal("productModal");
        refreshAll();
        showToast(existingProduct ? "Product updated successfully" : "Product added successfully");
    });


function getProduct(id) {
    return products.find(p => p.id === id);
}


function renderProducts() {

    const tbody =
        document.getElementById("productsTable");

    const search =
        document.getElementById("productSearch")
            .value
            .toLowerCase()
            .trim();


    let list = products;


    if (search) {

        list = products.filter(product =>
            product.name.toLowerCase().includes(search) ||
            (product.category || "")
                .toLowerCase()
                .includes(search)
        );
    }


    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No products found
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = list.map(product => {

        let status = "stock-ok";
        let statusText = "In Stock";

        if (product.stock <= 0) {
            status = "out";
            statusText = "Out of Stock";
        } else if (product.stock <= product.minStock) {
            status = "low";
            statusText = "Low Stock";
        }


        return `

            <tr>

                <td>

                    ${
                        product.image
                            ? `
                            <img src="${product.image}"
                                 class="product-thumb"
                                 onclick="viewProductImage('${product.id}')">
                            `
                            : `
                            <span class="no-image">
                                <i class="fa-solid fa-image"></i>
                            </span>
                            `
                    }

                </td>

                <td>
                    <strong>
                        ${escapeHTML(product.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(product.category || "-")}
                </td>

                <td>
                    ${formatMoney(product.purchasePrice)}
                </td>

                <td>
                    ${formatMoney(product.salePrice)}
                </td>

                <td>
                    <strong>${product.stock}</strong>
                </td>

                <td>
                    <span class="badge ${status}">
                        ${statusText}
                    </span>
                </td>

                <td>

                    <div class="action-buttons">

                        <button class="icon-btn green"
                                title="Edit Product"
                                onclick="openProductModal('${product.id}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>

                        <button class="icon-btn blue"
                                title="Stock"
                                onclick="openStockModal('${product.id}')">
                            <i class="fa-solid fa-boxes-stacked"></i>
                        </button>

                        <button class="icon-btn red"
                                title="Delete"
                                onclick="deleteProduct('${product.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}


function viewProductImage(id) {

    const product = getProduct(id);

    if (!product || !product.image) return;

    document.getElementById("viewerImage").src =
        product.image;

    openModal("imageViewerModal");
}


/* =========================================================
   STOCK
========================================================= */

function openStockModal(productId) {

    const product = getProduct(productId);

    if (!product) return;

    document.getElementById("stockProductId").value =
        productId;

    document.getElementById("stockProductName").textContent =
        `${product.name} | Current Stock: ${product.stock}`;

    document.getElementById("stockQuantity").value = "";

    document.getElementById("stockAction").value = "in";

    openModal("stockModal");
}


document.getElementById("stockForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const id =
            document.getElementById("stockProductId").value;

        const action =
            document.getElementById("stockAction").value;

        const quantity =
            Number(document.getElementById("stockQuantity").value);

        const product = getProduct(id);

        if (!product || quantity <= 0) {
            showToast("Invalid stock data");
            return;
        }


        if (action === "in") {

            product.stock += quantity;

        } else {

            if (quantity > product.stock) {

                showToast("Stock is not enough");
                return;
            }

            product.stock -= quantity;
        }


        saveData(STORAGE.products, products);

        closeModal("stockModal");

        refreshAll();

        showToast("Stock updated");
    });


function deleteProduct(id) {

    const product = getProduct(id);

    if (!product) return;

    if (!confirm(`Delete ${product.name}?`)) {
        return;
    }

    products =
        products.filter(p => p.id !== id);

    saveData(STORAGE.products, products);

    refreshAll();

    showToast("Product deleted");
}


/* =========================================================
   SALES
========================================================= */

function openSaleModal() {

    saleItems = [];

    document.getElementById("saleForm").reset();

    fillCustomerSelect("saleCustomer", true);

    document.getElementById("salePaid").value = 0;

    document.getElementById("saleItems").innerHTML = "";

    addSaleItem();

    calculateSaleTotal();

    openModal("saleModal");
}


function addSaleItem() {

    const id = generateId("ITEM");

    saleItems.push({
        id,
        productId: "",
        quantity: 1,
        price: 0
    });

    renderSaleItems();
}


function removeSaleItem(itemId) {

    saleItems =
        saleItems.filter(item => item.id !== itemId);

    if (!saleItems.length) {
        addSaleItem();
    }

    renderSaleItems();
    calculateSaleTotal();
}


function renderSaleItems() {

    const container =
        document.getElementById("saleItems");


    container.innerHTML =
        saleItems.map(item => {

            const product =
                getProduct(item.productId);


            return `

                <div class="sale-item">

                    <div>

                        <label>Product</label>

                        <select
                            onchange="updateSaleItem('${item.id}', 'productId', this.value)">

                            <option value="">
                                Select Product
                            </option>

                            ${products.map(p => `

                                <option value="${p.id}"
                                    ${p.id === item.productId ? "selected" : ""}>

                                    ${escapeHTML(p.name)}
                                    (${p.stock} stock)

                                </option>

                            `).join("")}

                        </select>

                    </div>


                    <div>

                        <label>Qty</label>

                        <input type="number"
                               min="1"
                               value="${item.quantity}"
                               onchange="updateSaleItem('${item.id}', 'quantity', this.value)">

                    </div>


                    <div>

                        <label>Price</label>

                        <input type="number"
                               min="0"
                               step="0.01"
                               value="${item.price}"
                               onchange="updateSaleItem('${item.id}', 'price', this.value)">

                    </div>


                    <div>

                        <label>Total</label>

                        <div class="sale-item-total">
                            ${formatMoney(
                                Number(item.quantity) *
                                Number(item.price)
                            )}
                        </div>

                    </div>


                    <button type="button"
                            class="remove-sale-item"
                            onclick="removeSaleItem('${item.id}')">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `;

        }).join("");
}


function updateSaleItem(itemId, field, value) {

    const item =
        saleItems.find(i => i.id === itemId);

    if (!item) return;


    if (field === "productId") {

        item.productId = value;

        const product = getProduct(value);

        if (product) {
            item.price = product.salePrice;
        }
    }


    if (field === "quantity") {

        item.quantity =
            Math.max(1, Number(value) || 1);
    }


    if (field === "price") {

        item.price =
            Math.max(0, Number(value) || 0);
    }


    renderSaleItems();

    calculateSaleTotal();
}


function calculateSaleTotal() {

    let total = 0;

    saleItems.forEach(item => {

        total +=
            Number(item.quantity) *
            Number(item.price);

    });


    const paid =
        Number(document.getElementById("salePaid").value) || 0;

    const remaining =
        Math.max(0, total - paid);


    document.getElementById("saleTotal").textContent =
        formatMoney(total);

    document.getElementById("saleRemaining").textContent =
        formatMoney(remaining);

    return {
        total,
        paid,
        remaining
    };
}


document.getElementById("saleForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();


        if (!saleItems.length) {
            showToast("Add at least one product");
            return;
        }


        for (const item of saleItems) {

            if (!item.productId) {
                showToast("Please select all products");
                return;
            }

            const product =
                getProduct(item.productId);

            if (!product) {
                showToast("Product not found");
                return;
            }

            if (item.quantity > product.stock) {
                showToast(
                    `${product.name} has only ${product.stock} stock`
                );
                return;
            }

        }


        const summary =
            calculateSaleTotal();


        if (summary.total <= 0) {
            showToast("Sale total must be greater than zero");
            return;
        }


        if (summary.paid > summary.total) {
            showToast("Paid amount cannot exceed total");
            return;
        }


        const customerId =
            document.getElementById("saleCustomer").value;


        const invoice =
            "INV-" +
            String(sales.length + 1).padStart(5, "0");


        const items = saleItems.map(item => {

            const product =
                getProduct(item.productId);

            return {

                productId: item.productId,

                productName: product.name,

                image: product.image || "",

                quantity: Number(item.quantity),

                price: Number(item.price),

                total:
                    Number(item.quantity) *
                    Number(item.price)

            };

        });


        /* Reduce stock */

        items.forEach(item => {

            const product =
                getProduct(item.productId);

            product.stock -= item.quantity;

        });


        const sale = {

            id: generateId("SALE"),

            invoice,

            customerId,

            items,

            total: summary.total,

            paid: summary.paid,

            remaining: summary.remaining,

            date: todayISO(),

            createdAt: new Date().toISOString()

        };


        sales.unshift(sale);


        /* If remaining exists, add Lena transaction */

        if (customerId && summary.remaining > 0) {

            transactions.unshift({

                id: generateId("TRX"),

                slipNo:
                    generateSlipNumber("lena"),

                customerId,

                type: "lena",

                amount: summary.remaining,

                date: todayISO(),

                product:
                    `Sale Invoice ${invoice}`,

                note:
                    `Remaining amount from sale invoice ${invoice}`,

                screenshot: "",

                createdAt: new Date().toISOString()

            });

        }


        saveData(STORAGE.sales, sales);

        saveData(STORAGE.products, products);

        saveData(STORAGE.transactions, transactions);


        closeModal("saleModal");

        refreshAll();

        showToast("Sale completed successfully");


        setTimeout(() => {

            openSaleReceipt(sale.id);

        }, 250);

    });


function renderSales() {

    const tbody =
        document.getElementById("salesTable");


    if (!sales.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No sales found
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        sales.map(sale => {

            const customer =
                sale.customerId
                    ? getCustomer(sale.customerId)
                    : null;


            return `

                <tr>

                    <td>
                        <strong>${escapeHTML(sale.invoice)}</strong>
                    </td>

                    <td>${formatDate(sale.date)}</td>

                    <td>
                        ${escapeHTML(
                            customer?.name || "Walk-in Customer"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatMoney(sale.total)}
                        </strong>
                    </td>

                    <td>
                        ${formatMoney(sale.paid)}
                    </td>

                    <td>
                        <strong style="color:${
                            sale.remaining > 0
                                ? "#dc2626"
                                : "#16a34a"
                        }">
                            ${formatMoney(sale.remaining)}
                        </strong>
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button class="icon-btn blue"
                                    title="View Receipt"
                                    onclick="openSaleReceipt('${sale.id}')">
                                <i class="fa-solid fa-file-invoice"></i>
                            </button>

                            ${
                                customer?.phone
                                    ? `
                                    <button class="icon-btn green"
                                            title="WhatsApp"
                                            onclick="whatsappSale('${sale.id}')">
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </button>
                                    `
                                    : ""
                            }

                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}


function getSale(id) {
    return sales.find(s => s.id === id);
}


/* =========================================================
   SALE RECEIPT
========================================================= */

function openSaleReceipt(id) {

    const sale = getSale(id);

    if (!sale) return;

    currentSaleReceiptId = id;

    const customer =
        sale.customerId
            ? getCustomer(sale.customerId)
            : null;


    const rows =
        sale.items.map(item => {

            return `

                <tr>

                    <td>

                        ${
                            item.image
                                ? `
                                <img src="${item.image}"
                                     style="
                                        width:38px;
                                        height:38px;
                                        object-fit:cover;
                                        border-radius:6px;
                                        vertical-align:middle;
                                        margin-right:6px;
                                     ">
                                `
                                : ""
                        }

                        ${escapeHTML(item.productName)}

                    </td>

                    <td>${item.quantity}</td>

                    <td>${formatMoney(item.price)}</td>

                    <td>${formatMoney(item.total)}</td>

                </tr>

            `;

        }).join("");


    document.getElementById("saleReceiptContent").innerHTML = `

        <div class="receipt">

            <div class="receipt-business">

                <h2>Digital Khata</h2>

                <p>
                    Sales Invoice
                </p>

            </div>


            <div class="receipt-info">

                <div>
                    <strong>Invoice:</strong>
                    ${escapeHTML(sale.invoice)}
                </div>

                <div>
                    <strong>Date:</strong>
                    ${formatDate(sale.date)}
                </div>

                <div>
                    <strong>Customer:</strong>
                    ${escapeHTML(
                        customer?.name || "Walk-in Customer"
                    )}
                </div>

                <div>
                    <strong>Phone:</strong>
                    ${escapeHTML(customer?.phone || "-")}
                </div>

            </div>


            <table class="receipt-table">

                <thead>

                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>


            <div class="receipt-total">

                <div>
                    <span>Total</span>
                    <strong>${formatMoney(sale.total)}</strong>
                </div>

                <div>
                    <span>Paid</span>
                    <strong>${formatMoney(sale.paid)}</strong>
                </div>

                <div class="grand">
                    <span>Remaining</span>
                    <strong>${formatMoney(sale.remaining)}</strong>
                </div>

            </div>


            <div style="
                text-align:center;
                margin-top:25px;
                color:#94a3b8;
                font-size:10px;
            ">
                Thank you for your business
            </div>

        </div>

    `;


    openModal("saleReceiptModal");
}


async function whatsappSale(id) {

    const sale = getSale(id);
    if (!sale) return;

    const customer = sale.customerId ? getCustomer(sale.customerId) : null;
    if (!customer) {
        showToast("Customer phone is required");
        return;
    }

    openSaleReceipt(id);
    await shareReceiptImage("saleReceiptContent", `Sale-Receipt-${sale.invoice || id}.png`, customer.phone);
}

async function whatsappCurrentSaleReceipt() {
    if (currentSaleReceiptId) await whatsappSale(currentSaleReceiptId);
}


function printCurrentSaleReceipt() {

    if (!currentSaleReceiptId) return;

    printHTML(
        document.getElementById("saleReceiptContent").innerHTML,
        "Digital Khata Sale Invoice"
    );
}


/* =========================================================
   PRINT
========================================================= */

function printHTML(content, title) {

    const printWindow = window.open("", "_blank", "width=800,height=900");

    if (!printWindow) {
        showToast("Please allow popups for printing");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHTML(title)}</title>
            <style>
                * { box-sizing: border-box; }
                @page {
                    size: 80mm auto;
                    margin: 3mm;
                }
                html, body {
                    width: 74mm;
                    margin: 0;
                    padding: 0;
                    background: #fff !important;
                    color: #000 !important;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 1.35;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .receipt {
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    color: #000 !important;
                    background: #fff !important;
                    box-shadow: none !important;
                }
                .receipt-business {
                    text-align: center;
                    border-bottom: 1px dashed #000;
                    padding: 0 0 8px;
                    margin: 0 0 8px;
                }
                .receipt-business h2 {
                    color: #000 !important;
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0 0 3px;
                }
                .receipt-business p {
                    color: #000 !important;
                    font-size: 11px;
                    font-weight: 600;
                    margin: 2px 0;
                }
                .receipt-info {
                    display: block !important;
                    margin: 0 0 8px;
                }
                .receipt-info div {
                    font-size: 11px;
                    font-weight: 600;
                    margin: 3px 0;
                    overflow-wrap: anywhere;
                }
                .receipt-info strong { color: #000 !important; }
                table, .receipt-table {
                    width: 100% !important;
                    min-width: 0 !important;
                    border-collapse: collapse;
                    margin: 6px 0 9px;
                    table-layout: auto;
                }
                th, td, .receipt-table th, .receipt-table td {
                    color: #000 !important;
                    background: #fff !important;
                    border-bottom: 1px solid #555;
                    padding: 5px 2px !important;
                    text-align: left;
                    vertical-align: top;
                    font-size: 10.5px !important;
                    font-weight: 600 !important;
                    overflow-wrap: anywhere;
                }
                th { font-weight: 800 !important; border-bottom: 1.5px solid #000; }
                .receipt-total {
                    width: 100% !important;
                    margin: 8px 0 0 auto !important;
                    border-top: 1.5px solid #000;
                }
                .receipt-total div {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 4px 0;
                    color: #000 !important;
                    font-size: 11px !important;
                    font-weight: 700;
                }
                .receipt-total .grand {
                    border-top: 1px solid #000;
                    font-size: 13px !important;
                    font-weight: 800 !important;
                }
                .receipt-note, .receipt-note *, .receipt p, .receipt span {
                    color: #000 !important;
                }
                img { max-width: 35mm; max-height: 35mm; }
                button, .receipt-buttons, .no-print { display: none !important; }
                * { text-shadow: none !important; }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function () {
                    setTimeout(function () {
                        window.focus();
                        window.print();
                    }, 250);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    let lena = 0;
    let dena = 0;

    transactions.forEach(t => {

        if (t.type === "lena") {
            lena += Number(t.amount);
        } else {
            dena += Number(t.amount);
        }

    });


    const totalSales =
        sales.reduce(
            (sum, sale) => sum + Number(sale.total),
            0
        );


    const totalStock =
        products.reduce(
            (sum, product) => sum + Number(product.stock),
            0
        );


    document.getElementById("dashCustomers").textContent =
        customers.length;

    document.getElementById("dashLena").textContent =
        formatMoney(lena);

    document.getElementById("dashDena").textContent =
        formatMoney(dena);

    document.getElementById("dashProducts").textContent =
        products.length;


    document.getElementById("reportLena").textContent =
        formatMoney(lena);

    document.getElementById("reportDena").textContent =
        formatMoney(dena);

    document.getElementById("reportSales").textContent =
        formatMoney(totalSales);

    document.getElementById("reportStock").textContent =
        totalStock;


    renderRecentTransactions();
    renderLowStock();
}


function renderRecentTransactions() {

    const tbody =
        document.getElementById("recentTransactions");


    const list =
        [...transactions]
            .sort(
                (a,b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            )
            .slice(0, 7);


    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No transactions yet
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        list.map(t => {

            const customer =
                getCustomer(t.customerId);

            return `

                <tr>

                    <td>${formatDate(t.date)}</td>

                    <td>
                        ${escapeHTML(
                            customer?.name || "-"
                        )}
                    </td>

                    <td>
                        <span class="badge ${t.type}">
                            ${t.type === "lena"
                                ? "Lena"
                                : "Dena"}
                        </span>
                    </td>

                    <td>
                        ${formatMoney(t.amount)}
                    </td>

                </tr>

            `;

        }).join("");
}


function renderLowStock() {

    const container =
        document.getElementById("lowStockList");


    const low =
        products.filter(
            p => Number(p.stock) <= Number(p.minStock)
        );


    if (!low.length) {

        container.innerHTML = `
            <div class="empty-state">
                All products have enough stock.
            </div>
        `;

        return;
    }


    container.innerHTML =
        low.map(product => `

            <div class="low-stock-item">

                <strong>
                    ${escapeHTML(product.name)}
                </strong>

                <span>
                    ${product.stock <= 0
                        ? "Out of stock"
                        : product.stock + " left"}
                </span>

            </div>

        `).join("");
}


/* =========================================================
   REFRESH
========================================================= */

function refreshAll() {

    renderCustomers();
    renderTransactions();
    renderProducts();
    renderSales();
    updateDashboard();

    fillCustomerSelect("transactionCustomer");
    fillCustomerSelect("saleCustomer", true);
}


/* =========================================================
   CLEAR DATA
========================================================= */

function clearAllData() {

    const answer =
        prompt(
            "Type DELETE to remove all Digital Khata data:"
        );

    if (answer !== "DELETE") {
        return;
    }


    localStorage.removeItem(STORAGE.customers);
    localStorage.removeItem(STORAGE.transactions);
    localStorage.removeItem(STORAGE.products);
    localStorage.removeItem(STORAGE.sales);


    customers = [];
    transactions = [];
    products = [];
    sales = [];


    refreshAll();

    showToast("All data deleted");
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", function() {

    updateDate();

    refreshAll();

    document.getElementById("transactionDate").value =
        todayISO();

});
