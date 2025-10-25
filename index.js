// PUBG API Configuration
const GITHUB_RAW = 'https://raw.githubusercontent.com/pubg/api-assets/master';
const GITHUB_API = 'https://api.github.com/repos/pubg/api-assets';

// Global State
const gameData = {
    weapons: [],
    vehicles: [],
    maps: [],
    items: [],
    gameModes: [],
    seasons: [],
    telemetry: [],
    itemTypes: {}
};

let currentFilter = 'all';
let currentWeaponCategory = 'all';
let currentItemCategory = 'all';

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadAllGameData();
    hideLoading();
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href');
            document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderAllData();
        });
    });

    // Weapon Categories
    document.querySelectorAll('.weapon-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.weapon-categories .cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentWeaponCategory = btn.dataset.category;
            renderWeapons();
        });
    });

    // Item Categories
    document.querySelectorAll('.item-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.item-categories .cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentItemCategory = btn.dataset.category;
            renderItems();
        });
    });
}

// Load All Game Data
async function loadAllGameData() {
    showLoading();
    
    try {
        await Promise.all([
            loadItemTypes(),
            loadMaps(),
            loadTelemetry(),
            loadMatchTypes(),
            loadSeasons()
        ]);
        
        updateStats();
        renderAllData();
        updateLastUpdate();
        
    } catch (error) {
        console.error('Error loading game data:', error);
        alert('Error loading data. Please refresh the page.');
    }
}

// Load Item Types (Weapons, Items, etc.)
async function loadItemTypes() {
    try {
        const response = await fetch(`${GITHUB_RAW}/dictionaries/pc/itemTypes.json`);
        const data = await response.json();
        
        gameData.itemTypes = data;
        
        // Categorize items
        Object.entries(data).forEach(([key, item]) => {
            const category = item.category?.toLowerCase() || '';
            const subCategory = item.sub_category?.toLowerCase() || '';
            
            // Weapons
            if (category === 'weapon' || subCategory.includes('weapon')) {
                gameData.weapons.push({ ...item, id: key });
            }
            // Vehicles
            else if (category === 'vehicle' || key.toLowerCase().includes('vehicle')) {
                gameData.vehicles.push({ ...item, id: key });
            }
            // Other items
            else {
                gameData.items.push({ ...item, id: key });
            }
        });
        
    } catch (error) {
        console.error('Error loading item types:', error);
    }
}

// Load Maps
async function loadMaps() {
    try {
        const response = await fetch(`${GITHUB_RAW}/dictionaries/pc/maps.json`);
        const data = await response.json();
        gameData.maps = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
    } catch (error) {
        console.error('Error loading maps:', error);
    }
}

// Load Telemetry
async function loadTelemetry() {
    try {
        const response = await fetch(`${GITHUB_RAW}/dictionaries/telemetry/telemetryEvents.json`);
        const data = await response.json();
        gameData.telemetry = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ name: key, ...value }));
    } catch (error) {
        console.error('Error loading telemetry:', error);
    }
}

// Load Match Types
async function loadMatchTypes() {
    try {
        const response = await fetch(`${GITHUB_RAW}/dictionaries/pc/matchTypes.json`);
        const data = await response.json();
        gameData.gameModes = Object.entries(data).map(([key, value]) => ({ id: key, name: value }));
    } catch (error) {
        console.error('Error loading match types:', error);
    }
}

// Load Seasons
async function loadSeasons() {
    try {
        const response = await fetch(`${GITHUB_RAW}/dictionaries/pc/seasons.json`);
        const data = await response.json();
        gameData.seasons = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
    } catch (error) {
        console.error('Error loading seasons:', error);
    }
}

// Render All Data
function renderAllData() {
    renderWeapons();
    renderVehicles();
    renderMaps();
    renderItems();
    renderGameModes();
    renderTelemetry();
}

// Render Weapons
function renderWeapons() {
    const grid = document.getElementById('weaponsGrid');
    grid.innerHTML = '';
    
    let weapons = gameData.weapons;
    
    // Filter by category
    if (currentWeaponCategory !== 'all') {
        weapons = weapons.filter(w => {
            const subCat = (w.sub_category || '').toLowerCase();
            return subCat.includes(currentWeaponCategory);
        });
    }
    
    if (weapons.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-gray);">No weapons found</p>';
        return;
    }
    
    weapons.forEach(weapon => {
        const card = createItemCard(weapon, 'weapon');
        grid.appendChild(card);
    });
}

// Render Vehicles
function renderVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    grid.innerHTML = '';
    
    if (gameData.vehicles.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-gray);">No vehicles found</p>';
        return;
    }
    
    gameData.vehicles.forEach(vehicle => {
        const card = createItemCard(vehicle, 'vehicle');
        grid.appendChild(card);
    });
}

// Render Maps
function renderMaps() {
    const grid = document.getElementById('mapsGrid');
    grid.innerHTML = '';
    
    if (gameData.maps.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-gray);">No maps found</p>';
        return;
    }
    
    gameData.maps.forEach(map => {
        const card = createMapCard(map);
        grid.appendChild(card);
    });
}

