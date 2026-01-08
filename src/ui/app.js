const API_BASE = '/api';

// STATE
let items = [];
let lastPackResult = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    loadBoxes();
});

// TABS
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    // Find button to highlight
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(id));
    if (btn) btn.classList.add('active');
}

// BOXES
async function loadBoxes() {
    const res = await fetch(`${API_BASE}/boxes`);
    const boxes = await res.json();
    const container = document.getElementById('box-list');
    container.innerHTML = boxes.map(b => `
        <div class="box-card">
            <strong>${b.code}</strong> (${b.name})<br>
            ${b.innerL}x${b.innerW}x${b.innerH}" <br>
            Max: ${b.maxWeight}lb
            <button onclick="deleteBox('${b.id}')" style="font-size:0.8em; color:red;">Del</button>
        </div>
    `).join('');
}

async function addBox() {
    const box = {
        code: document.getElementById('new-box-code').value,
        name: document.getElementById('new-box-name').value,
        innerL: Number(document.getElementById('new-box-l').value),
        innerW: Number(document.getElementById('new-box-w').value),
        innerH: Number(document.getElementById('new-box-h').value),
        maxWeight: Number(document.getElementById('new-box-max').value),
        enabled: true
    };
    await fetch(`${API_BASE}/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(box)
    });
    loadBoxes();
}

async function deleteBox(id) {
    await fetch(`${API_BASE}/boxes/${id}`, { method: 'DELETE' });
    loadBoxes();
}

// ITEMS
function renderItems() {
    const list = document.getElementById('items-list');
    if (items.length === 0) {
        list.innerHTML = '<p class="text-muted">No items added yet.</p>';
        return;
    }
    list.innerHTML = items.map((it, idx) => `
        <div class="item-row">
            <span>${it.qty}x <strong>${it.id}</strong> (${it.l}x${it.w}x${it.h}, ${it.weight}lb)</span>
            <button onclick="removeItem(${idx})">x</button>
        </div>
    `).join('');
}

function addItem() {
    const it = {
        id: document.getElementById('item-sku').value || 'SKU-' + Date.now().toString().slice(-4),
        name: document.getElementById('item-name').value || 'Item',
        qty: Number(document.getElementById('item-qty').value),
        l: Number(document.getElementById('item-l').value),
        w: Number(document.getElementById('item-w').value),
        h: Number(document.getElementById('item-h').value),
        weight: Number(document.getElementById('item-wt').value)
    };
    if (!it.l || !it.w || !it.h) return alert('Dims required');
    items.push(it);
    renderItems();
}

function removeItem(idx) {
    items.splice(idx, 1);
    renderItems();
}

function clearItems() {
    items = [];
    renderItems();
}

// PRESETS
function addPreset(type) {
    if (type === 'shirt') items.push({ id: 'SHIRT', name: 'T-Shirt', qty: 1, weight: 0.5, l: 10, w: 8, h: 1 });
    if (type === 'shoes') items.push({ id: 'SHOES', name: 'Sneakers', qty: 1, weight: 2, l: 12, w: 9, h: 5 });
    if (type === 'poster') items.push({ id: 'POSTER', name: 'Poster Tube', qty: 1, weight: 0.8, l: 24, w: 3, h: 3 });
    if (type === 'mug') items.push({ id: 'MUG', name: 'Coffee Mug', qty: 1, weight: 1, l: 4, w: 4, h: 4 });
    renderItems();
}

// PACKING
async function runPack() {
    if (items.length === 0) return alert('Add items first');

    const mode = document.getElementById('pack-mode').value;
    const profileKey = document.getElementById('carrier-profile').value;

    let carrierProfile;
    if (profileKey === 'usps') carrierProfile = { name: 'USPS', dimDivisor: 166, roundUpTo: 1 };
    else carrierProfile = { name: 'Default', dimDivisor: 139, roundUpTo: 1 };

    const res = await fetch(`${API_BASE}/pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, mode, carrierProfile })
    });

    const result = await res.json();
    lastPackResult = result;
    renderResults(result);

    // Enable create order button
    document.getElementById('btn-create-order').disabled = false;
}

