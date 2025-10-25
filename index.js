// GitHub Configuration
const GITHUB_REPO = 'pubg/api-assets';
const GITHUB_RAW = 'https://raw.githubusercontent.com/pubg/api-assets/master';
const GITHUB_API = 'https://api.github.com/repos/pubg/api-assets';

// Global Data Store
const DATABASE = {
    weapons: [],
    items: [],
    vehicles: [],
    maps: [],
    gameModes: [],
    telemetry: [],
    seasons: [],
    rawFiles: {},
    allData: {}
};

// State
let currentTab = 'overview';
let currentPlatform = 'all';
let loadProgress = 0;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await loadAllData();
    hideLoading();
    renderAll();
}

// Event Listeners
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentTab = btn.dataset.tab;
            
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(currentTab).classList.add('active');
        });
    });

    // Global Search
    document.getElementById('globalSearch').addEventListener('input', handleGlobalSearch);

    // Platform Filter
    document.getElementById('platformFilter').addEventListener('change', (e) => {
        currentPlatform = e.target.value;
        renderAll();
    });
}

// Load All Data
async function loadAllData() {
    updateLoadStatus('Fetching repository structure...');
    
    try {
        // Get all files from repository
        const files = await fetchAllFiles();
        updateProgress(20);
        
        // Load PC Data
        updateLoadStatus('Loading PC data...');
        await loadPlatformData('pc');
        updateProgress(40);
        
        // Load Console Data
        updateLoadStatus('Loading Console data...');
        await loadPlatformData('console');
        updateProgress(60);
        
        // Load Kakao Data
        updateLoadStatus('Loading Kakao data...');
        await loadPlatformData('kakao');
        updateProgress(70);
        
        // Load Telemetry
        updateLoadStatus('Loading Telemetry events...');
        await loadTelemetry();
        updateProgress(90);
        
        // Process and organize data
        updateLoadStatus('Processing data...');
        organizeData();
        updateProgress(100);
        
        console.log('All data loaded:', DATABASE);
        
    } catch (error) {
        console.error('Error loading data:', error);
        updateLoadStatus('Error loading data. Retrying...');
    }
}

// Fetch All Files
async function fetchAllFiles() {
    try {
        const response = await fetch(`${GITHUB_API}/contents/dictionaries`);
        const data = await response.json();
        DATABASE.rawFiles.structure = data;
        return data;
    } catch (error) {
        console.error('Error fetching files:', error);
        return [];
    }
}

