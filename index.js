lucide.createIcons();

// --- Navigation Logic ---
const sidebarNav = document.getElementById('sidebar-nav');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');

sidebarNav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    e.preventDefault();

    const viewName = link.dataset.view;
    
    // Update active icon
    sidebarNav.querySelector('.active').classList.remove('active');
    link.classList.add('active');

    // Update header title
    headerTitle.textContent = link.title;

    // Switch views
    views.forEach(view => {
        view.classList.remove('active');
        if (view.id === `${viewName}-view`) {
            view.classList.add('active');
        }
    });
});

// --- Chart & Gauge Config ---
const batteryGauge = new Chart(document.getElementById('battery-gauge').getContext('2d'), {
    type: 'doughnut', data: { datasets: [{ data: [0, 100], backgroundColor: ['#4CAF50', '#e0e0e0'], borderWidth: 0, circumference: 270, rotation: -135 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { tooltip: { enabled: false } } }
});
const energyChart = new Chart(document.getElementById('energyChart').getContext('2d'), {
    type: 'line', data: { labels: [], datasets: [{ label: 'Generation', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4, pointRadius: 0 }, { label: 'Load', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
});

// --- Data Simulation & State ---
let generation = 150, load = 120, batterySOC = 80;
let gridStatus = 'Normal', isFaultCondition = false, faultCooldown = 0;
const alertsLog = document.getElementById('alerts-log');
const fullAlertsLog = document.getElementById('full-alerts-log');
let assets = [
    { id: 'Gateway-ESP32', status: 'Normal', icon: 'wifi' }, { id: 'Processor-Pi4', status: 'Normal', icon: 'cpu' },
    { id: 'Inverter-A1', status: 'Normal', icon: 'server' }, { id: 'Battery-P1', status: 'Normal', icon: 'battery-medium' }
];

const dotGenLoad = document.getElementById('dot-gen-load');
const dotToBatt = document.getElementById('dot-to-batt');
const dotFromBatt = document.getElementById('dot-from-batt');

// --- UI Update Functions ---
const addAlert = (type, message) => {
    const colors = { Predictive: 'border-yellow-400 bg-yellow-50', Fault: 'border-red-500 bg-red-50', System: 'border-blue-400 bg-blue-50' };
    const icons = { Predictive: 'alert-triangle', Fault: 'siren', System: 'info' };
    const alertEl = document.createElement('div');
    alertEl.className = `fade-in p-2 border-l-4 ${colors[type]} rounded-r-md flex items-start space-x-2 text-sm`;
    alertEl.innerHTML = `<i data-lucide="${icons[type]}" class="h-4 w-4 mt-0.5"></i><div><p>${message}</p><p class="text-xs text-gray-400">${new Date().toLocaleString()}</p></div>`;
    
    // Add to both logs
    const fullLogClone = alertEl.cloneNode(true);
    
    if (alertsLog.querySelector('p')) alertsLog.innerHTML = '';
    alertsLog.prepend(alertEl);
    if (alertsLog.children.length > 6) alertsLog.removeChild(alertsLog.lastChild);

    if (fullAlertsLog.querySelector('p')) fullAlertsLog.innerHTML = '';
    fullAlertsLog.prepend(fullLogClone);
    
    lucide.createIcons();
};

const renderAssetHealth = () => {
    const grid = document.getElementById('asset-health-grid');
    if (!grid) return; // Don't run if the element is not on the current view
    grid.innerHTML = '';
    const statusClasses = { Normal: 'green', Warning: 'yellow', Fault: 'red' };
    assets.forEach(asset => {
        const statusColor = statusClasses[asset.status];
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-md border';
        el.innerHTML = `<div class="flex items-center space-x-2"><i data-lucide="${asset.icon}" class="h-5 w-5 text-gray-600"></i><p class="font-medium text-sm">${asset.id}</p></div><div class="flex items-center space-x-2"><span class="text-xs">${asset.status}</span><span class="status-dot status-${statusColor}"></span></div>`;
        grid.appendChild(el);
    });
    lucide.createIcons();
};

const updateUI = () => {
    // Simulate data fluctuations
    if (faultCooldown > 0) faultCooldown--; else isFaultCondition = Math.random() < 0.05;
    assets.forEach(asset => { if (asset.status !== 'Fault') asset.status = 'Normal'; });
    if (isFaultCondition && faultCooldown === 0) {
        gridStatus = 'Fault'; generation *= 0.3; let faultyAsset = assets[2]; faultyAsset.status = 'Fault';
        addAlert('Fault', `${faultyAsset.id} reported undervoltage.`); faultCooldown = 15;
    } else if (!isFaultCondition && Math.random() < 0.08) {
        gridStatus = 'Warning'; let warningAsset = assets[3]; warningAsset.status = 'Warning';
        addAlert('Predictive', `${warningAsset.id} high temp detected.`);
    } else if (!isFaultCondition) { gridStatus = 'Normal'; }

    generation += (Math.random() - 0.45) * 10; load += (Math.random() - 0.5) * 8;
    generation = Math.max(80, Math.min(250, generation)); load = Math.max(70, Math.min(200, load));
    const netPower = generation - load;
    batterySOC += netPower / 100; batterySOC = Math.max(0, Math.min(100, batterySOC));

    // Update DOM (only if dashboard view is active)
    if(document.getElementById('dashboard-view').classList.contains('active')) {
        document.getElementById('total-generation').textContent = generation.toFixed(1);
        document.getElementById('current-load').textContent = load.toFixed(1);
        const statusDot = document.getElementById('grid-status-dot');
        const statusText = document.getElementById('grid-status-text');
        const statusSubText = document.getElementById('grid-status-subtext');
        statusDot.className = 'status-dot'; // reset
        if (gridStatus === 'Normal') { statusDot.classList.add('status-green'); statusText.textContent = 'Nominal'; statusSubText.textContent = 'All systems operational.'; } 
        else if (gridStatus === 'Warning') { statusDot.classList.add('status-yellow'); statusText.textContent = 'Warning'; statusSubText.textContent = 'Potential issue detected.'; }
        else { statusDot.classList.add('status-red'); statusText.textContent = 'Fault'; statusSubText.textContent = 'Critical error active.'; }

        // Update flow
        dotGenLoad.classList.toggle('active', generation > 0);
        dotToBatt.classList.toggle('active', netPower > 10);
        dotFromBatt.classList.toggle('active', netPower < -10);

        // Update charts
        batteryGauge.data.datasets[0].data[0] = batterySOC;
        batteryGauge.data.datasets[0].data[1] = 100 - batterySOC;
        const socColor = batterySOC > 50 ? '#4CAF50' : batterySOC > 20 ? '#FFC107' : '#F44336';
        batteryGauge.data.datasets[0].backgroundColor[0] = socColor;
        document.getElementById('battery-gauge-text').textContent = `${batterySOC.toFixed(0)}%`;
        batteryGauge.update('none');

        const now = new Date();
        energyChart.data.labels.push(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        energyChart.data.datasets[0].data.push(generation.toFixed(1));
        energyChart.data.datasets[1].data.push(load.toFixed(1));
        if (energyChart.data.labels.length > 30) { energyChart.data.labels.shift(); energyChart.data.datasets.forEach(ds => ds.data.shift()); }
        energyChart.update();
        renderAssetHealth();
    }
    document.getElementById('current-time').textContent = new Date().toLocaleTimeString();

};

// Initial setup and interval
updateUI();
setInterval(updateUI, 2500);
