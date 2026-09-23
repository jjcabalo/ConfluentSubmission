const socket = io();

let totalOrders = 0;
let totalFraud = 0;
let fraudValue = 0;

const totalOrdersEl = document.getElementById('totalOrders');
const totalFraudEl = document.getElementById('totalFraud');
const fraudValueEl = document.getElementById('fraudValue');
const ordersBody = document.getElementById('ordersBody');
const alertsContainer = document.getElementById('alertsContainer');
const injectBtn = document.getElementById('injectBtn');

const formatMoney = (amount) => {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// incoming firehose
socket.on('raw_orders', (order) => {
    totalOrders++;
    totalOrdersEl.textContent = totalOrders.toLocaleString();

    const isFraud = order.amount > 1000;
    const row = document.createElement('tr');
    if (isFraud) row.classList.add('fraud-row');
    
    row.innerHTML = `
        <td>${order.order_id}</td>
        <td>${order.user_id}</td>
        <td>$${formatMoney(order.amount)}</td>
        <td><span class="status-badge ${isFraud ? 'status-fraud' : 'status-valid'}">${isFraud ? 'Flagged' : 'Processed'}</span></td>
    `;
    
    ordersBody.insertBefore(row, ordersBody.firstChild);
    
    // don't let the DOM get too crazy
    if (ordersBody.children.length > 50) {
        ordersBody.removeChild(ordersBody.lastChild);
    }
});

// isolated fraud stream
socket.on('fraudulent_orders', (alert) => {
    const emptyState = alertsContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    totalFraud++;
    fraudValue += alert.amount;
    
    totalFraudEl.textContent = totalFraud.toLocaleString();
    fraudValueEl.textContent = formatMoney(fraudValue);

    const card = document.createElement('div');
    card.className = 'alert-card';
    card.innerHTML = `
        <h4>${alert.alert_reason || 'Fraud Detected'}</h4>
        <p>Order: ${alert.order_id}</p>
        <p>User: ${alert.user_id}</p>
        <span class="amount">Blocked: $${formatMoney(alert.amount)}</span>
    `;

    alertsContainer.insertBefore(card, alertsContainer.firstChild);

    if (alertsContainer.children.length > 10) {
        alertsContainer.removeChild(alertsContainer.lastChild);
    }
});

// demo trigger
injectBtn.addEventListener('click', async () => {
    injectBtn.disabled = true;
    injectBtn.innerHTML = '<i data-feather="loader"></i> Injecting...';
    feather.replace();
    
    try {
        const response = await fetch('/inject-fraud', { method: 'POST' });
        if (!response.ok) throw new Error('Injection failed');
        // socket will catch the result and update the UI automatically
    } catch (err) {
        console.error(err);
        alert('Failed to inject fraud.');
    } finally {
        setTimeout(() => {
            injectBtn.disabled = false;
            injectBtn.innerHTML = '<i data-feather="zap"></i> Inject Fraud Test';
            feather.replace();
        }, 1000);
    }
});