// Load Platform Data
async function loadPlatformData(platform) {
    const files = [
        'itemTypes.json',
        'maps.json',
        'matchTypes.json',
        'seasons.json',
        'telemetryEvents.json'
    ];
    
    for (const file of files) {
        try {
            const url = `${GITHUB_RAW}/dictionaries/${platform}/${file}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                const key = `${platform}_${file.replace('.json', '')}`;
                DATABASE.rawFiles[key] = data;
                DATABASE.allData[key] = data;
            }
        } catch (error) {
            console.log(`File not found: ${platform}/${file}`);
        }
    }
}

// Load Telemetry
async function loadTelemetry() {
    try {
        const url = `${GITHUB_RAW}/dictionaries/telemetry/telemetryEvents.json`;
        const response = await fetch(url);
        const data = await response.json();
        DATABASE.rawFiles.telemetry = data;
        DATABASE.telemetry = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
        }));
    } catch (error) {
        console.error('Error loading telemetry:', error);
    }
}

// Organize Data
function organizeData() {
    // Process all platforms
    ['pc', 'console', 'kakao'].forEach(platform => {
        const itemTypesKey = `${platform}_itemTypes`;
        const mapsKey = `${platform}_maps`;
        const matchTypesKey = `${platform}_matchTypes`;
        const seasonsKey = `${platform}_seasons`;
        
        // Process Items
        if (DATABASE.rawFiles[itemTypesKey]) {
            Object.entries(DATABASE.rawFiles[itemTypesKey]).forEach(([id, item]) => {
                const category = (item.category || '').toLowerCase();
                const subCategory = (item.sub_category || '').toLowerCase();
                
                const dataItem = {
                    id,
                    platform,
                    name: item.name || id,
                    ...item
                };
                
                // Categorize
                if (category.includes('weapon') || subCategory.includes('weapon')) {
                    DATABASE.weapons.push(dataItem);
                } else if (category.includes('vehicle') || id.toLowerCase().includes('vehicle')) {
                    DATABASE.vehicles.push(dataItem);
                } else {
                    DATABASE.items.push(dataItem);
                }
            });
        }
        
        // Process Maps
        if (DATABASE.rawFiles[mapsKey]) {
            Object.entries(DATABASE.rawFiles[mapsKey]).forEach(([id, map]) => {
                DATABASE.maps.push({
                    id,
                    platform,
                    ...map
                });
            });
        }
        
        // Process Game Modes
        if (DATABASE.rawFiles[matchTypesKey]) {
            Object.entries(DATABASE.rawFiles[matchTypesKey]).forEach(([id, mode]) => {
                DATABASE.gameModes.push({
                    id,
                    platform,
                    name: mode
                });
            });
        }
        
        // Process Seasons
        if (DATABASE.rawFiles[seasonsKey]) {
            if (Array.isArray(DATABASE.rawFiles[seasonsKey])) {
                DATABASE.seasons.push(...DATABASE.rawFiles[seasonsKey].map(s => ({ ...s, platform })));
            }
        }
    });
}

// Render All
function renderAll() {
    updateStats();
    renderWeapons();
    renderItems();
    renderVehicles();
    renderMaps();
    renderDataViewer();
    renderRepoFiles();
    updateLastUpdate();
}

// Update Stats
function updateStats() {
    document.getElementById('statWeapons').textContent = DATABASE.weapons.length;
    document.getElementById('statItems').textContent = DATABASE.items.length;
    document.getElementById('statVehicles').textContent = DATABASE.vehicles.length;
    document.getElementById('statMaps').textContent = DATABASE.maps.length;
    document.getElementById('statGameModes').textContent = DATABASE.gameModes.length;
    document.getElementById('statTelemetry').textContent = DATABASE.telemetry.length;
}

// Render Weapons
function renderWeapons() {
    const grid = document.getElementById('weaponsGrid');
    grid.innerHTML = '';
    
    const weapons = filterByPlatform(DATABASE.weapons);
    
    // Create category filters
    const categories = [...new Set(weapons.map(w => w.sub_category).filter(Boolean))];
    const filtersContainer = document.getElementById('weaponFilters');
    filtersContainer.innerHTML = '<div class="chip active" data-filter="all">All</div>';
    categories.forEach(cat => {
        filtersContainer.innerHTML += `<div class="chip" data-filter="${cat}">${cat}</div>`;
    });
    
    // Add filter listeners
    filtersContainer.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filtersContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            renderFilteredWeapons(filter);
        });
    });
    
    weapons.slice(0, 50).forEach(weapon => {
        grid.appendChild(createItemCard(weapon, '🔫'));
    });
}

function renderFilteredWeapons(filter) {
    const grid = document.getElementById('weaponsGrid');
    grid.innerHTML = '';
    
    let weapons = filterByPlatform(DATABASE.weapons);
    if (filter !== 'all') {
        weapons = weapons.filter(w => w.sub_category === filter);
    }
    
    weapons.forEach(weapon => {
        grid.appendChild(createItemCard(weapon, '🔫'));
    });
}

// Render Items
function renderItems() {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';
    
    const items = filterByPlatform(DATABASE.items);
    
    // Create category filters
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
    const filtersContainer = document.getElementById('itemFilters');
    filtersContainer.innerHTML = '<div class="chip active" data-filter="all">All</div>';
    categories.forEach(cat => {
        filtersContainer.innerHTML += `<div class="chip" data-filter="${cat}">${cat}</div>`;
    });
    
    // Add filter listeners
    filtersContainer.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filtersContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            renderFilteredItems(filter);
        });
    });
    
    items.slice(0, 50).forEach(item => {
        grid.appendChild(createItemCard(item, '📦'));
    });
}

function renderFilteredItems(filter) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';
    
    let items = filterByPlatform(DATABASE.items);
    if (filter !== 'all') {
        items = items.filter(i => i.category === filter);
    }
    
    items.forEach(item => {
        grid.appendChild(createItemCard(item, '📦'));
    });
}

// Render Vehicles
function renderVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    grid.innerHTML = '';
    
    const vehicles = filterByPlatform(DATABASE.vehicles);
    
    vehicles.forEach(vehicle => {
        grid.appendChild(createItemCard(vehicle, '🚗'));
    });
}

// Render Maps
function renderMaps() {
    const grid = document.getElementById('mapsGrid');
    grid.innerHTML = '';
    
    const maps = filterByPlatform(DATABASE.maps);
    
    maps.forEach(map => {
        grid.appendChild(createMapCard(map));
    });
}

// Render Data Viewer
function renderDataViewer() {
    const tabsContainer = document.getElementById('dataTabs');
    const viewerContainer = document.getElementById('jsonViewer');
    
    tabsContainer.innerHTML = '';
    
    Object.keys(DATABASE.allData).forEach((key, index) => {
        const btn = document.createElement('button');
        btn.className = 'data-tab' + (index === 0 ? ' active' : '');
        btn.textContent = key;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.data-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            viewerContainer.innerHTML = `<pre>${JSON.stringify(DATABASE.allData[key], null, 2)}</pre>`;
        });
        tabsContainer.appendChild(btn);
    });
    
    // Show first data
    if (Object.keys(DATABASE.allData).length > 0) {
        const firstKey = Object.keys(DATABASE.allData)[0];
        viewerContainer.innerHTML = `<pre>${JSON.stringify(DATABASE.allData[firstKey], null, 2)}</pre>`;
    }
}

// Render Repo Files
function renderRepoFiles() {
    const container = document.getElementById('repoFiles');
    container.innerHTML = '';
    
    Object.keys(DATABASE.rawFiles).forEach(key => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <span>📄</span>
            <span>${key}</span>
        `;
        container.appendChild(div);
    });
}