// Render Items
function renderItems() {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';
    
    let items = gameData.items;
    
    // Filter by category
    if (currentItemCategory !== 'all') {
        items = items.filter(item => {
            const category = (item.category || '').toLowerCase();
            const subCategory = (item.sub_category || '').toLowerCase();
            return category.includes(currentItemCategory) || subCategory.includes(currentItemCategory);
        });
    }
    
    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-gray);">No items found</p>';
        return;
    }
    
    items.slice(0, 50).forEach(item => {
        const card = createItemCard(item, 'item');
        grid.appendChild(card);
    });
}

// Render Game Modes
function renderGameModes() {
    const grid = document.getElementById('gameModesGrid');
    grid.innerHTML = '';
    
    const modes = [
        ...gameData.gameModes,
        ...gameData.seasons.map(s => ({ id: s.id, name: `Season: ${s.id}`, isSeason: true }))
    ];
    
    modes.forEach(mode => {
        const card = createModeCard(mode);
        grid.appendChild(card);
    });
}

// Render Telemetry
function renderTelemetry() {
    const grid = document.getElementById('telemetryGrid');
    grid.innerHTML = '';
    
    gameData.telemetry.slice(0, 30).forEach(event => {
        const card = createTelemetryCard(event);
        grid.appendChild(card);
    });
}

// Create Item Card
function createItemCard(item, type) {
    const card = document.createElement('div');
    card.className = 'item-card fade-in';
    
    const icon = getItemIcon(type, item);
    const name = item.name || item.id || 'Unknown Item';
    
    card.innerHTML = `
        <div class="item-icon">${icon}</div>
        <div class="item-name">${name}</div>
        <div class="item-details">
            ${item.category ? `<div class="item-detail">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${item.category}</span>
            </div>` : ''}
            ${item.sub_category ? `<div class="item-detail">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${item.sub_category}</span>
            </div>` : ''}
            ${item.stack_size ? `<div class="item-detail">
                <span class="detail-label">Stack Size:</span>
                <span class="detail-value">${item.stack_size}</span>
            </div>` : ''}
        </div>
    `;
    
    return card;
}

// Create Map Card
function createMapCard(map) {
    const card = document.createElement('div');
    card.className = 'map-card fade-in';
    
    const mapName = map.map_name || map.id || 'Unknown Map';
    const displayName = map.display_name || mapName;
    
    card.innerHTML = `
        <div class="map-image">
            <i class="fas fa-map-marked-alt"></i>
        </div>
        <div class="map-info">
            <div class="map-name">${displayName}</div>
            <div class="map-description">${mapName}</div>
            <div class="map-stats">
                <div class="map-stat">
                    <div class="map-stat-label">Map ID</div>
                    <div class="map-stat-value">${map.id}</div>
                </div>
                <div class="map-stat">
                    <div class="map-stat-label">Status</div>
                    <div class="map-stat-value">Active</div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Create Mode Card
function createModeCard(mode) {
    const card = document.createElement('div');
    card.className = 'mode-card fade-in';
    
    card.innerHTML = `
        <div class="mode-title">
            <i class="fas fa-${mode.isSeason ? 'trophy' : 'gamepad'}"></i>
            ${mode.name || mode.id}
        </div>
        <div class="mode-description">
            ${mode.isSeason ? `Season identifier: ${mode.id}` : `Match type: ${mode.id}`}
        </div>
    `;
    
    return card;
}

// Create Telemetry Card
function createTelemetryCard(event) {
    const card = document.createElement('div');
    card.className = 'telemetry-card fade-in';
    
    const name = event.name || event._T || event.type || 'Unknown Event';
    const type = event.type || event._T || 'Event';
    
    card.innerHTML = `
        <span class="telemetry-type">${type}</span>
        <div class="telemetry-name">${name}</div>
        <div class="telemetry-description">
            ${event.description || 'Telemetry event for tracking game statistics'}
        </div>
    `;
    
    return card;
}

// Get Item Icon
function getItemIcon(type, item) {
    const icons = {
        weapon: '🔫',
        vehicle: '🚗',
        equipment: '🎽',
        heal: '💊',
        boost: '⚡',
        throwable: '💣',
        attachment: '🔧',
        default: '📦'
    };
    
    const category = (item.category || '').toLowerCase();
    const subCategory = (item.sub_category || '').toLowerCase();
    
    if (type === 'weapon' || category === 'weapon') return icons.weapon;
    if (type === 'vehicle' || category === 'vehicle') return icons.vehicle;
    if (subCategory.includes('heal')) return icons.heal;
    if (subCategory.includes('boost')) return icons.boost;
    if (subCategory.includes('throwable')) return icons.throwable;
    if (subCategory.includes('attachment')) return icons.attachment;
    if (category === 'equipment') return icons.equipment;
    
    return icons.default;
}

// Handle Search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    document.querySelectorAll('.item-card, .map-card, .mode-card, .telemetry-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Update Stats
function updateStats() {
    document.getElementById('totalWeapons').textContent = gameData.weapons.length;
    document.getElementById('totalVehicles').textContent = gameData.vehicles.length;
    document.getElementById('totalMaps').textContent = gameData.maps.length;
    document.getElementById('totalItems').textContent = gameData.items.length;
}

// Update Last Update Time
function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = timeString;
}

// Loading Functions
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Auto-refresh every 10 minutes
setInterval(loadAllGameData, 600000);
