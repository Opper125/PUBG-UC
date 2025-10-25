// Configuration
const GITHUB_API = 'https://api.github.com/repos/pubg/api-assets';
const RAW_CONTENT = 'https://raw.githubusercontent.com/pubg/api-assets/master';

// State
let currentCategory = 'telemetry';
let allData = {};
let searchTerm = '';

// DOM Elements
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const dataContainer = document.getElementById('dataContainer');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const totalItems = document.getElementById('totalItems');
const totalCategories = document.getElementById('totalCategories');
const lastUpdated = document.getElementById('lastUpdated');
const statsContainer = document.getElementById('statsContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderData();
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderData();
    });

    // Refresh
    refreshBtn.addEventListener('click', () => {
        loadData();
    });
}

// Load Data from GitHub
async function loadData() {
    showLoading(true);
    hideError();
    
    try {
        // Fetch repository contents
        const response = await fetch(`${GITHUB_API}/contents`);
        const contents = await response.json();
        
        // Get JSON files from different categories
        await Promise.all([
            loadCategoryData('telemetry', 'dictionaries/telemetry'),
            loadCategoryData('maps', 'dictionaries/pc'),
            loadCategoryData('items', 'dictionaries/pc'),
            loadCategoryData('seasons', 'dictionaries/pc')
        ]);
        
        updateStats();
        renderData();
        showLoading(false);
        
    } catch (err) {
        console.error('Error loading data:', err);
        showError();
        showLoading(false);
    }
}

// Load Category Data
async function loadCategoryData(category, path) {
    try {
        let data = [];
        
        if (category === 'telemetry') {
            // Load telemetry events
            const response = await fetch(`${RAW_CONTENT}/dictionaries/telemetry/telemetryEvents.json`);
            data = await response.json();
        } else if (category === 'maps') {
            // Load map data
            const mapResponse = await fetch(`${RAW_CONTENT}/dictionaries/pc/maps.json`);
            data = await mapResponse.json();
        } else if (category === 'items') {
            // Load items data
            const itemsResponse = await fetch(`${RAW_CONTENT}/dictionaries/pc/itemTypes.json`);
            data = await itemsResponse.json();
        } else if (category === 'seasons') {
            // Load seasons data
            const seasonsResponse = await fetch(`${RAW_CONTENT}/dictionaries/pc/seasons.json`);
            data = await seasonsResponse.json();
        }
        
        allData[category] = Array.isArray(data) ? data : [data];
        
    } catch (err) {
        console.error(`Error loading ${category}:`, err);
        allData[category] = [];
    }
}

// Render Data
function renderData() {
    dataContainer.innerHTML = '';
    
    const categoryData = allData[currentCategory] || [];
    
    // Filter data based on search
    const filteredData = filterData(categoryData);
    
    if (filteredData.length === 0) {
        dataContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h2>📭 ဒေတာ မရှိပါ</h2>
                <p>ရှာဖွေမှု ကိုက်ညီသော ရလဒ် မတွေ့ပါ</p>
            </div>
        `;
        return;
    }
    
    // Render cards based on category
    filteredData.forEach((item, index) => {
        const card = createDataCard(item, currentCategory, index);
        dataContainer.appendChild(card);
    });
}

// Create Data Card
function createDataCard(item, category, index) {
    const card = document.createElement('div');
    card.className = 'data-card';
    
    let content = '';
    
    if (category === 'telemetry') {
        content = `
            <h3>${item.name || item.type || `Event ${index + 1}`}</h3>
            ${createDataItem('Type', item.type)}
            ${createDataItem('Description', item.description)}
            ${item.category ? createDataItem('Category', item.category) : ''}
        `;
    } else if (category === 'maps') {
        content = `
            <h3>${item.displayName || item.mapName || `Map ${index + 1}`}</h3>
            ${createDataItem('Map Name', item.mapName)}
            ${createDataItem('ID', item.id)}
            ${createDataItem('Display Name', item.displayName)}
        `;
    } else if (category === 'items') {
        content = `
            <h3>${item.displayName || item.name || `Item ${index + 1}`}</h3>
            ${createDataItem('Name', item.name)}
            ${createDataItem('ID', item.itemId)}
            ${createDataItem('Category', item.category)}
            ${createDataItem('Sub Category', item.subCategory)}
        `;
    } else if (category === 'seasons') {
        content = `
            <h3>${item.id || `Season ${index + 1}`}</h3>
            ${createDataItem('Season', item.id)}
            ${createDataItem('Is Current', item.isCurrentSeason ? '✅ Yes' : '❌ No')}
            ${createDataItem('Is Off-season', item.isOffseason ? '✅ Yes' : '❌ No')}
        `;
    } else {
        // Generic object display
        content = `<h3>Item ${index + 1}</h3>`;
        Object.keys(item).slice(0, 5).forEach(key => {
            content += createDataItem(key, item[key]);
        });
    }
    
    card.innerHTML = content;
    return card;
}

// Create Data Item
function createDataItem(label, value) {
    if (!value && value !== 0 && value !== false) return '';
    
    const displayValue = typeof value === 'object' ? 
        JSON.stringify(value).substring(0, 50) + '...' : 
        value;
    
    return `
        <div class="data-item">
            <strong>${label}:</strong> ${displayValue}
        </div>
    `;
}

// Filter Data
function filterData(data) {
    if (!searchTerm) return data;
    
    return data.filter(item => {
        const searchString = JSON.stringify(item).toLowerCase();
        return searchString.includes(searchTerm);
    });
}

// Update Stats
function updateStats() {
    const totalItemsCount = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);
    const totalCategoriesCount = Object.keys(allData).length;
    
    totalItems.textContent = totalItemsCount;
    totalCategories.textContent = totalCategoriesCount;
    lastUpdated.textContent = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// UI Helper Functions
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    dataContainer.style.display = show ? 'none' : 'block';
    statsContainer.style.display = show ? 'none' : 'grid';
}

function showError() {
    error.style.display = 'block';
}

function hideError() {
    error.style.display = 'none';
}

// Auto-refresh every 5 minutes
setInterval(() => {
    loadData();
}, 300000);