function renderResults(result) {
    const container = document.getElementById('pack-results');
    const m = result.metrics;

    let html = `
        <div class="metrics-summary">
            Boxes: ${m.boxCount} | Billable: ${m.totalBillableWeight.toFixed(2)} lb | Unused Vol: ${m.totalUnusedVolume.toFixed(2)} | Time: ${m.runtimeMs}ms
        </div>
    `;

    result.packages.forEach((pkg, i) => {
        html += `
            <div class="package-result">
                <h4>📦 Box #${i + 1}: ${pkg.boxName} (${pkg.dims.l}x${pkg.dims.w}x${pkg.dims.h})</h4>
                <div>Actual: ${pkg.weightActual}lb | DimWt: ${pkg.dimWeight.toFixed(2)}lb | <strong>Billable: ${pkg.weightBillable}lb</strong></div>
                <ul>
                    ${pkg.items.map(it => `<li>${it.id} (${it.l}x${it.w}x${it.h})</li>`).join('')}
                </ul>
            </div>
        `;
    });

    container.innerHTML = html;
}

// COMPARE
async function runComparison() {
    const modes = ['ffd', 'bestfit']; // beam optional
    const container = document.getElementById('compare-results');
    container.innerHTML = 'Running...';

    let comparisonHtml = '<table border="1" cellpadding="5" style="border-collapse:collapse; width:100%"><tr><th>Metric</th><th>FFD</th><th>BestFit</th></tr>';

    const results = {};
    for (const mode of modes) {
        const res = await fetch(`${API_BASE}/pack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, mode })
        });
        results[mode] = await res.json();
    }

    const m1 = results['ffd'].metrics;
    const m2 = results['bestfit'].metrics;

    comparisonHtml += `
        <tr><td>Boxes</td><td>${m1.boxCount}</td><td>${m2.boxCount}</td></tr>
        <tr><td>Billable Wt</td><td>${m1.totalBillableWeight}</td><td>${m2.totalBillableWeight}</td></tr>
        <tr><td>Unused Vol</td><td>${m1.totalUnusedVolume.toFixed(2)}</td><td>${m2.totalUnusedVolume.toFixed(2)}</td></tr>
        <tr><td>Time (ms)</td><td>${m1.runtimeMs}</td><td>${m2.runtimeMs}</td></tr>
    `;
    comparisonHtml += '</table>';
    container.innerHTML = comparisonHtml;
}

// SHIPSTATION
// SHIPSTATION
async function checkStores() {
    const res = await fetch(`${API_BASE}/shipstation/carriers`, { method: 'GET' });
    const data = await res.json();
    document.getElementById('store-list').innerText = JSON.stringify(data, null, 2);
}

async function createShipStationOrder() {
    if (!lastPackResult) return alert('Run pack first');

    const orderRaw = {
        orderNumber: 'TEST-' + Math.floor(Math.random() * 10000),
        items: items // simple pass through
    };

    const res = await fetch(`${API_BASE}/shipstation/upsert-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            order: orderRaw,
            packedPackages: lastPackResult.packages
        })
    });

    const data = await res.json();
    document.getElementById('ss-output').innerText = JSON.stringify(data, null, 2);
}