// Create Item Card
function createItemCard(item, icon) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const props = Object.entries(item)
        .filter(([key]) => !['id', 'platform'].includes(key))
        .slice(0, 5)
        .map(([key, value]) => `
            <div class="item-prop">
                <span class="prop-label">${key}:</span>
                <span class="prop-value">${truncate(String(value), 30)}</span>
            </div>
        `).join('');
    
    card.innerHTML = `
        <h3>${icon} ${item.name || item.id}</h3>
        <div class="item-prop">
            <span class="prop-label">Platform:</span>
            <span class="prop-value">${item.platform}</span>
        </div>
        ${props}
    `;
    
    return card;
}

// Create Map Card
function createMapCard(map) {
    const card = document.createElement('div');
    card.className = 'map-card';
    
    card.innerHTML = `
        <div class="map-header">🗺️</div>
        <div class="map-body">
            <div class="map-name">${map.map_name || map.id}</div>
            <div class="item-prop">
                <span class="prop-label">Platform:</span>
                <span class="prop-value">${map.platform}</span>
            </div>
            <div class="item-prop">
                <span class="prop-label">ID:</span>
                <span class="prop-value">${map.id}</span>
            </div>
            ${map.display_name ? `
            <div class="item-prop">
                <span class="prop-label">Display Name:</span>
                <span class="prop-value">${map.display_name}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Filter by Platform
function filterByPlatform(data) {
    if (currentPlatform === 'all') return data;
    return data.filter(item => item.platform === currentPlatform);
}

// Handle Global Search
function handleGlobalSearch(e) {
    const term = e.target.value.toLowerCase();
    
    document.querySelectorAll('.item-card, .map-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

// Utility Functions
function updateProgress(percent) {
    loadProgress = percent;
    document.getElementById('loadProgress').style.width = `${percent}%`;
}

function updateLoadStatus(status) {
    document.getElementById('loadStatus').textContent = status;
}

function hideLoading() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function updateLastUpdate() {
    const now = new Date().toLocaleString();
    document.getElementById('lastUpdate').textContent = now;
}

function truncate(str, length) {
    return str.length > length ? str.substring(0, length) + '...' : str;
}

// Auto refresh every 30 minutes
setInterval(loadAllData, 1800000);