async function getRates() {
    if (!lastPackResult || lastPackResult.packages.length === 0) return alert('Run pack first');

    document.getElementById('ss-output').innerText = 'Fetching rates...';

    const pkg = lastPackResult.packages[0]; // Just use first for now

    // Hardcoded zips or from hypothetical ui inputs
    const fromZip = '78756';
    const toZip = '90210';

    const res = await fetch(`${API_BASE}/shipstation/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fromZip,
            toZip,
            package: pkg
        })
    });

    const data = await res.json();
    console.log("RATES API RESPONSE:", data); // Debug logging

    // Debug: show raw first
    const rawDump = JSON.stringify(data, null, 2);
    document.getElementById('ss-output').innerText = "RAW RESPONSE:\n" + rawDump + "\n\nPARSED:\n";

    let display = "Parsing failed or empty";

    // Handle array response
    if (Array.isArray(data)) {
        display = data.map(r => {
            const carrier = r.carrierCode ? `[${r.carrierCode.toUpperCase()}] ` : '';
            const name = r.serviceName || r.service_type || 'Unknown Service';
            const code = r.serviceCode || r.service_code || 'N/A';

            // V2 uses shipping_amount object
            const cost = r.shipmentCost || r.shipping_amount?.amount || r.total_amount?.amount || 0;
            const other = r.otherCost || r.other_amount?.amount || 0;

            return `${carrier}${name} (${code}): $${cost}`;
        }).join('\n');
    } else if (data.error || data.errors) {
        display = "API Error: " + (data.message || JSON.stringify(data.errors));
    }

    document.getElementById('ss-output').innerText += display;
}
// BATCH RATES
async function getBatchRates() {
    if (!lastPackResult || lastPackResult.packages.length === 0) return alert('Run pack first');

    const btn = document.querySelector('button[onclick="getBatchRates()"]');
    const oldText = btn.innerText;
    btn.innerText = "Calculating (Requesting Rates for Groups)...";
    btn.disabled = true;
    document.getElementById('ss-output').innerText = 'Calculating batch estimate...';

    const start = Date.now();
    try {
        const res = await fetch(`/api/shipstation/estimate-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packages: lastPackResult.packages,
                fromZip: '78756',
                toZip: '90210'
            })
        });

        const data = await res.json();
        const duration = Date.now() - start;

        // 1. Totals Summary (Per Service)
        let html = `<h3>Estimated Project Total (By Service) <span style="font-size:0.6em; color:green; margin-left:10px;">⚡️ ${duration}ms</span></h3>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:20px;">`;

        const sortedServices = Object.entries(data.serviceTotals)
            .sort(([, a], [, b]) => a - b);

        for (const [serviceKey, total] of sortedServices) {
            html += `
            <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px; background: #fff; min-width: 200px;">
                <h4 style="margin:0; font-size: 0.9em; color:#555;">${serviceKey}</h4>
                <div style="font-size: 1.4em; font-weight: bold; color: #007bff;">$${total.toFixed(2)}</div>
            </div>
        `;
        }
        html += `</div>`;

        // 2. Breakdown Table
        html += `<h4>Breakdown Details</h4>`;
        html += `<table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; font-size: 0.9em;">
        <tr style="background:#eee;">
            <th>Carrier</th>
            <th>Service</th>
            <th>Box Group</th>
            <th>Count</th>
            <th>Avg Wt</th>
            <th>Unit Cost</th>
            <th>Subtotal</th>
        </tr>`;

        // Sort breakdown by carrier
        data.breakdown.sort((a, b) => a.carrier.localeCompare(b.carrier));

        data.breakdown.forEach(e => {
            html += `<tr>
            <td style="font-weight:bold; text-transform:uppercase;">${e.carrier}</td>
            <td>${e.service || 'N/A'}</td>
            <td>${e.boxName}</td>
            <td>${e.count}</td>
            <td>${Number(e.avgWeight || 0).toFixed(1)}lb</td>
            <td>$${e.unitCost}</td>
            <td>$${e.subtotal.toFixed(2)}</td>
        </tr>`;
        });
        html += '</table>';

        document.getElementById('ss-output').innerHTML = html;
    } catch (e) {
        document.getElementById('ss-output').innerText = "Error: " + e.message;
    } finally {
        const btn = document.querySelector('button[onclick="getBatchRates()"]');
        if (btn) {
            btn.innerText = "Get Batch Estimate (All Boxes)";
            btn.disabled = false;
        }
    }
}
