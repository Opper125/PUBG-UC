/* ========================================
   SUPABASE CONFIGURATION
======================================== */

const SUPABASE_URL = "https://vqumonhyeekgltvercbw.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdW1vbmh5ZWVrZ2x0dmVyY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgzMzAsImV4cCI6MjA3NzEzNDMzMH0._C5EiMWyNs65ymDuwle_8UEytEqhn2bwniNvC9G9j1I"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ========================================
   GLOBAL STATE MANAGEMENT
======================================== */

const AppState = {
  currentUser: null,
  currentPage: "home",
  websiteConfig: null,
  categories: [],
  products: [],
  orders: [],
  notifications: [],
  cart: [],
  selectedProduct: null,
  currentCategory: null,
  currentCategoryCard: null,
  musicPlaylist: [],
  currentSongIndex: 0,
  isPlaying: false,
  sessionActive: false,
  settings: null, // Added for settings
  subscriptions: [], // Added for realtime subscriptions
}

/* ========================================
   PROFANITY & VALIDATION FILTERS
======================================== */

const PROFANITY_LIST = [
  "fuck",
  "shit",
  "ass",
  "bitch",
  "damn",
  "hell",
  "အမေ",
  "အဖေ",
  "မိဘ",
  "ကောင်",
  "ခွေး",
  "ဘဲ",
  "လိုးတော",
  "လိုး",
  "မိုက်",
  "အရူး",
  "မျက်စိ",
]

const SPECIAL_CHARS = ["@", "#", "%", "*", "&", "®", "©"]

/* ========================================
   UTILITY FUNCTIONS
======================================== */

function showLoader() {
  const loader = document.getElementById("globalLoader")
  if (loader) {
    loader.classList.add("active")
    document.body.classList.add("no-scroll")
  }
}

function hideLoader() {
  const loader = document.getElementById("globalLoader")
  if (loader) {
    setTimeout(() => {
      loader.classList.remove("active")
      document.body.classList.remove("no-scroll")
    }, 300)
  }
}

function showToast(title, message, type = "info") {
  const toastContainer = document.getElementById("toastContainer")

  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const iconMap = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  }

  toast.innerHTML = `
        <i class="fas ${iconMap[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `

  toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = "toastSlideOut 0.3s ease forwards"
    setTimeout(() => toast.remove(), 300)
  }, 5000)
}

function sanitizeInput(input) {
  return input.replace(/[<>"']/g, "").trim()
}

function isEnglishOnly(text) {
  return /^[a-zA-Z0-9@#%*&®©._-]+$/.test(text)
}

function containsProfanity(text) {
  const lowerText = text.toLowerCase()
  return PROFANITY_LIST.some((word) => lowerText.includes(word))
}

function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)
}

function isValidPassword(password) {
  // At least 8 characters
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters" }

  // Must start with uppercase
  if (!/^[A-Z]/.test(password)) return { valid: false, message: "Password must start with uppercase letter" }

  // Must contain special character
  const hasSpecial = SPECIAL_CHARS.some((char) => password.includes(char))
  if (!hasSpecial) return { valid: false, message: "Password must contain special character (@#%*&®©)" }

  return { valid: true, message: "Valid password" }
}

function generateAIAvatar() {
  const colors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  ]

  const randomColor = colors[Math.floor(Math.random() * colors.length)]

  // Create SVG avatar with AI style
  const svg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${Date.now()}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(102,126,234);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgb(118,75,162);stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#grad${Date.now()})" />
            <circle cx="75" cy="85" r="8" fill="white" opacity="0.9"/>
            <circle cx="125" cy="85" r="8" fill="white" opacity="0.9"/>
            <path d="M 70 120 Q 100 140 130 120" stroke="white" stroke-width="4" fill="none" opacity="0.9"/>
        </svg>
    `

  return "data:image/svg+xml;base64," + btoa(svg)
}

function generateOrderId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-US").format(price) + " Ks"
}

function calculateDiscount(price, discountPercent) {
  if (!discountPercent || discountPercent === 0) return price
  return price - price * (discountPercent / 100)
}

async function uploadImage(file) {
  try {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { data, error } = await supabase.storage.from("images").upload(filePath, file)

    if (error) throw error

    const { data: publicURL } = supabase.storage.from("images").getPublicUrl(filePath)

    return publicURL.publicUrl
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
}

/* ========================================
   AUTHENTICATION SYSTEM
======================================== */

function openAuthModal() {
  const modal = document.getElementById("authModal")
  if (modal) {
    modal.classList.add("active")
    document.body.classList.add("no-scroll")
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal")
  if (modal) {
    modal.classList.remove("active")
    document.body.classList.remove("no-scroll")
  }
}

function switchToSignup() {
  document.getElementById("loginForm").classList.remove("active")
  document.getElementById("signupForm").classList.add("active")
}

function switchToLogin() {
  document.getElementById("signupForm").classList.remove("active")
  document.getElementById("loginForm").classList.add("active")
}

// Password visibility toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggleButtons = document.querySelectorAll(".toggle-password")

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const input = this.previousElementSibling
      if (input.type === "password") {
        input.type = "text"
        this.classList.replace("fa-eye", "fa-eye-slash")
      } else {
        input.type = "password"
        this.classList.replace("fa-eye-slash", "fa-eye")
      }
    })
  })
})

// Password requirements checker
document.getElementById("signupPassword")?.addEventListener("input", (e) => {
  const password = e.target.value

  // Requirement 1: At least 8 characters
  const req1 = document.getElementById("req1")
  if (password.length >= 8) {
    req1.classList.add("valid")
  } else {
    req1.classList.remove("valid")
  }

  // Requirement 2: Start with uppercase
  const req2 = document.getElementById("req2")
  if (/^[A-Z]/.test(password)) {
    req2.classList.add("valid")
  } else {
    req2.classList.remove("valid")
  }

  // Requirement 3: Special character
  const req3 = document.getElementById("req3")
  const hasSpecial = SPECIAL_CHARS.some((char) => password.includes(char))
  if (hasSpecial) {
    req3.classList.add("valid")
  } else {
    req3.classList.remove("valid")
  }
})

// Login Form Handler
document.getElementById("loginFormElement")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = sanitizeInput(document.getElementById("loginEmail").value)
  const password = document.getElementById("loginPassword").value

  if (!isValidGmail(email)) {
    showToast("Invalid Email", "Please use a valid Gmail address", "error")
    return
  }

  showLoader()

  try {
    // Check if user exists in database and is active
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .eq("status", "active") // Ensure user status is active
      .single()

    if (error || !users) {
      hideLoader()
      showToast("Login Failed", "Invalid email or password", "error")
      return
    }

    // Save session
    AppState.currentUser = users
    AppState.sessionActive = true

    localStorage.setItem("currentUser", JSON.stringify(users)) // Changed from userSession to currentUser

    closeAuthModal()
    hideLoader()
    await initializeApp() // Initialize app after successful login

    showToast("Welcome Back!", `Hello ${users.username}`, "success")
  } catch (error) {
    console.error("Login error:", error)
    hideLoader()
    showToast("Error", "An error occurred during login", "error")
  }
})

// Signup Form Handler
document.getElementById("signupFormElement")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = sanitizeInput(document.getElementById("signupUsername").value)
  const email = sanitizeInput(document.getElementById("signupEmail").value)
  const password = document.getElementById("signupPassword").value

  // Validation checks
  if (!isEnglishOnly(username)) {
    showToast("Invalid Username", "Username must contain only English characters", "error")
    return
  }

  if (containsProfanity(username)) {
    showToast("Invalid Username", "Username contains inappropriate language", "error")
    return
  }

  if (!isValidGmail(email)) {
    showToast("Invalid Email", "Please use a valid Gmail address (@gmail.com)", "error")
    return
  }

  // Profanity check for email (optional, but included in original)
  if (containsProfanity(email)) {
    showToast("Invalid Email", "Email contains inappropriate language", "error")
    return
  }

  const passwordCheck = isValidPassword(password)
  if (!passwordCheck.valid) {
    showToast("Invalid Password", passwordCheck.message, "error")
    return
  }

  // Check if email is same as password
  if (email.split("@")[0] === password) {
    showToast("Invalid Password", "Password cannot be the same as email", "error")
    return
  }

  showLoader()

  try {
    // Check if username already exists
    const { data: existingUsername } = await supabase.from("users").select("id").eq("username", username).single()

    // Check if email already exists
    const { data: existingEmail } = await supabase.from("users").select("id").eq("email", email).single()

    if (existingUsername) {
      hideLoader()
      showToast("Username Taken", "This username is already in use", "error")
      return
    }

    if (existingEmail) {
      hideLoader()
      showToast("Email Registered", "This email is already registered", "error")
      return
    }

    // Generate AI avatar
    const avatarUrl = generateAIAvatar()

    // Create new user
    const newUser = {
      username: username,
      email: email,
      password: password,
      profile_image: avatarUrl, // Changed from avatar to profile_image
      status: "active",
      created_at: new Date().toISOString(),
    }

    const { data: user, error } = await supabase.from("users").insert([newUser]).select().single()

    if (error) throw error

    // Auto login after signup
    AppState.currentUser = user
    AppState.sessionActive = true

    localStorage.setItem("currentUser", JSON.stringify(user)) // Changed from userSession to currentUser

    closeAuthModal()
    hideLoader()
    await initializeApp() // Initialize app after successful signup

    showToast("Account Created!", `Welcome ${user.username}!`, "success")
  } catch (error) {
    console.error("Signup error:", error)
    hideLoader()
    showToast("Error", "An error occurred during signup", "error")
  }
})

function logout() {
  AppState.currentUser = null
  AppState.sessionActive = false

  localStorage.removeItem("currentUser") // Changed from userSession to currentUser

  cleanupSubscriptions() // Cleanup realtime subscriptions on logout

  location.reload() // Reload the page to reset the UI
}

/* ========================================
   APP INITIALIZATION
======================================== */

async function initializeApp() {
  showLoader()

  try {
    // Check for saved session
    const savedUser = localStorage.getItem("currentUser") // Changed from userSession to currentUser
    if (savedUser && !AppState.sessionActive) {
      AppState.currentUser = JSON.parse(savedUser)
      AppState.sessionActive = true
    }

    if (!AppState.sessionActive) {
      // If no active session, show auth modal and return
      hideLoader()
      openAuthModal()
      return
    }

    // Load website config
    await loadWebsiteConfig()

    // Load categories
    await loadCategories()

    // Load banners
    await loadBanners()

    // Load music playlist
    await loadMusicPlaylist()

    // Load notifications
    await loadNotifications()

    // Setup realtime subscriptions
    setupRealtimeSubscriptions()

    // Update UI elements that depend on user data
    updateUserUI()

    hideLoader()
  } catch (error) {
    console.error("Init error:", error)
    hideLoader()
    showToast("Error", "Failed to initialize app", "error")
  }
}

async function loadWebsiteConfig() {
  try {
    const { data, error } = await supabase.from("website_config").select("*").single()

    if (error) throw error

    AppState.websiteConfig = data

    // Update logo
    if (data.logo_url) {
      const logoElement = document.getElementById("websiteLogo")
      if (logoElement) logoElement.src = data.logo_url
    }

    // Update title
    if (data.website_name) {
      document.title = data.website_name
    }
  } catch (error) {
    console.error("Config load error:", error)
  }
}

function updateUserUI() {
  if (!AppState.currentUser) return

  // Update profile images
  const profileImg = document.getElementById("userProfileImg")
  const menuAvatar = document.getElementById("userMenuAvatar")

  if (profileImg) profileImg.src = AppState.currentUser.profile_image
  if (menuAvatar) menuAvatar.src = AppState.currentUser.profile_image

  // Update user info
  const menuName = document.getElementById("userMenuName")
  const menuEmail = document.getElementById("userMenuEmail")

  if (menuName) menuName.textContent = AppState.currentUser.username
  if (menuEmail) menuEmail.textContent = AppState.currentUser.email
}

/* ========================================
   BANNER SYSTEM
======================================== */

async function loadBanners() {
  try {
    // Load main banners
    const { data: mainBanners, error: mainError } = await supabase
      .from("banners")
      .select("*")
      .eq("type", "main")
      .eq("status", "active")
      .order("order", { ascending: true })

    if (mainError) throw mainError

    if (mainBanners && mainBanners.length > 0) {
      renderMainBanners(mainBanners)
    }

    // Load secondary banners
    const { data: secondaryBanners, error: secondaryError } = await supabase
      .from("banners")
      .select("*")
      .eq("type", "secondary")
      .eq("status", "active")
      .order("order", { ascending: true })

    if (secondaryError) throw secondaryError

    if (secondaryBanners && secondaryBanners.length > 0) {
      renderSecondaryBanners(secondaryBanners)
    }
  } catch (error) {
    console.error("Banners load error:", error)
  }
}

function renderMainBanners(banners) {
  const container = document.querySelector("#mainBannerSlider .banner-slides")
  const indicators = document.querySelector("#mainBannerSlider .banner-indicators")

  if (!container || !indicators) return

  container.innerHTML = ""
  indicators.innerHTML = ""

  banners.forEach((banner, index) => {
    // Create slide
    const slide = document.createElement("div")
    slide.className = `banner-slide ${index === 0 ? "active" : ""}`
    slide.innerHTML = `<img src="${banner.image_url}" alt="${banner.title || "Banner"}">`
    container.appendChild(slide)

    // Create indicator
    const indicator = document.createElement("div")
    indicator.className = `banner-indicator ${index === 0 ? "active" : ""}`
    indicator.addEventListener("click", () => goToSlide(index))
    indicators.appendChild(indicator)
  })

  // Auto-slide
  let currentSlide = 0
  // Clear any existing interval before starting a new one
  if (window.mainBannerInterval) clearInterval(window.mainBannerInterval)
  window.mainBannerInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % banners.length
    goToSlide(currentSlide)
  }, 5000)
}

function goToSlide(index) {
  const slides = document.querySelectorAll("#mainBannerSlider .banner-slide")
  const indicators = document.querySelectorAll("#mainBannerSlider .banner-indicator")

  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add("active")
    } else {
      slide.classList.remove("active")
    }
  })

  indicators.forEach((indicator, i) => {
    if (i === index) {
      indicator.classList.add("active")
    } else {
      indicator.classList.remove("active")
    }
  })
}

function renderSecondaryBanners(banners) {
  const container = document.getElementById("secondaryBanner")
  if (!container) return

  container.innerHTML = '<div class="secondary-banner-slider"></div>'
  const slider = container.querySelector(".secondary-banner-slider")

  banners.forEach((banner, index) => {
    const item = document.createElement("div")
    item.className = "secondary-banner-item"

    // Initial positioning for the carousel effect
    if (index === 0) item.classList.add("center")
    else if (index === 1) item.classList.add("right")
    else item.classList.add("left")

    item.innerHTML = `<img src="${banner.image_url}" alt="${banner.title || "Banner"}">`

    // Add link functionality if provided
    if (banner.link) {
      item.style.cursor = "pointer"
      item.addEventListener("click", () => {
        window.open(banner.link, "_blank")
      })
    }

    slider.appendChild(item)
  })

  // Auto-rotate
  if (banners.length > 1) {
    let currentIndex = 0
    // Clear any existing interval before starting a new one
    if (window.secondaryBannerInterval) clearInterval(window.secondaryBannerInterval)
    window.secondaryBannerInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % banners.length
      rotateSecondaryBanners(banners.length, currentIndex)
    }, 4000)
  }
}

function rotateSecondaryBanners(total, centerIndex) {
  const items = document.querySelectorAll(".secondary-banner-item")

  items.forEach((item, index) => {
    item.classList.remove("center", "left", "right") // Reset classes

    // Assign classes based on the new center index
    if (index === centerIndex) {
      item.classList.add("center")
    } else if (index === (centerIndex + 1) % total) {
      item.classList.add("right")
    } else {
      item.classList.add("left")
    }
  })
}

/* ========================================
   CATEGORIES SYSTEM
======================================== */

async function loadCategories() {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("status", "active")
      .order("order", { ascending: true }) // Use 'order' column for ordering

    if (error) throw error

    AppState.categories = categories || []

    renderCategories()
  } catch (error) {
    console.error("Categories load error:", error)
  }
}

function renderCategories() {
  const container = document.getElementById("categoriesList")
  if (!container) return

  container.innerHTML = ""

  // Group categories by parent category for a hierarchical structure
  const grouped = {}

  AppState.categories.forEach((cat) => {
    const parent = cat.parent_category || "Main" // Default to 'Main' if no parent
    if (!grouped[parent]) {
      grouped[parent] = []
    }
    grouped[parent].push(cat)
  })

  // Render each group
  Object.entries(grouped).forEach(([parent, cats]) => {
    const group = document.createElement("div")
    group.className = "category-group"

    group.innerHTML = `
            <h3 class="category-title">
                <i class="fas fa-gamepad"></i>
                ${parent}
            </h3>
            <div class="category-cards-grid"></div>
        `

    const grid = group.querySelector(".category-cards-grid")

    cats.forEach((category) => {
      const card = document.createElement("div")
      card.className = "category-card"
      card.onclick = () => openCategory(category) // Open category details on click

      card.innerHTML = `
                <div class="category-card-content">
                    <div class="category-icon-wrapper">
                        <img src="${category.icon_url}" alt="${category.name}" class="category-icon">
                        ${category.flag_url ? `<img src="${category.flag_url}" alt="Flag" class="category-flag">` : ""}
                        ${
                          category.discount_percent > 0
                            ? `
                            <div class="category-discount-badge">-${category.discount_percent}%</div>
                        `
                            : ""
                        }
                    </div>
                    <div class="category-name">${category.name}</div>
                    ${category.description ? `<div class="category-description">${category.description}</div>` : ""}
                </div>
            `

      grid.appendChild(card)
    })

    container.appendChild(group)
  })
}

async function openCategory(category) {
  AppState.currentCategory = category
  AppState.currentCategoryCard = category // Assuming currentCategoryCard is used similarly

  showLoader()

  try {
    // Load products for this category
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", category.id)
      .eq("status", "active")
      .order("order", { ascending: true }) // Use 'order' column for ordering

    if (error) throw error

    AppState.products = products || []

    // Load category-specific data (banners, input tables, guidelines, videos, feedback)
    await loadCategoryBanners(category.id)
    await loadCategoryInputTables(category.id)
    await loadCategoryGuidelines(category.id)
    await loadCategoryYoutubeVideos(category.id)
    await loadCategoryFeedback(category.id)

    // Update UI elements for the category page
    const categoryIconElement = document.getElementById("categoryIcon")
    const categoryNameElement = document.getElementById("categoryName")
    if (categoryIconElement) categoryIconElement.src = category.icon_url
    if (categoryNameElement) categoryNameElement.textContent = category.name

    // Render the products for the category
    renderProducts()

    // Switch to the category products page
    switchPage("categoryProducts")

    hideLoader()
  } catch (error) {
    console.error("Category open error:", error)
    hideLoader()
    showToast("Error", "Failed to load category", "error")
  }
}

function renderProducts() {
  const container = document.getElementById("productsList")
  if (!container) return

  container.innerHTML = "" // Clear existing products

  if (!AppState.products || AppState.products.length === 0) {
    container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No products available</p>
            </div>
        `
    return
  }

  AppState.products.forEach((product) => {
    const card = document.createElement("div")
    card.className = "product-card"
    card.dataset.productId = product.id
    card.onclick = () => openProductDetail(product) // Open product details on click

    const finalPrice = calculateDiscount(product.price, product.discount_percent)

    card.innerHTML = `
        <div class="product-image-wrapper">
            <img src="${product.image_url}" alt="${product.name}" class="product-image">
            ${
              product.type
                ? `
                <div class="product-type-badge" style="background: ${getTypeBadgeColor(product.type)};">
                    ${product.type}
                </div>
            `
                : ""
            }
            ${
              product.discount_percent > 0
                ? `
                <div class="product-discount-badge">-${product.discount_percent}%</div>
            `
                : ""
            }
        </div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-amount">${product.amount || "N/A"}</div>
            <div class="product-price-row">
                ${
                  product.discount_percent > 0
                    ? `
                    <span class="product-price-original">${formatPrice(product.price)}</span>
                `
                    : ""
                }
                <span class="product-price">${formatPrice(finalPrice)}</span>
            </div>
        </div>
    `

    container.appendChild(card)
  })
}

// Helper function to determine background color for product type badges
function getTypeBadgeColor(type) {
  const colors = {
    Premium: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
    Popular: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    New: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    Hot: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    // Add more types and colors as needed
  }
  return colors[type] || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" // Default color
}

async function loadCategoryBanners(categoryId) {
  try {
    const { data: banners, error } = await supabase
      .from("category_banners")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    if (banners && banners.length > 0) {
      renderCategoryBanners(banners)
    } else {
      document.getElementById("productsPageBanner").innerHTML = "" // Clear banner if none exist
    }
  } catch (error) {
    console.error("Category banners load error:", error)
  }
}

function renderCategoryBanners(banners) {
  const container = document.getElementById("productsPageBanner")
  if (!container) return

  container.innerHTML = '<div class="products-banner-slider"></div>'
  const slider = container.querySelector(".products-banner-slider")

  banners.forEach((banner, index) => {
    const item = document.createElement("div")
    item.className = "products-banner-item"

    // Initial positioning for the carousel effect
    if (index === 0) item.classList.add("center")
    else if (index === 1) item.classList.add("right")
    else item.classList.add("left")

    item.innerHTML = `<img src="${banner.image_url}" alt="${banner.title || "Banner"}">`
    slider.appendChild(item)
  })

  // Auto-rotate
  if (banners.length > 1) {
    let currentIndex = 0
    // Clear any existing interval before starting a new one
    if (window.secondaryBannerInterval) clearInterval(window.secondaryBannerInterval) // Re-using interval name, ideally unique
    window.secondaryBannerInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % banners.length
      rotateCategoryBanners(banners.length, currentIndex)
    }, 4000)
  }
}

function rotateCategoryBanners(total, centerIndex) {
  const items = document.querySelectorAll(".products-banner-item")

  items.forEach((item, index) => {
    item.classList.remove("center", "left", "right") // Reset classes

    // Assign classes based on the new center index
    if (index === centerIndex) {
      item.classList.add("center")
    } else if (index === (centerIndex + 1) % total) {
      item.classList.add("right")
    } else {
      item.classList.add("left")
    }
  })
}

async function loadCategoryInputTables(categoryId) {
  try {
    const { data: tables, error } = await supabase
      .from("input_tables")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    if (tables && tables.length > 0) {
      renderInputTables(tables)
    } else {
      document.getElementById("productInputTables").innerHTML = "" // Clear if no tables
    }
  } catch (error) {
    console.error("Input tables load error:", error)
  }
}

function renderInputTables(tables) {
  const container = document.getElementById("productInputTables")
  if (!container) return

  container.innerHTML = ""

  tables.forEach((table) => {
    const group = document.createElement("div")
    group.className = "input-table-group"

    let fieldsHTML = ""

    try {
      const fields = JSON.parse(table.fields) // Assuming 'fields' is a JSON string of field objects

      fields.forEach((field) => {
        fieldsHTML += `
                <div class="input-table-field">
                    <label class="input-table-label">${field.label}</label>
                    <input 
                        type="${field.type || "text"}" 
                        class="input-table-input" 
                        placeholder="${field.placeholder || ""}"
                        data-field-name="${field.name}"
                        ${field.required ? "required" : ""}
                    >
                </div>
            `
      })
    } catch (e) {
      console.error("Fields parse error:", e)
    }

    group.innerHTML = `
            <h3 class="input-table-title">${table.title}</h3>
            ${fieldsHTML}
        `

    container.appendChild(group)
  })
}

async function loadCategoryGuidelines(categoryId) {
  try {
    const { data: guidelines, error } = await supabase
      .from("guidelines")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    if (guidelines && guidelines.length > 0) {
      renderGuidelines(guidelines)
    } else {
      document.getElementById("productGuidelines").innerHTML = "" // Clear if no guidelines
    }
  } catch (error) {
    console.error("Guidelines load error:", error)
  }
}

function renderGuidelines(guidelines) {
  const container = document.getElementById("productGuidelines")
  if (!container) return

  container.innerHTML = '<h2 class="section-title">Guidelines</h2>' // Add section title

  guidelines.forEach((guideline) => {
    const card = document.createElement("div")
    card.className = "guideline-card"

    let socialsHTML = ""
    if (guideline.social_links) {
      try {
        // Assuming social_links is a JSON string like {"facebook": "url", "twitter": "url"}
        const socials = JSON.parse(guideline.social_links)
        socialsHTML = '<div class="guideline-socials">'

        // Iterate over the platform names (keys)
        Object.entries(socials).forEach(([platform, url]) => {
          if (url) {
            // Use platform name directly for Font Awesome icon class
            socialsHTML += `
                        <a href="${url}" target="_blank" class="guideline-social-btn">
                            <i class="fab fa-${platform.toLowerCase()}"></i>
                        </a>
                    `
          }
        })

        socialsHTML += "</div>"
      } catch (e) {
        console.error("Socials parse error:", e)
      }
    }

    card.innerHTML = `
            <div class="guideline-header">
                ${guideline.icon_url ? `<img src="${guideline.icon_url}" alt="Icon" class="guideline-icon">` : ""}
                <div>
                    <h3 class="guideline-title">${guideline.title}</h3>
                </div>
            </div>
            <div class="guideline-content">${guideline.content}</div>
            ${socialsHTML}
        `

    container.appendChild(card)
  })
}

async function loadCategoryYoutubeVideos(categoryId) {
  try {
    const { data: videos, error } = await supabase
      .from("youtube_videos")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    if (videos && videos.length > 0) {
      renderYoutubeVideos(videos)
    } else {
      document.getElementById("productYoutubeVideos").innerHTML = "" // Clear if no videos
    }
  } catch (error) {
    console.error("Youtube videos load error:", error)
  }
}

function renderYoutubeVideos(videos) {
  const container = document.getElementById("productYoutubeVideos")
  if (!container) return

  container.innerHTML = '<h2 class="youtube-section-title">Tutorial Videos</h2>' // Add section title

  videos.forEach((video) => {
    const card = document.createElement("div")
    card.className = "youtube-video-card"

    // Extract video ID from URL
    let videoId = ""
    try {
      const url = new URL(video.video_url)
      // Handle standard YouTube watch URLs and short URLs
      videoId = url.searchParams.get("v") || url.pathname.split("/").pop()
    } catch (e) {
      console.error("Video URL parse error:", e)
    }

    card.innerHTML = `
                <div class="youtube-video-wrapper">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}" 
                        allowfullscreen
                        loading="lazy" 
                    ></iframe>
                </div>
                ${video.description ? `<div class="youtube-video-description">${video.description}</div>` : ""}
            `

    container.appendChild(card)
  })
}

async function loadCategoryFeedback(categoryId) {
  try {
    const { data: feedbacks, error } = await supabase
      .from("feedback")
      .select("*, users(username, profile_image)") // Join with users table
      .eq("category_id", categoryId)
      .eq("status", "approved") // Only load approved feedback
      .order("created_at", { ascending: false })
      .limit(20) // Limit to latest 20 feedbacks

    if (error) throw error

    if (feedbacks && feedbacks.length > 0) {
      renderFeedback(feedbacks)
    } else {
      document.getElementById("productFeedback").innerHTML = "" // Clear if no feedback
    }
  } catch (error) {
    console.error("Feedback load error:", error)
  }
}

function renderFeedback(feedbacks) {
  const container = document.getElementById("productFeedback")
  if (!container) return

  // Calculate average rating
  const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
  const totalReviews = feedbacks.length

  container.innerHTML = `
            <div class="feedback-header">
                <h2 class="feedback-title">Customer Reviews</h2>
                <p class="feedback-description">See what our customers are saying</p>
            </div>
            
            <div class="feedback-stats">
                <div class="overall-rating">
                    <div class="rating-number">${avgRating.toFixed(1)}</div>
                    <div class="rating-stars">
                        ${generateStars(avgRating)}
                    </div>
                    <div class="rating-count">${totalReviews} reviews</div>
                </div>
            </div>
            
            <div class="feedback-list"></div>
        `

  const list = container.querySelector(".feedback-list")

  feedbacks.forEach((feedback) => {
    const item = document.createElement("div")
    item.className = "feedback-item"

    item.innerHTML = `
                <div class="feedback-user">
                    <img src="${feedback.users?.profile_image || generateAIAvatar()}" alt="User">
                    <div>
                        <div class="feedback-username">${feedback.users?.username || "Anonymous"}</div>
                        <div class="feedback-date">${new Date(feedback.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="feedback-rating">
                    ${generateStars(feedback.rating)}
                </div>
                <div class="feedback-comment">${feedback.comment}</div>
            `

    list.appendChild(item)
  })
}

// Helper to generate star icons (handles half stars)
function generateStars(rating) {
  let stars = ""
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      // Full star
      stars += `<i class="fas fa-star" style="color: var(--accent-gold);"></i>`
    } else if (i - 0.5 <= rating) {
      // Half star
      stars += `<i class="fas fa-star-half-alt" style="color: var(--accent-gold);"></i>`
    } else {
      // Empty star
      stars += `<i class="far fa-star" style="color: var(--text-muted);"></i>`
    }
  }
  return stars
}

/* ========================================
   PRODUCT DETAIL & ORDER SYSTEM
======================================== */

async function openProductDetail(product) {
  AppState.selectedProduct = product

  showLoader()

  try {
    // Fetch payment methods associated with the product
    const { data: productPaymentMethods, error: ppmError } = await supabase
      .from("product_payment_methods")
      .select("payment_method_id, payment_methods (*)") // Select payment method details too
      .eq("product_id", product.id)
      .filter("payment_methods.status", "eq", "active") // Filter by active payment methods

    if (ppmError) {
      console.error("Payment methods load error:", ppmError)
    }

    const modal = document.getElementById("productDetailModal")
    const content = document.getElementById("productDetailContent")

    const finalPrice = calculateDiscount(product.price, product.discount_percent)

    let paymentMethodsHTML = ""

    if (productPaymentMethods && productPaymentMethods.length > 0) {
      paymentMethodsHTML = `
                <div class="payment-methods-section">
                    <h3>Select Payment Method</h3>
                    <div class="payment-methods-grid">
                        ${productPaymentMethods
                          .map(
                            (ppm) => `
                                <div class="payment-method-card" onclick="selectPaymentMethod('${ppm.payment_methods.id}', '${ppm.payment_methods.name}')">
                                    <img src="${ppm.payment_methods.icon_url}" alt="${ppm.payment_methods.name}">
                                    <div class="payment-method-name">${ppm.payment_methods.name}</div>
                                </div>
                            `,
                          )
                          .join("")}
                    </div>
                </div>
            `
    } else {
      // Display message if no payment methods are available for the product
      paymentMethodsHTML = `
                <div class="payment-methods-section">
                    <div class="no-payment-methods">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>No payment methods available for this product</p>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Please contact support</p>
                    </div>
                </div>
            `
    }

    content.innerHTML = `
            <div class="product-detail-image">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            
            <div class="product-detail-info">
                <h2 class="product-detail-name">${product.name}</h2>
                <div class="product-detail-amount">${product.amount || "N/A"}</div>
                
                <div class="product-detail-price-section">
                    ${
                      product.discount_percent > 0
                        ? `
                        <div class="product-detail-price-original">${formatPrice(product.price)}</div>
                        <div class="product-detail-discount-badge">Save ${product.discount_percent}%</div>
                    `
                        : ""
                    }
                    <div class="product-detail-price">${formatPrice(finalPrice)}</div>
                </div>
                
                ${
                  product.description
                    ? `
                    <div class="product-detail-description">
                        <h3>Description</h3>
                        <p>${product.description}</p>
                    </div>
                `
                    : ""
                }
                
                ${paymentMethodsHTML}
                
                <button class="buy-now-btn" onclick="proceedToOrder()">
                    <i class="fas fa-shopping-cart"></i>
                    Buy Now
                </button>
            </div>
        `

    modal.classList.add("active")
    document.body.classList.add("no-scroll")

    hideLoader()
  } catch (error) {
    console.error("Product detail error:", error)
    hideLoader()
    showToast("Error", "Failed to load product details", "error")
  }
}

// Global variables to track selected payment method
let selectedPaymentMethodId = null
let selectedPaymentMethodName = null

function selectPaymentMethod(methodId, methodName) {
  selectedPaymentMethodId = methodId
  selectedPaymentMethodName = methodName

  // Update UI: visually select the chosen method
  document.querySelectorAll(".payment-method-card").forEach((card) => {
    card.classList.remove("selected")
  })
  event.currentTarget.classList.add("selected") // Highlight the selected card

  showToast("Payment Method Selected", methodName, "success")
}

function closeProductDetail() {
  const modal = document.getElementById("productDetailModal")
  modal.classList.remove("active")
  document.body.classList.remove("no-scroll")

  // Reset selection
  selectedPaymentMethodId = null
  selectedPaymentMethodName = null
}

async function proceedToOrder() {
  if (!AppState.selectedProduct) {
    showToast("Error", "No product selected", "error")
    return
  }

  if (!selectedPaymentMethodId) {
    showToast("Payment Required", "Please select a payment method", "warning")
    return
  }

  // Collect data from input tables
  const inputData = {}
  let validInput = true
  document.querySelectorAll(".input-table-input").forEach((input) => {
    const fieldName = input.dataset.fieldName
    const value = input.value.trim()

    // Validate required fields
    if (input.required && !value) {
      showToast("Required Field", `Please fill in the "${fieldName}" field`, "warning")
      input.style.borderColor = "#ef4444" // Highlight invalid input
      validInput = false
      return // Stop processing this input
    } else {
      input.style.borderColor = "" // Reset border if valid
    }
    inputData[fieldName] = value
  })

  if (!validInput) {
    return // Stop if any validation failed
  }

  showLoader()

  try {
    // Fetch details of the selected payment method
    const { data: paymentMethod, error: pmError } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("id", selectedPaymentMethodId)
      .single()

    if (pmError) throw pmError

    // Show the payment confirmation modal
    showPaymentConfirmation(paymentMethod, inputData)

    hideLoader()
  } catch (error) {
    console.error("Order proceed error:", error)
    hideLoader()
    showToast("Error", "Failed to proceed with order", "error")
  }
}

function showPaymentConfirmation(paymentMethod, inputData) {
  const modal = document.getElementById("orderConfirmModal")
  const content = document.getElementById("orderConfirmContent")

  const product = AppState.selectedProduct
  const finalPrice = calculateDiscount(product.price, product.discount_percent)

  content.innerHTML = `
        <div class="order-confirm-header">
            <h2>Complete Payment</h2>
            <p>Transfer to the account below</p>
        </div>
        
        <div class="payment-details-card">
            <div class="payment-method-info">
                <img src="${paymentMethod.icon_url}" alt="${paymentMethod.name}">
                <h3>${paymentMethod.name}</h3>
            </div>
            
            ${
              paymentMethod.qr_code_url
                ? `
                <div class="payment-qr-code">
                    <img src="${paymentMethod.qr_code_url}" alt="QR Code">
                </div>
            `
                : ""
            }
            
            <div class="payment-account-details">
                <div class="payment-detail-row">
                    <span>Account Name:</span>
                    <strong>${paymentMethod.account_name}</strong>
                </div>
                <div class="payment-detail-row">
                    <span>Account Number:</span>
                    <strong>${paymentMethod.account_number}</strong>
                    <button onclick="copyToClipboard('${paymentMethod.account_number}')" class="copy-btn">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="payment-detail-row">
                    <span>Amount:</span>
                    <strong style="color: var(--accent-purple); font-size: 1.2rem;">${formatPrice(finalPrice)}</strong>
                </div>
            </div>
        </div>
        
        <div class="order-summary">
            <h3>Order Summary</h3>
            <div class="order-summary-item">
                <span>Product:</span>
                <strong>${product.name}</strong>
            </div>
            <div class="order-summary-item">
                <span>Amount:</span>
                <strong>${product.amount}</strong>
            </div>
            ${Object.entries(inputData)
              .map(
                ([key, value]) => `
                <div class="order-summary-item">
                    <span>${key}:</span>
                    <strong>${value}</strong>
                </div>
            `,
              )
              .join("")}
        </div>
        
        <div class="payment-proof-upload">
            <h3>Upload Payment Proof</h3>
            <input type="file" id="paymentProofInput" accept="image/*" style="display: none;">
            <button onclick="document.getElementById('paymentProofInput').click()" class="upload-btn">
                <i class="fas fa-camera"></i>
                Choose Screenshot
            </button>
            <div id="proofPreview" class="proof-preview"></div>
        </div>
        
        <div class="order-actions">
            <button onclick="closeOrderConfirm()" class="cancel-btn">Cancel</button>
            <button onclick="submitOrder(${JSON.stringify(inputData).replace(/"/g, "&quot;")})" class="submit-order-btn">
                <i class="fas fa-check"></i>
                Submit Order
            </button>
        </div>
    `

  modal.classList.add("active")

  // Handle file upload preview logic
  document.getElementById("paymentProofInput").addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        document.getElementById("proofPreview").innerHTML = `
                    <img src="${event.target.result}" alt="Payment Proof">
                    <button onclick="removeProof()" class="remove-proof-btn">
                        <i class="fas fa-times"></i>
                    </button>
                `
      }
      reader.readAsDataURL(file)
    }
  })
}

function removeProof() {
  document.getElementById("paymentProofInput").value = "" // Clear the input file
  document.getElementById("proofPreview").innerHTML = "" // Clear the preview image
}

function closeOrderConfirm() {
  const modal = document.getElementById("orderConfirmModal")
  modal.classList.remove("active")
}

async function submitOrder(inputData) {
  const proofInput = document.getElementById("paymentProofInput")

  if (!proofInput.files || !proofInput.files[0]) {
    showToast("Payment Proof Required", "Please upload payment screenshot", "warning")
    return
  }

  showLoader()

  try {
    // Upload the payment proof image
    const proofFile = proofInput.files[0]
    const proofUrl = await uploadImage(proofFile)

    // Create the order data
    const orderId = generateOrderId()
    const product = AppState.selectedProduct
    const finalPrice = calculateDiscount(product.price, product.discount_percent)

    const orderData = {
      order_id: orderId,
      user_id: AppState.currentUser.id,
      product_id: product.id,
      category_id: product.category_id, // Add category_id to orders
      payment_method_id: selectedPaymentMethodId,
      amount: finalPrice, // Store final amount paid
      input_data: JSON.stringify(inputData), // Store user input data
      payment_proof_url: proofUrl, // URL of the uploaded proof
      status: "pending", // Initial status
      created_at: new Date().toISOString(),
    }

    const { data: order, error } = await supabase.from("orders").insert([orderData]).select().single()

    if (error) throw error

    // Close modals and reset state
    closeOrderConfirm()
    closeProductDetail()

    hideLoader()

    showToast("Order Submitted!", "Your order has been submitted successfully", "success")

    // Navigate to order history after a short delay
    setTimeout(() => {
      switchPage("orderHistory")
    }, 1500)
  } catch (error) {
    console.error("Order submit error:", error)
    hideLoader()
    showToast("Error", "Failed to submit order", "error")
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast("Copied!", "Account number copied to clipboard", "success")
  } catch (error) {
    console.error("Copy error:", error)
    showToast("Error", "Failed to copy", "error")
  }
}

/* ========================================
   PAGE NAVIGATION
======================================== */

function switchPage(pageName) {
  // Hide all pages first
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active")
  })

  // Show the target page
  const targetPage = document.getElementById(`${pageName}Page`)
  if (targetPage) {
    targetPage.classList.add("active")
  }

  // Update active navigation item
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active")
    if (item.dataset.page === pageName) {
      item.classList.add("active")
    }
  })

  // Update application state
  AppState.currentPage = pageName

  // Load necessary data for the new page
  loadPageData(pageName)

  // Close user menu if it's open
  document.getElementById("userMenu")?.classList.remove("active")
}

async function loadPageData(pageName) {
  switch (pageName) {
    case "home":
      // Home page data is loaded during initialization
      break
    case "orderHistory":
      await loadOrderHistory()
      break
    case "news":
      await loadNews()
      break
    case "contacts":
      await loadContacts()
      break
    case "profile":
      await loadProfile() // Load profile data including stats
      break
  }
}

function goBack() {
  switchPage("home") // Default back navigation to home
}

/* ========================================
   ORDER HISTORY
======================================== */

async function loadOrderHistory() {
  if (!AppState.sessionActive) return // Only load if user is logged in

  showLoader()

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
                *,
                products (name, image_url),
                payment_methods (name, icon_url)
            `,
      ) // Select order details, product name/image, and payment method name/icon
      .eq("user_id", AppState.currentUser.id) // Filter orders by current user
      .order("created_at", { ascending: false }) // Order by creation date, newest first

    if (error) throw error

    AppState.orders = orders || [] // Store fetched orders in AppState

    renderOrderHistory() // Render the orders in the UI

    hideLoader()
  } catch (error) {
    console.error("Order history load error:", error)
    hideLoader()
    showToast("Error", "Failed to load order history", "error")
  }
}

function renderOrderHistory() {
  const container = document.getElementById("orderHistoryList")
  if (!container) return

  container.innerHTML = "" // Clear previous content

  if (!AppState.orders || AppState.orders.length === 0) {
    // Display message if no orders are found
    container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No orders yet</p>
                <button onclick="switchPage('home')" class="buy-now-btn" style="margin-top: 1rem;">
                    Start Shopping
                </button>
            </div>
        `
    return
  }

  AppState.orders.forEach((order) => {
    const card = document.createElement("div")
    card.className = "order-card"
    card.dataset.orderId = order.id // Store order ID for potential actions

    // Define status-specific styles and icons
    const statusColors = {
      pending: "#fbbf24", // Yellow
      approved: "#4ade80", // Green
      rejected: "#ef4444", // Red
    }

    const statusIcons = {
      pending: "fa-clock",
      approved: "fa-check-circle",
      rejected: "fa-times-circle",
    }

    card.innerHTML = `
            <div class="order-header">
                <div class="order-id">Order #${order.order_id}</div>
                <div class="order-status" style="background: ${statusColors[order.status]};">
                    <i class="fas ${statusIcons[order.status]}"></i>
                    ${order.status.toUpperCase()}
                </div>
            </div>
            
            <div class="order-body">
                <img src="${order.products?.image_url}" alt="${order.products?.name}" class="order-product-image">
                <div class="order-details">
                    <div class="order-product-name">${order.products?.name}</div>
                    <div class="order-meta">
                        <div><i class="fas fa-credit-card"></i> ${order.payment_methods?.name}</div>
                        <div><i class="fas fa-calendar"></i> ${new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="order-footer">
                <div class="order-price">${formatPrice(order.amount)}</div>
                <div class="order-date">${new Date(order.created_at).toLocaleTimeString()}</div>
            </div>
            
            ${
              order.status === "approved" && order.download_url
                ? `
                <div class="order-actions">
                    <button onclick="downloadOrderPDF('${order.id}')" class="order-action-btn primary">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `
                : ""
            }
            
            ${
              order.status === "approved" && !order.rating
                ? `
                <div class="order-actions">
                    <button onclick="rateOrder('${order.id}')" class="order-action-btn">
                        <i class="fas fa-star"></i> Rate Product
                    </button>
                </div>
            `
                : ""
            }
        `

    container.appendChild(card)
  })
}

async function downloadOrderPDF(orderId) {
  showLoader()

  try {
    // Fetch the download URL from the order record
    const { data: order, error } = await supabase.from("orders").select("download_url").eq("id", orderId).single()

    if (error) throw error

    if (!order.download_url) {
      // If URL is not yet available, inform the user
      hideLoader()
      showToast("Not Available", "Download link not available yet", "warning")
      return
    }

    // Open the download URL in a new tab/window
    window.open(order.download_url, "_blank")

    hideLoader()
    showToast("Download Started", "Your file is downloading", "success")
  } catch (error) {
    console.error("Download error:", error)
    hideLoader()
    showToast("Error", "Failed to download file", "error")
  }
}

function rateOrder(orderId) {
  // Create and show a modal for rating
  const modal = document.createElement("div")
  modal.className = "rating-modal"
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `

  modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 400px; width: 90%;">
            <h2 style="margin-bottom: 1rem;">Rate Your Experience</h2>
            <div class="rating-stars" style="display: flex; gap: 0.5rem; justify-content: center; margin: 2rem 0;">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (i) => `
                    <i class="far fa-star" style="font-size: 2rem; color: var(--accent-gold); cursor: pointer;" 
                       onclick="selectRating(${i}, '${orderId}')"></i>
                `,
                  )
                  .join("")}
            </div>
            <textarea id="ratingComment" placeholder="Share your experience (optional)" 
                style="width: 100%; padding: 1rem; background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.05); 
                       border-radius: var(--radius-md); color: var(--text-primary); font-family: inherit; resize: vertical; min-height: 100px;"></textarea>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button onclick="this.closest('.rating-modal').remove()" 
                    style="flex: 1; padding: 0.75rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); 
                           color: var(--text-primary); cursor: pointer;">Cancel</button>
                <button onclick="submitRating('${orderId}')" 
                    style="flex: 1; padding: 0.75rem; background: var(--primary-gradient); border: none; border-radius: var(--radius-md); 
                           color: white; cursor: pointer; font-weight: 600;">Submit</button>
            </div>
        </div>
    `

  document.body.appendChild(modal)
}

// Global variable to store the selected rating value
let selectedRatingValue = 0

function selectRating(rating, orderId) {
  selectedRatingValue = rating // Store the selected rating

  const stars = event.currentTarget.parentElement.querySelectorAll("i")
  stars.forEach((star, index) => {
    if (index < rating) {
      // Apply 'fas' (filled star) class for selected stars
      star.classList.remove("far")
      star.classList.add("fas")
    } else {
      // Apply 'far' (empty star) class for remaining stars
      star.classList.remove("fas")
      star.classList.add("far")
    }
  })
}

async function submitRating(orderId) {
  if (selectedRatingValue === 0) {
    showToast("Rating Required", "Please select a rating", "warning")
    return
  }

  const comment = document.getElementById("ratingComment").value.trim()

  showLoader()

  try {
    // Update the order record with the rating
    const { error: orderError } = await supabase
      .from("orders")
      .update({ rating: selectedRatingValue })
      .eq("id", orderId)

    if (orderError) throw orderError

    // Fetch product and category IDs for the feedback record
    const { data: order } = await supabase.from("orders").select("product_id, category_id").eq("id", orderId).single()

    // Create a feedback record if a comment is provided
    if (comment) {
      const feedbackData = {
        user_id: AppState.currentUser.id,
        product_id: order.product_id,
        category_id: order.category_id, // Include category_id in feedback
        order_id: orderId,
        rating: selectedRatingValue,
        comment: comment,
        status: "pending", // Feedback usually needs moderation
        created_at: new Date().toISOString(),
      }

      await supabase.from("feedback").insert([feedbackData])
    }

    // Close the rating modal
    document.querySelector(".rating-modal")?.remove()

    // Reload order history to reflect the updated rating
    await loadOrderHistory()

    hideLoader()
    showToast("Thank You!", "Your rating has been submitted", "success")
  } catch (error) {
    console.error("Rating submit error:", error)
    hideLoader()
    showToast("Error", "Failed to submit rating", "error")
  }
}

/* ========================================
   NEWS SYSTEM
======================================== */

async function loadNews() {
  showLoader()

  try {
    const { data: news, error } = await supabase
      .from("news")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) throw error

    renderNews(news || [])

    hideLoader()
  } catch (error) {
    console.error("News load error:", error)
    hideLoader()
    showToast("Error", "Failed to load news", "error")
  }
}

function renderNews(news) {
  const container = document.getElementById("newsList")
  if (!container) return

  container.innerHTML = ""

  if (!news || news.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-newspaper" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No news available</p>
            </div>
        `
    return
  }

  news.forEach((item) => {
    const card = document.createElement("div")
    card.className = "news-card"

    let mentionsHTML = ""
    if (item.mentions) {
      try {
        const mentions = JSON.parse(item.mentions) // Assuming mentions is a JSON array of strings
        mentionsHTML = '<div class="news-mentions">'
        mentions.forEach((mention) => {
          mentionsHTML += `<span class="news-mention">${mention}</span>`
        })
        mentionsHTML += "</div>"
      } catch (e) {
        console.error("Mentions parse error:", e)
      }
    }

    card.innerHTML = `
            ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" class="news-image">` : ""}
            <div class="news-content">
                <h3 class="news-title">${item.title}</h3>
                <p class="news-description">${item.description}</p>
                ${mentionsHTML}
                <div class="news-date">
                    <i class="fas fa-calendar"></i>
                    ${new Date(item.created_at).toLocaleDateString()}
                </div>
            </div>
        `

    container.appendChild(card)
  })
}

/* ========================================
   CONTACTS SYSTEM
======================================== */

async function loadContacts() {
  showLoader()

  try {
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    renderContacts(contacts || [])

    hideLoader()
  } catch (error) {
    console.error("Contacts load error:", error)
    hideLoader()
    showToast("Error", "Failed to load contacts", "error")
  }
}

function renderContacts(contacts) {
  const container = document.getElementById("contactsList")
  if (!container) return

  container.innerHTML = ""

  if (!contacts || contacts.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-address-book" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No contacts available</p>
            </div>
        `
    return
  }

  contacts.forEach((contact) => {
    const card = document.createElement("div")
    card.className = "contact-card"

    card.innerHTML = `
        <div class="contact-icon">
            ${contact.icon_url ? `<img src="${contact.icon_url}" alt="${contact.name}">` : '<i class="fas fa-user"></i>'}
        </div>
        <div class="contact-info">
            <h3 class="contact-name">${contact.name}</h3>
            ${contact.description ? `<p class="contact-description">${contact.description}</p>` : ""}
            ${
              contact.phone
                ? `
                <a href="tel:${contact.phone}" class="contact-link">
                    <i class="fas fa-phone"></i> ${contact.phone}
                </a>
            `
                : ""
            }
            ${
              contact.email
                ? `
                <a href="mailto:${contact.email}" class="contact-link">
                    <i class="fas fa-envelope"></i> ${contact.email}
                </a>
            `
                : ""
            }
            ${contact.social_links ? renderSocialLinks(contact.social_links) : ""}
        </div>
    `

    container.appendChild(card)
  })
}

function renderSocialLinks(socialLinksJson) {
  try {
    const socials = JSON.parse(socialLinksJson) // Assuming social_links is a JSON string of platform URLs
    let html = '<div class="contact-socials">'

    Object.entries(socials).forEach(([platform, url]) => {
      if (url) {
        html += `
                    <a href="${url}" target="_blank" class="contact-social-btn">
                        <i class="fab fa-${platform.toLowerCase()}"></i>
                    </a>
                `
      }
    })

    html += "</div>"
    return html
  } catch (e) {
    console.error("Social links parse error:", e)
    return ""
  }
}

/* ========================================
   PROFILE SYSTEM
======================================== */

async function loadProfile() {
  if (!AppState.sessionActive) return // Ensure user is logged in

  const container = document.getElementById("profileContent")
  if (!container) return

  const user = AppState.currentUser
  // Fetch order data specifically for profile stats if not already loaded comprehensively
  if (!AppState.orders || AppState.orders.length === 0) {
    await loadOrderHistory() // Ensure orders are loaded for stats
  }

  container.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar-section">
                <img src="${user.profile_image}" alt="Profile" class="profile-avatar">
                <button class="change-avatar-btn" onclick="changeAvatar()">
                    <i class="fas fa-camera"></i>
                </button>
            </div>
            
            <div class="profile-info-section">
                <div class="profile-info-item">
                    <label>Username</label>
                    <div class="profile-info-value">${user.username}</div>
                </div>
                
                <div class="profile-info-item">
                    <label>Email</label>
                    <div class="profile-info-value">${user.email}</div>
                </div>
                
                <div class="profile-info-item">
                    <label>Member Since</label>
                    <div class="profile-info-value">${new Date(user.created_at).toLocaleDateString()}</div>
                </div>
            </div>
        </div>
        
        <div class="profile-stats-card">
            <h3><i class="fas fa-chart-line"></i> Statistics</h3>
            <div class="profile-stats-grid">
                <div class="profile-stat-item">
                    <div class="profile-stat-value">${AppState.orders.filter((o) => o.status === "approved").length}</div>
                    <div class="profile-stat-label">Completed Orders</div>
                </div>
                <div class="profile-stat-item">
                    <div class="profile-stat-value">${AppState.orders.filter((o) => o.status === "pending").length}</div>
                    <div class="profile-stat-label">Pending Orders</div>
                </div>
                <div class="profile-stat-item">
                    <div class="profile-stat-value">${AppState.orders.length}</div>
                    <div class="profile-stat-label">Total Orders</div>
                </div>
            </div>
        </div>
        
        <div class="profile-settings-card">
            <h3>
                <i class="fas fa-cog"></i>
                Settings
            </h3>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Background Music</div>
                    <div class="profile-setting-description">Play background music while browsing</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.music ? "active" : ""}" onclick="toggleSetting('music')"></div>
            </div>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Notifications</div>
                    <div class="profile-setting-description">Show notification messages</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.notifications !== false ? "active" : ""}" onclick="toggleSetting('notifications')"></div>
            </div>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Auto Download Orders</div>
                    <div class="profile-setting-description">Automatically download approved orders</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.autoDownload ? "active" : ""}" onclick="toggleSetting('autoDownload')"></div>
            </div>
            
            <div class="profile-setting-item" style="border-bottom: none;">
                <div>
                    <div class="profile-setting-label">Website Version</div>
                    <div class="profile-setting-description">v1.0.0</div>
                </div>
            </div>
        </div>
        
        ${
          AppState.websiteConfig?.webapp_url
            ? `
            <button class="buy-now-btn" onclick="downloadWebApp()" style="margin-top: 1rem;">
                <i class="fas fa-download"></i>
                Download Web App
            </button>
        `
            : ""
        }
        
        <button class="buy-now-btn" onclick="logout()" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); margin-top: 0.5rem;">
            <i class="fas fa-sign-out-alt"></i>
            Logout
        </button>
    `
}

// Initialize settings from localStorage or set defaults
if (!AppState.settings) {
  AppState.settings = {
    music: false,
    notifications: true,
    autoDownload: false,
  }
}

function toggleSetting(setting) {
  AppState.settings[setting] = !AppState.settings[setting] // Toggle the setting value

  // Save settings to localStorage
  localStorage.setItem("userSettings", JSON.stringify(AppState.settings))

  // Update the visual state of the toggle switches
  const toggles = document.querySelectorAll(".toggle-switch")
  toggles.forEach((toggle) => {
    const parent = toggle.parentElement // The div containing label, description, and toggle
    const label = parent.querySelector(".profile-setting-label").textContent

    // Check if this toggle corresponds to the setting being changed
    if (
      (label.includes("Music") && setting === "music") ||
      (label.includes("Notifications") && setting === "notifications") ||
      (label.includes("Auto Download") && setting === "autoDownload")
    ) {
      if (AppState.settings[setting]) {
        toggle.classList.add("active") // Add 'active' class when enabled
      } else {
        toggle.classList.remove("active") // Remove 'active' class when disabled
      }
    }
  })

  // Apply the setting change immediately if applicable
  if (setting === "music") {
    if (AppState.settings.music) {
      startMusicPlayer() // Start music if enabled
    } else {
      stopMusicPlayer() // Stop music if disabled
    }
  }

  showToast("Setting Updated", `${setting} has been ${AppState.settings[setting] ? "enabled" : "disabled"}`, "success")
}

// Function to handle changing the user's avatar
async function changeAvatar() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*" // Accept only image files

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return // Exit if no file selected

    showLoader()

    try {
      // Upload the new image
      const imageUrl = await uploadImage(file)

      // Update the user's profile image URL in the database
      const { error } = await supabase
        .from("users")
        .update({ profile_image: imageUrl }) // Use 'profile_image' column
        .eq("id", AppState.currentUser.id)

      if (error) throw error

      // Update local state and localStorage
      AppState.currentUser.profile_image = imageUrl
      localStorage.setItem("currentUser", JSON.stringify(AppState.currentUser))

      // Refresh UI elements that display the avatar
      updateUserUI()
      loadProfile() // Reload profile section to show updated avatar

      hideLoader()
      showToast("Success", "Profile picture updated", "success")
    } catch (error) {
      console.error("Avatar update error:", error)
      hideLoader()
      showToast("Error", "Failed to update profile picture", "error")
    }
  }

  input.click() // Trigger the file input dialog
}

async function downloadWebApp() {
  if (!AppState.websiteConfig?.webapp_url) return // Do nothing if URL is not configured

  showLoader()

  try {
    // Fetch the web app file
    const response = await fetch(AppState.websiteConfig.webapp_url)
    const blob = await response.blob()

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "app.apk" // Set the download filename
    document.body.appendChild(a)
    a.click() // Simulate a click to trigger download
    document.body.removeChild(a) // Clean up the temporary link
    window.URL.revokeObjectURL(url) // Release the object URL

    hideLoader()
    showToast("Download Started", "Web app is downloading", "success")
  } catch (error) {
    console.error("Download error:", error)
    hideLoader()
    showToast("Error", "Failed to download app", "error")
  }
}

/* ========================================
   NOTIFICATIONS SYSTEM
======================================== */

function toggleNotifications() {
  const panel = document.getElementById("notificationPanel")

  if (panel.classList.contains("active")) {
    panel.classList.remove("active") // Close panel
  } else {
    panel.classList.add("active") // Open panel
    loadNotifications() // Load notifications when panel is opened
  }
}

function closeNotifications() {
  document.getElementById("notificationPanel").classList.remove("active")
}

async function loadNotifications() {
  if (!AppState.sessionActive) return // Only load if user is logged in

  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", AppState.currentUser.id) // Fetch notifications for the current user
      .order("created_at", { ascending: false }) // Order by creation date
      .limit(20) // Limit to the latest 20 notifications

    if (error) throw error

    const container = document.getElementById("notificationList")
    container.innerHTML = "" // Clear existing list

    if (!notifications || notifications.length === 0) {
      // Display message if no notifications
      container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;"></i>
                    <p>No notifications</p>
                </div>
            `

      // Reset badge count
      document.getElementById("notificationCount").textContent = "0"
      document.getElementById("notificationCount").style.display = "none"
      return
    }

    // Update notification badge count
    const unreadCount = notifications.filter((n) => !n.read).length
    const badge = document.getElementById("notificationCount")
    badge.textContent = unreadCount
    badge.style.display = unreadCount > 0 ? "flex" : "none" // Show badge only if there are unread notifications

    notifications.forEach((notification) => {
      const item = document.createElement("div")
      item.className = "notification-item"
      // Styling for read/unread status and hover effect
      item.style.cssText = `
                padding: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: var(--transition-fast);
                background: ${notification.read ? "transparent" : "rgba(102, 126, 234, 0.1)"}; /* Highlight unread */
            `

      // Hover effect
      item.addEventListener("mouseover", function () {
        this.style.background = "var(--bg-hover)"
      })

      item.addEventListener("mouseout", function () {
        // Revert background based on read status when mouse leaves
        this.style.background = notification.read ? "transparent" : "rgba(102, 126, 234, 0.1)"
      })

      const notifDate = new Date(notification.created_at).toLocaleString()

      // Determine icon and color based on notification type
      let icon = "fa-bell"
      let iconColor = "var(--accent-purple)"

      if (notification.type === "order") {
        icon = "fa-shopping-cart"
        iconColor = "#4ade80" // Green
      } else if (notification.type === "coupon") {
        icon = "fa-tag"
        iconColor = "#fbbf24" // Yellow
      } else if (notification.type === "message") {
        icon = "fa-envelope"
        iconColor = "var(--accent-blue)" // Blue
      }

      item.innerHTML = `
                <div style="display: flex; gap: 1rem;">
                    <div style="flex-shrink: 0;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${icon}" style="color: ${iconColor};"></i>
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-primary);">
                            ${notification.title}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                            ${notification.message}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            <i class="fas fa-clock"></i> ${notifDate}
                        </div>
                    </div>
                    ${
                      !notification.read
                        ? `
                        <div style="flex-shrink: 0;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-purple);"></div>
                        </div>
                    `
                        : ""
                    }
                </div>
            `

      item.addEventListener("click", () => handleNotificationClick(notification)) // Add click handler

      container.appendChild(item)
    })
  } catch (error) {
    console.error("Notifications load error:", error)
  }
}

async function handleNotificationClick(notification) {
  // Mark notification as read if it's unread
  if (!notification.read) {
    await supabase.from("notifications").update({ read: true }).eq("id", notification.id)

    loadNotifications() // Reload list to update UI (badge count, read status)
  }

  // Handle specific notification actions based on type and data
  if (notification.type === "order" && notification.data) {
    try {
      const data = JSON.parse(notification.data) // Parse data associated with notification
      if (data.orderId) {
        closeNotifications() // Close notification panel
        switchPage("orderHistory") // Navigate to order history
      }
    } catch (e) {
      console.error("Notification data parse error:", e)
    }
  } else if (notification.type === "coupon" && notification.data) {
    try {
      const data = JSON.parse(notification.data)
      if (data.couponCode) {
        showToast("Coupon Code", data.couponCode, "info") // Display coupon code
      }
    } catch (e) {
      console.error("Notification data parse error:", e)
    }
  }
}

// Automatically refresh notifications every 30 seconds if the user is logged in and notifications are enabled
setInterval(() => {
  if (AppState.sessionActive && AppState.settings?.notifications !== false) {
    loadNotifications()
  }
}, 30000)

/* ========================================
   USER MENU
======================================== */

function toggleUserMenu() {
  const menu = document.getElementById("userMenu")

  if (menu.classList.contains("active")) {
    menu.classList.remove("active") // Close menu
  } else {
    menu.classList.add("active") // Open menu
    updateUserUI() // Ensure user info is up-to-date when menu opens
  }
}

// Close user menu and notification panel when clicking outside of them
document.addEventListener("click", (e) => {
  const menu = document.getElementById("userMenu")
  const btn = document.querySelector(".user-profile-btn") // Button that opens the user menu

  // Close user menu if click is outside menu and not on the toggle button
  if (menu && !menu.contains(e.target) && !btn?.contains(e.target)) {
    menu.classList.remove("active")
  }

  const notifPanel = document.getElementById("notificationPanel")
  const notifBtn = document.querySelector(".notification-btn") // Button that opens the notification panel

  // Close notification panel if click is outside panel and not on the toggle button
  if (notifPanel && !notifPanel.contains(e.target) && !notifBtn?.contains(e.target)) {
    notifPanel.classList.remove("active")
  }
})

/* ========================================
   MUSIC PLAYER
======================================== */

async function loadMusicPlaylist() {
  try {
    const { data: songs, error } = await supabase
      .from("music")
      .select("*")
      .eq("status", "active")
      .order("order", { ascending: true })

    if (error) throw error

    AppState.musicPlaylist = songs || []

    // Start music player if enabled in settings and songs are available
    if (songs && songs.length > 0 && AppState.settings?.music) {
      startMusicPlayer()
    }
  } catch (error) {
    console.error("Music load error:", error)
  }
}

function startMusicPlayer() {
  if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return // Don't start if no songs

  const player = document.getElementById("musicPlayer")
  const audio = document.getElementById("audioPlayer")

  player.classList.add("active") // Show the music player UI

  playSong(AppState.currentSongIndex) // Play the current song
}

function stopMusicPlayer() {
  const player = document.getElementById("musicPlayer")
  const audio = document.getElementById("audioPlayer")

  player.classList.remove("active") // Hide the music player UI
  audio.pause() // Pause the audio
  AppState.isPlaying = false // Update playing state
}

function playSong(index) {
  if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return

  AppState.currentSongIndex = index // Update current song index
  const song = AppState.musicPlaylist[index]

  const audio = document.getElementById("audioPlayer")
  const songName = document.getElementById("currentSongName")
  const playPauseBtn = document.getElementById("playPauseBtn")

  audio.src = song.file_url // Set audio source
  songName.textContent = song.name // Update displayed song name

  audio.play() // Play the audio
  AppState.isPlaying = true
  playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>' // Change button to pause icon

  // Set up event listener for when the song ends
  audio.onended = () => {
    playNextSong() // Automatically play the next song
  }
}

function playNextSong() {
  if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return

  // Calculate next song index, looping back to the start if at the end
  AppState.currentSongIndex = (AppState.currentSongIndex + 1) % AppState.musicPlaylist.length
  playSong(AppState.currentSongIndex) // Play the next song
}

function playPrevSong() {
  if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return

  // Calculate previous song index, looping back to the end if at the start
  AppState.currentSongIndex =
    (AppState.currentSongIndex - 1 + AppState.musicPlaylist.length) % AppState.musicPlaylist.length
  playSong(AppState.currentSongIndex) // Play the previous song
}

function togglePlayPause() {
  const audio = document.getElementById("audioPlayer")
  const playPauseBtn = document.getElementById("playPauseBtn")

  if (AppState.isPlaying) {
    audio.pause() // Pause audio
    AppState.isPlaying = false
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>' // Change button to play icon
  } else {
    audio.play() // Play audio
    AppState.isPlaying = true
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>' // Change button to pause icon
  }
}

// Add event listeners for music player controls
document.getElementById("playPauseBtn")?.addEventListener("click", togglePlayPause)
document.getElementById("nextSongBtn")?.addEventListener("click", playNextSong)
document.getElementById("prevSongBtn")?.addEventListener("click", playPrevSong)

// Volume slider functionality
document.getElementById("volumeSlider")?.addEventListener("input", function () {
  const audio = document.getElementById("audioPlayer")
  audio.volume = this.value / 100 // Volume is between 0 and 1
})

/* ========================================
   LOAD SAVED SETTINGS
======================================== */

function loadSavedSettings() {
  const saved = localStorage.getItem("userSettings")
  if (saved) {
    try {
      AppState.settings = JSON.parse(saved) // Parse saved settings
    } catch (e) {
      console.error("Settings parse error:", e)
    }
  }
}

// Load settings when the app initializes
loadSavedSettings()

/* ========================================
   REALTIME SUBSCRIPTIONS
======================================== */

function setupRealtimeSubscriptions() {
  if (!AppState.sessionActive) return // Only set up if user is logged in

  // Subscribe to order updates for the current user
  const orderSubscription = supabase
    .channel("orders_channel")
    .on(
      "postgres_changes", // Listen for changes in the 'orders' table
      {
        event: "UPDATE", // Trigger on update events
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${AppState.currentUser.id}`, // Filter for the current user's orders
      },
      (payload) => {
        handleOrderUpdate(payload.new) // Call handler with the new order data
      },
    )
    .subscribe() // Subscribe to the channel

  // Subscribe to new notifications for the current user
  const notificationSubscription = supabase
    .channel("notifications_channel")
    .on(
      "postgres_changes", // Listen for changes in the 'notifications' table
      {
        event: "INSERT", // Trigger on insert events (new notifications)
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${AppState.currentUser.id}`, // Filter for the current user
      },
      (payload) => {
        handleNewNotification(payload.new) // Call handler with the new notification data
      },
    )
    .subscribe() // Subscribe to the channel

  // Store subscriptions to allow for cleanup later
  AppState.subscriptions = [orderSubscription, notificationSubscription]
}

async function handleOrderUpdate(order) {
  console.log("Order updated:", order)

  // Display toast notification based on order status update
  if (order.status === "approved") {
    showToast("Order Approved! 🎉", `Order #${order.order_id} has been approved`, "success")

    // Trigger auto-download if the setting is enabled
    if (AppState.settings?.autoDownload) {
      setTimeout(() => {
        downloadOrderPDF(order.id)
      }, 2000) // Delay download slightly
    }
  } else if (order.status === "rejected") {
    showToast("Order Rejected", `Order #${order.order_id} was rejected`, "error")
  }

  // Reload order history if the user is currently on that page
  if (AppState.currentPage === "orderHistory") {
    await loadOrderHistory()
  }
}

function handleNewNotification(notification) {
  console.log("New notification:", notification)

  // Update the notification badge count
  const badge = document.getElementById("notificationCount")
  const currentCount = Number.parseInt(badge.textContent) || 0
  badge.textContent = currentCount + 1
  badge.style.display = "flex" // Show the badge

  // Show a toast notification if the user has notifications enabled
  if (AppState.settings?.notifications !== false) {
    showToast(notification.title, notification.message, notification.type || "info")
  }

  // Reload notifications if the notification panel is open
  const panel = document.getElementById("notificationPanel")
  if (panel && panel.classList.contains("active")) {
    loadNotifications()
  }
}

// Function to unsubscribe from all active channels
function cleanupSubscriptions() {
  if (AppState.subscriptions) {
    AppState.subscriptions.forEach((sub) => {
      supabase.removeChannel(sub) // Remove each subscription
    })
    AppState.subscriptions = [] // Clear the list
  }
}

/* ========================================
   ADVANCED FILTERING & SORTING
======================================== */

function renderProduct(container, product) {
  const card = document.createElement("div")
  card.className = "product-card"
  card.dataset.productId = product.id
  card.onclick = () => openProductDetail(product)

  const finalPrice = calculateDiscount(product.price, product.discount_percent)

  card.innerHTML = `
    <div class="product-image-wrapper">
      <img src="${product.image_url}" alt="${product.name}" class="product-image">
      ${
        product.type
          ? `
        <div class="product-type-badge" style="background: ${getTypeBadgeColor(product.type)};">
          ${product.type}
        </div>
      `
          : ""
      }
      ${
        product.discount_percent > 0
          ? `
        <div class="product-discount-badge">-${product.discount_percent}%</div>
      `
          : ""
      }
    </div>
    <div class="product-info">
      <div class="product-name">${product.name}</div>
      <div class="product-amount">${product.amount || "N/A"}</div>
      <div class="product-price-row">
        ${
          product.discount_percent > 0
            ? `
          <span class="product-price-original">${formatPrice(product.price)}</span>
        `
            : ""
        }
        <span class="product-price">${formatPrice(finalPrice)}</span>
      </div>
    </div>
  `

  container.appendChild(card)
}

class ProductFilter {
  constructor() {
    // Default filter settings
    this.filters = {
      priceMin: 0,
      priceMax: Number.POSITIVE_INFINITY, // Initialize with a very high max price
      sortBy: "newest", // Default sorting
      hasDiscount: false, // Default: show products with discounts only if true
      rating: 0, // Minimum rating filter
    }
  }

  setPriceRange(min, max) {
    this.filters.priceMin = min
    this.filters.priceMax = max
    this.apply() // Apply filters immediately after change
  }

  setSorting(sortBy) {
    this.filters.sortBy = sortBy
    this.apply()
  }

  setDiscountFilter(hasDiscount) {
    this.filters.hasDiscount = hasDiscount
    this.apply()
  }

  setRatingFilter(rating) {
    this.filters.rating = rating
    this.apply()
  }

  apply() {
    let filteredProducts = [...AppState.products] // Start with all products

    // Apply price filter (based on final discounted price)
    filteredProducts = filteredProducts.filter((p) => {
      const finalPrice = calculateDiscount(p.price, p.discount_percent)
      return finalPrice >= this.filters.priceMin && finalPrice <= this.filters.priceMax
    })

    // Apply discount filter
    if (this.filters.hasDiscount) {
      filteredProducts = filteredProducts.filter((p) => p.discount_percent > 0) // Keep only products with discounts
    }

    // Apply sorting
    switch (this.filters.sortBy) {
      case "price_low":
        filteredProducts.sort((a, b) => {
          const priceA = calculateDiscount(a.price, a.discount_percent)
          const priceB = calculateDiscount(b.price, b.discount_percent)
          return priceA - priceB // Ascending price
        })
        break
      case "price_high":
        filteredProducts.sort((a, b) => {
          const priceA = calculateDiscount(a.price, a.discount_percent)
          const priceB = calculateDiscount(b.price, b.discount_percent)
          return priceB - priceA // Descending price
        })
        break
      case "discount":
        // Sort by discount percentage, highest first
        filteredProducts.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
        break
      case "newest":
      default:
        // Sort by creation date, newest first
        filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
    }

    // Re-render the product list with filtered and sorted products
    const container = document.getElementById("productsList")
    if (container) {
      container.innerHTML = "" // Clear current product list
      filteredProducts.forEach((product) => {
        renderProduct(container, product) // Re-render each product card
      })
    }
  }

  reset() {
    // Reset filters to their default values
    this.filters = {
      priceMin: 0,
      priceMax: Number.POSITIVE_INFINITY,
      sortBy: "newest",
      hasDiscount: false,
      rating: 0,
    }
    this.apply()
  }
}

/* ========================================
   FAVORITES SYSTEM
======================================== */

const FavoritesManager = {
  async add(productId) {
    if (!AppState.sessionActive) {
      openAuthModal() // Require login to add favorites
      return
    }

    showLoader() // Show loader while adding favorite

    try {
      // Insert into favorites table
      const { error } = await supabase.from("favorites").insert([
        {
          user_id: AppState.currentUser.id,
          product_id: productId,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      hideLoader()
      showToast("Added to Favorites", "Product added to your favorites", "success")
      this.updateUI(productId, true) // Update the UI to show it's favorited
    } catch (error) {
      console.error("Add favorite error:", error)
      hideLoader()
      showToast("Error", "Failed to add to favorites", "error")
    }
  },

  async remove(productId) {
    showLoader() // Show loader while removing favorite

    try {
      // Delete from favorites table
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", AppState.currentUser.id)
        .eq("product_id", productId)

      if (error) throw error

      hideLoader()
      showToast("Removed", "Product removed from favorites", "info")
      this.updateUI(productId, false) // Update the UI to show it's no longer favorited
    } catch (error) {
      console.error("Remove favorite error:", error)
      hideLoader()
      showToast("Error", "Failed to remove from favorites", "error")
    }
  },

  async toggle(productId) {
    const isFavorite = await this.isFavorite(productId) // Check current favorite status

    if (isFavorite) {
      await this.remove(productId) // Remove if already a favorite
    } else {
      await this.add(productId) // Add if not a favorite
    }
  },

  async isFavorite(productId) {
    if (!AppState.sessionActive) return false // User must be logged in to have favorites

    try {
      // Check if a favorite entry exists for this user and product
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", AppState.currentUser.id)
        .eq("product_id", productId)
        .single()

      // Return true if data exists (meaning it's a favorite), false otherwise
      return !!data
    } catch (error) {
      // Handle potential errors, assume not favorite if error occurs
      return false
    }
  },

  // Update the UI (e.g., change heart icon) based on favorite status
  updateUI(productId, isFavorite) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`)
    if (!productCard) return // Exit if product card not found

    let favoriteBtn = productCard.querySelector(".favorite-btn")

    // If the favorite button doesn't exist, create it
    if (!favoriteBtn) {
      favoriteBtn = document.createElement("button")
      favoriteBtn.className = "favorite-btn"
      favoriteBtn.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                width: 32px;
                height: 32px;
                background: rgba(0,0,0,0.5);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition-fast);
                backdrop-filter: blur(10px);
                z-index: 10;
            `

      // Add click listener to the button
      favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent card click event from firing
        this.toggle(productId) // Toggle favorite status
      })

      const imageWrapper = productCard.querySelector(".product-image-wrapper")
      if (imageWrapper) {
        imageWrapper.style.position = "relative" // Ensure wrapper can position the button absolutely
        imageWrapper.appendChild(favoriteBtn) // Add button to the image wrapper
      }
    }

    // Update the button's icon based on favorite status
    if (isFavorite) {
      favoriteBtn.innerHTML = '<i class="fas fa-heart" style="color: #ef4444;"></i>' // Red heart for favorite
    } else {
      favoriteBtn.innerHTML = '<i class="far fa-heart"></i>' // Outline heart for not favorite
    }
  },
}

/* ========================================
   CART SYSTEM (Optional)
======================================== */

const CartManager = {
  items: [], // Array to hold cart items { product: {...}, quantity: N }

  add(product, quantity = 1) {
    const existingItemIndex = this.items.findIndex((item) => item.product.id === product.id)

    if (existingItemIndex > -1) {
      // If product already in cart, increase quantity
      this.items[existingItemIndex].quantity += quantity
    } else {
      // Otherwise, add as a new item
      this.items.push({
        product: product,
        quantity: quantity,
      })
    }

    this.save() // Save cart to localStorage
    this.updateUI() // Update cart count badge
    showToast("Added to Cart", `${product.name} added to cart`, "success")
  },

  remove(productId) {
    // Filter out the product to remove
    this.items = this.items.filter((item) => item.product.id !== productId)
    this.save()
    this.updateUI()
  },

  clear() {
    this.items = [] // Empty the cart
    this.save()
    this.updateUI()
  },

  getTotal() {
    // Calculate total price of items in cart
    return this.items.reduce((total, item) => {
      const price = calculateDiscount(item.product.price, item.product.discount_percent)
      return total + price * item.quantity
    }, 0)
  },

  save() {
    localStorage.setItem("cart", JSON.stringify(this.items)) // Save cart state to localStorage
  },

  load() {
    const saved = localStorage.getItem("cart")
    if (saved) {
      try {
        this.items = JSON.parse(saved) // Load cart state from localStorage
      } catch (e) {
        this.items = [] // Reset if parsing fails
      }
    }
  },

  updateUI() {
    // Update cart count badge in the navigation bar
    const badge = document.getElementById("cartCount")
    if (badge) {
      const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0)
      badge.textContent = totalItems
      badge.style.display = totalItems > 0 ? "flex" : "none" // Show badge only if items exist
    }
  },
}

/* ========================================
   IMAGE COMPRESSION
======================================== */

async function compressImage(file, maxSizeMB = 1) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions to fit within maxSizeMB while maintaining aspect ratio
        const maxSizeInBytes = maxSizeMB * 1024 * 1024
        let quality = 0.85 // Start with a reasonable quality

        // Reduce quality if image is too large initially
        const initialSize = file.size
        if (initialSize > maxSizeInBytes) {
          quality = Math.max(0.1, maxSizeInBytes / initialSize) // Adjust quality dynamically
        }

        // Resize image if dimensions are too large (optional, but good practice)
        const maxDim = 1920 // Max dimension (e.g., 1920px)
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width
          width = maxDim
        } else if (height > maxDim) {
          width = (width * maxDim) / height
          height = maxDim
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)

        // Convert canvas content to a Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                // Return as a File object, which is what uploadImage expects
                new File([blob], file.name, {
                  type: "image/jpeg", // Always compress to JPEG for consistent quality control
                  lastModified: Date.now(),
                }),
              )
            } else {
              reject(new Error("Compression failed: Could not create blob."))
            }
          },
          "image/jpeg", // Mime type
          quality, // Compression quality
        )
      }

      img.onerror = (err) => reject(new Error("Image loading error: " + err))
      img.src = e.target.result // Set image source to the data URL
    }

    reader.onerror = (err) => reject(new Error("File reading error: " + err))
    reader.readAsDataURL(file) // Read the file as a data URL
  })
}

/* ========================================
   FORM VALIDATION
======================================== */

class FormValidator {
  constructor(formId) {
    this.form = document.getElementById(formId)
    this.errors = {} // Object to store validation errors
  }

  // Validate the form based on provided rules
  validate(rules) {
    this.errors = {} // Reset errors for each validation attempt

    for (const [field, fieldRules] of Object.entries(rules)) {
      const input = this.form.querySelector(`[name="${field}"]`) // Find input element by name attribute
      if (!input) continue // Skip if input element not found

      const value = input.value.trim() // Get trimmed input value

      // Required validation
      if (fieldRules.required && !value) {
        this.errors[field] = fieldRules.message || `${field} is required`
        this.showError(input, this.errors[field])
        continue // Move to the next field
      }

      // Minimum length validation
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        this.errors[field] = `${field} must be at least ${fieldRules.minLength} characters`
        this.showError(input, this.errors[field])
        continue
      }

      // Maximum length validation
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        this.errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`
        this.showError(input, this.errors[field])
        continue
      }

      // Pattern (regex) validation
      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        this.errors[field] = fieldRules.message || `${field} format is invalid`
        this.showError(input, this.errors[field])
        continue
      }

      // Custom validation function
      if (fieldRules.custom && !fieldRules.custom(value)) {
        this.errors[field] = fieldRules.message || `${field} is invalid`
        this.showError(input, this.errors[field])
        continue
      }

      // If all checks pass for this field, clear any existing error
      this.clearError(input)
    }

    // Return true if no errors were found, false otherwise
    return Object.keys(this.errors).length === 0
  }

  // Display validation error for an input field
  showError(input, message) {
    input.style.borderColor = "#ef4444" // Red border for invalid input

    let errorDiv = input.parentElement.querySelector(".error-message")
    if (!errorDiv) {
      // Create error message div if it doesn't exist
      errorDiv = document.createElement("div")
      errorDiv.className = "error-message"
      errorDiv.style.cssText = `
                color: #ef4444;
                font-size: 0.75rem;
                margin-top: 0.25rem;
            `
      input.parentElement.appendChild(errorDiv) // Append error message below the input
    }

    errorDiv.textContent = message // Set error message text
  }

  // Remove error display for an input field
  clearError(input) {
    input.style.borderColor = "" // Reset border color

    const errorDiv = input.parentElement.querySelector(".error-message")
    if (errorDiv) {
      errorDiv.remove() // Remove the error message element
    }
  }

  // Clear all validation errors and styles from the form
  clearAll() {
    this.errors = {}
    this.form.querySelectorAll("input, textarea, select").forEach((input) => {
      this.clearError(input)
    })
  }
}

/* ========================================
   DATE & TIME UTILITIES
======================================== */

const DateUtils = {
  // Format date to a relative time string (e.g., "Just now", "5 minutes ago")
  formatRelative(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

    return date.toLocaleDateString() // Fallback to date string for older dates
  },

  // Format date and time to a localized string
  formatDateTime(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  },

  // Format date to a localized date string
  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  },

  // Format time to a localized time string
  formatTime(dateString) {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  },
}

/* ========================================
   LOCAL STORAGE UTILITIES
======================================== */

const Storage = {
  // Set an item in localStorage, automatically stringifying value
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error("Storage set error:", error)
      return false
    }
  },

  // Get an item from localStorage, automatically parsing it
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue // Return parsed item or default value
    } catch (error) {
      console.error("Storage get error:", error)
      return defaultValue
    }
  },

  // Remove an item from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error("Storage remove error:", error)
      return false
    }
  },

  // Clear all items from localStorage
  clear() {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error("Storage clear error:", error)
      return false
    }
  },

  // Check if an item exists in localStorage
  has(key) {
    return localStorage.getItem(key) !== null
  },
}

/* ========================================
   DEBOUNCE & THROTTLE
======================================== */

// Debounce: Execute a function only after a certain amount of time has passed without it being called
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null // Clear timeout ID
      func.apply(this, args) // Execute the function
    }
    clearTimeout(timeout) // Clear previous timeout if function is called again
    timeout = setTimeout(later, wait) // Set a new timeout
  }
}

// Throttle: Execute a function at most once within a specified time interval
function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args) // Execute the function
      inThrottle = true // Set flag to indicate function is currently throttled
      setTimeout(() => (inThrottle = false), limit) // Reset flag after the interval
    }
  }
}

/* ========================================
   RANDOM UTILITIES
======================================== */

const Utils = {
  // Generate a unique random ID
  randomId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  },

  // Generate a random hexadecimal color code
  randomColor() {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    )
  },

  // Shuffle an array in place (Fisher-Yates algorithm)
  shuffle(array) {
    const shuffled = [...array] // Create a copy to avoid modifying original array
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)) // Pick a random index
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] // Swap elements
    }
    return shuffled
  },

  // Split an array into chunks of a specified size
  chunk(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size)) // Slice the array into chunks
    }
    return chunks
  },

  // Group an array of objects by a specified key
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] // Get the value of the key for the current item
      if (!result[group]) {
        result[group] = [] // Initialize group if it doesn't exist
      }
      result[group].push(item) // Add item to its group
      return result
    }, {})
  },
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the ProductFilter instance
  const productFilter = new ProductFilter() // Instantiate the ProductFilter class

  // Setup realtime subscriptions when the user is logged in
  if (AppState.sessionActive) {
    setupRealtimeSubscriptions()
  }

  // Load the cart from localStorage when the app starts
  CartManager.load()
  CartManager.updateUI() // Update UI immediately after loading
})

// Ensure cleanup functions are called on page unload
window.addEventListener("beforeunload", () => {
  cleanupSubscriptions()
})

/* ========================================
   INDEX3.JS - UI ENHANCEMENTS
======================================== */

/* ========================================
   SMOOTH SCROLL
======================================== */

function smoothScrollTo(element, duration = 500) {
  // Find the target element to scroll to
  const target = typeof element === "string" ? document.querySelector(element) : element
  if (!target) return // Exit if target element not found

  // Calculate target scroll position
  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset
  const startPosition = window.pageYOffset // Current scroll position
  const distance = targetPosition - startPosition - 70 // Calculate distance, accounting for fixed header height (adjust 70px as needed)
  let startTime = null

  // Animation function using requestAnimationFrame for smooth scrolling
  function animation(currentTime) {
    if (startTime === null) startTime = currentTime
    const timeElapsed = currentTime - startTime
    const run = ease(timeElapsed, startPosition, distance, duration) // Easing function for smooth effect
    window.scrollTo(0, run) // Scroll the window
    if (timeElapsed < duration) requestAnimationFrame(animation) // Continue animation if duration not met
  }

  // Easing function (easeInQuad) for smooth scrolling effect
  function ease(t, b, c, d) {
    t /= d / 2
    if (t < 1) return (c / 2) * t * t + b
    t--
    return (-c / 2) * (t * (t - 2) - 1) + b
  }

  requestAnimationFrame(animation) // Start the animation loop
}

/* ========================================
   RIPPLE EFFECT
======================================== */

function createRipple(event) {
  const button = event.currentTarget // The element that triggered the event (e.g., button)
  const ripple = document.createElement("span") // Create the ripple element

  // Calculate ripple size and position
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) // Ripple should cover the element
  const x = event.clientX - rect.left - size / 2 // Ripple center X relative to button
  const y = event.clientY - rect.top - size / 2 // Ripple center Y relative to button

  // Apply styles to the ripple element
  ripple.style.width = ripple.style.height = size + "px"
  ripple.style.left = x + "px"
  ripple.style.top = y + "px"
  ripple.className = "ripple-effect" // Assign class for animation

  // Remove any existing ripple effect on the button to prevent overlap
  const existingRipple = button.querySelector(".ripple-effect")
  if (existingRipple) {
    existingRipple.remove()
  }

  button.appendChild(ripple) // Add ripple to the button

  // Remove ripple element after animation completes
  setTimeout(() => ripple.remove(), 600)
}

// Inject CSS for the ripple effect into the document head
const rippleStyle = document.createElement("style")
rippleStyle.textContent = `
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4); /* Semi-transparent white */
        transform: scale(0); /* Initially scale down */
        animation: ripple-animation 0.6s ease-out; /* Animation */
        pointer-events: none; /* Ensure ripple doesn't interfere with clicks */
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2); /* Scale up */
            opacity: 0; /* Fade out */
        }
    }
`
document.head.appendChild(rippleStyle)

// Add ripple effect to clickable elements (buttons, nav items, etc.)
document.addEventListener("click", (e) => {
  // Check if the clicked element or its ancestor is a button or nav item
  if (e.target.matches("button, .btn, .nav-item")) {
    createRipple(e) // Create the ripple effect
  }
})

/* ========================================
   PULL TO REFRESH
======================================== */

const pullToRefreshEnabled = false // Feature flag, currently disabled by default
let startY = 0 // Starting Y position of touch
let pulling = false // Flag to indicate if user is actively pulling
const refreshThreshold = 80 // Distance in pixels to trigger refresh

function initPullToRefresh() {
  let refreshIndicator = document.getElementById("refreshIndicator")

  // Create refresh indicator if it doesn't exist
  if (!refreshIndicator) {
    refreshIndicator = document.createElement("div")
    refreshIndicator.id = "refreshIndicator"
    refreshIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px; /* Height of the indicator */
            background: var(--bg-card); /* Use theme background */
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateY(-100%); /* Initially hidden above viewport */
            transition: transform 0.3s ease; /* Smooth transition for indicator movement */
            z-index: 999; /* Ensure it's above other content */
        `
    refreshIndicator.innerHTML =
      '<i class="fas fa-sync-alt" style="color: var(--accent-purple); font-size: 1.5rem;"></i>' // Sync icon
    document.body.appendChild(refreshIndicator) // Add to the DOM
  }

  // Touch start event listener
  document.addEventListener("touchstart", (e) => {
    // Only track touch if scroll position is at the top of the page
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY // Record starting Y coordinate
      pulling = true // Set pulling flag
    }
  })

  // Touch move event listener
  document.addEventListener("touchmove", (e) => {
    if (!pulling) return // Do nothing if not in a pulling state

    const currentY = e.touches[0].clientY
    const distance = currentY - startY // Calculate pull distance

    // Only move indicator if pulling downwards and within a reasonable range
    if (distance > 0 && distance < refreshThreshold * 2) {
      e.preventDefault() // Prevent page scrolling while pulling
      // Move indicator down, capped at 0px from top (relative to its hidden position)
      refreshIndicator.style.transform = `translateY(${Math.min(distance - 60, 0)}px)`

      // Start spin animation if threshold is reached
      if (distance > refreshThreshold) {
        refreshIndicator.querySelector("i").style.animation = "spin 1s linear infinite"
      }
    }
  })

  // Touch end event listener
  document.addEventListener("touchend", async (e) => {
    if (!pulling) return // Do nothing if not in a pulling state

    const currentY = e.changedTouches[0].clientY
    const distance = currentY - startY // Final pull distance

    if (distance > refreshThreshold) {
      // Trigger refresh if threshold is met
      refreshIndicator.style.transform = "translateY(0)" // Move indicator into view briefly
      await refreshCurrentPage() // Perform the actual page refresh
      // Reset indicator position and animation after refresh
      refreshIndicator.style.transform = "translateY(-100%)"
      refreshIndicator.querySelector("i").style.animation = ""
    } else {
      // If threshold not met, just hide the indicator
      refreshIndicator.style.transform = "translateY(-100%)"
    }

    // Reset pulling state
    pulling = false
    startY = 0
  })
}

// Function to refresh the current page content
async function refreshCurrentPage() {
  showLoader()

  try {
    await loadPageData(AppState.currentPage) // Reload data for the current page
    showToast("Refreshed", "Page refreshed successfully", "success")
  } catch (error) {
    console.error("Refresh error:", error)
    showToast("Error", "Failed to refresh page", "error")
  } finally {
    hideLoader() // Always hide loader
  }
}

/* ========================================
   SKELETON LOADING
======================================== */

// Function to create a skeleton loader element
function createSkeletonLoader(type = "card") {
  const skeleton = document.createElement("div")
  skeleton.className = "skeleton-loader" // Base class for styling

  // Add specific HTML structure based on the loader type
  if (type === "card") {
    skeleton.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        `
  } else if (type === "list") {
    skeleton.innerHTML = `
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        `
  }

  return skeleton
}

// Inject CSS for skeleton loaders into the document head
const skeletonStyle = document.createElement("style")
skeletonStyle.textContent = `
    .skeleton-loader {
        background: var(--bg-card); /* Use theme background */
        border-radius: var(--radius-lg);
        padding: 1rem;
        margin-bottom: 1rem; /* Spacing between loaders */
    }
    
    /* Base styles for skeleton elements */
    .skeleton-image,
    .skeleton-text,
    .skeleton-avatar {
        background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-secondary) 50%, var(--bg-hover) 75%); /* Animated gradient */
        background-size: 200% 100%; /* Ensure gradient covers element */
        animation: skeleton-loading 1.5s infinite; /* Animation */
        border-radius: var(--radius-sm);
    }
    
    .skeleton-image {
        width: 100%;
        height: 150px; /* Fixed height for image placeholder */
        margin-bottom: 1rem;
    }
    
    .skeleton-text {
        height: 16px; /* Standard height for text lines */
        margin-bottom: 0.5rem;
    }
    
    .skeleton-text.short {
        width: 60%; /* Shorter text line */
    }
    
    .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%; /* Circular avatar */
    }
    
    /* Keyframes for the gradient animation */
    @keyframes skeleton-loading {
        0% { background-position: 200% 0; } /* Start gradient off-screen right */
        100% { background-position: -200% 0; } /* End gradient off-screen left */
    }
`
document.head.appendChild(skeletonStyle)

/* ========================================
   INFINITE SCROLL
======================================== */

class InfiniteScroll {
  constructor(container, loadMoreCallback) {
    this.container = container // The container element where content will be loaded
    this.loadMoreCallback = loadMoreCallback // Function to call when more content is needed
    this.loading = false // Flag to prevent multiple simultaneous loads
    this.hasMore = true // Flag to indicate if there's more content available
    this.page = 1 // Current page number for fetching data

    this.init() // Initialize scroll event listener
  }

  init() {
    // Add a throttled scroll event listener to the window
    window.addEventListener(
      "scroll",
      throttle(() => {
        if (this.shouldLoadMore()) {
          this.loadMore() // Load more content if conditions are met
        }
      }, 200),
    ) // Throttle to 200ms to avoid excessive calls
  }

  // Determine if more content should be loaded
  shouldLoadMore() {
    // Don't load if already loading, or if there's no more content
    if (!this.hasMore || this.loading) return false

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop // Current scroll position
    const scrollHeight = document.documentElement.scrollHeight // Total document height
    const clientHeight = document.documentElement.clientHeight // Visible viewport height

    // Load more if near the bottom of the page (within 500px threshold)
    return scrollTop + clientHeight >= scrollHeight - 500
  }

  // Asynchronously load more content
  async loadMore() {
    this.loading = true // Set loading flag

    try {
      // Call the provided callback function to fetch more data
      const hasMore = await this.loadMoreCallback(++this.page) // Increment page number and pass it
      this.hasMore = hasMore // Update hasMore flag based on callback result
    } catch (error) {
      console.error("Infinite scroll error:", error)
      this.page-- // Decrement page number if fetch fails
    } finally {
      this.loading = false // Reset loading flag
    }
  }

  // Reset the infinite scroll state
  reset() {
    this.page = 1
    this.hasMore = true
    this.loading = false
  }
}

/* ========================================
   CONTEXTMENU (Long Press)
======================================== */

function initContextMenu() {
  let pressTimer // Timer for detecting long press

  // Listen for touchstart event
  document.addEventListener("touchstart", (e) => {
    // Check if the target is a product card or order card (elements that support context menu)
    const target = e.target.closest(".product-card, .order-card")
    if (!target) return // If not, do nothing

    // Set a timer for long press detection
    pressTimer = setTimeout(() => {
      showContextMenu(e, target) // Show context menu if long press is detected
    }, 500) // 500ms delay for long press
  })

  // Clear timer on touchmove or touchend to prevent context menu from showing if it was a short tap
  document.addEventListener("touchmove", () => {
    clearTimeout(pressTimer)
  })
  document.addEventListener("touchend", () => {
    clearTimeout(pressTimer)
  })
}

function showContextMenu(event, element) {
  // Vibrate device if supported to provide haptic feedback for long press
  if (navigator.vibrate) {
    navigator.vibrate(50) // Vibrate for 50 milliseconds
  }

  // Create context menu element
  const menu = document.createElement("div")
  menu.className = "context-menu"
  menu.style.cssText = `
        position: fixed;
        bottom: 0; /* Position at the bottom */
        left: 0;
        right: 0;
        background: var(--bg-card); /* Use theme background */
        border-radius: var(--radius-xl) var(--radius-xl) 0 0; /* Rounded top corners */
        padding: 1.5rem;
        z-index: 9999; /* Ensure it's on top */
        animation: slideUpMenu 0.3s ease; /* Slide up animation */
    `

  // Determine menu items based on the element type (product or order)
  const productId = element.dataset.productId
  const orderId = element.dataset.orderId

  let menuItems = ""

  if (productId) {
    // Menu items for product cards
    menuItems = `
            <button onclick="FavoritesManager.toggle('${productId}'); closeContextMenu()">
                <i class="fas fa-heart"></i> Add to Favorites
            </button>
            <button onclick="shareProduct(AppState.products.find(p => p.id === '${productId}')); closeContextMenu()">
                <i class="fas fa-share"></i> Share
            </button>
            <button onclick="closeContextMenu()" style="color: var(--text-muted);">
                <i class="fas fa-times"></i> Cancel
            </button>
        `
  } else if (orderId) {
    // Menu items for order cards
    menuItems = `
            <button onclick="viewOrderDetails('${orderId}'); closeContextMenu()">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button onclick="downloadOrderPDF('${orderId}'); closeContextMenu()">
                <i class="fas fa-download"></i> Download Receipt
            </button>
            <button onclick="closeContextMenu()" style="color: var(--text-muted);">
                <i class="fas fa-times"></i> Cancel
            </button>
        `
  }

  menu.innerHTML = menuItems // Set menu content

  // Create an overlay element to dim the background and dismiss menu on tap
  const overlay = document.createElement("div")
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7); /* Semi-transparent black overlay */
        z-index: 9998; /* Below context menu, above content */
    `
  overlay.onclick = closeContextMenu // Close menu when overlay is tapped

  document.body.appendChild(overlay) // Add overlay to DOM
  document.body.appendChild(menu) // Add context menu to DOM

  // Style context menu buttons for better appearance
  menu.querySelectorAll("button").forEach((btn) => {
    btn.style.cssText = `
            width: 100%;
            padding: 1rem;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 1rem;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: var(--transition-fast);
            border-radius: var(--radius-md);
            margin-bottom: 0.5rem;
        `

    // Add hover effect for buttons within the menu
    btn.addEventListener("click", () => (btn.style.background = "var(--bg-hover)"))
  })
}

// Function to close and remove the context menu and its overlay
function closeContextMenu() {
  document.querySelectorAll(".context-menu, .context-menu + div").forEach((el) => el.remove()) // Remove menu and overlay
}

// Inject CSS for the context menu slide-up animation
const menuStyle = document.createElement("style")
menuStyle.textContent = `
    @keyframes slideUpMenu {
        from {
            transform: translateY(100%); /* Start from bottom */
        }
        to {
            transform: translateY(0); /* Slide up to final position */
        }
    }
`
document.head.appendChild(menuStyle)

/* ========================================
   SWIPE GESTURES
======================================== */

class SwipeDetector {
  constructor(element, callbacks = {}) {
    this.element = element // The DOM element to listen for swipes on
    this.callbacks = callbacks // Object containing callback functions for different swipe directions
    this.startX = 0 // Starting X coordinate of touch
    this.startY = 0 // Starting Y coordinate of touch
    this.distX = 0 // Total distance swiped horizontally
    this.distY = 0 // Total distance swiped vertically
    this.threshold = 50 // Minimum distance to consider it a swipe

    this.init() // Initialize event listeners
  }

  init() {
    // Record starting touch coordinates
    this.element.addEventListener("touchstart", (e) => {
      this.startX = e.touches[0].clientX
      this.startY = e.touches[0].clientY
      this.distX = 0 // Reset distances on new touch
      this.distY = 0
    })

    // Track movement distance during touch
    this.element.addEventListener("touchmove", (e) => {
      this.distX = e.touches[0].clientX - this.startX
      this.distY = e.touches[0].clientY - this.startY
    })

    // Process swipe on touch end
    this.element.addEventListener("touchend", () => {
      // Determine if swipe was primarily horizontal or vertical
      if (Math.abs(this.distX) > Math.abs(this.distY)) {
        // Horizontal swipe
        if (this.distX > this.threshold && this.callbacks.onSwipeRight) {
          this.callbacks.onSwipeRight() // Call right swipe callback
        } else if (this.distX < -this.threshold && this.callbacks.onSwipeLeft) {
          this.callbacks.onSwipeLeft() // Call left swipe callback
        }
      } else {
        // Vertical swipe
        if (this.distY > this.threshold && this.callbacks.onSwipeDown) {
          this.callbacks.onSwipeDown() // Call down swipe callback
        } else if (this.distY < -this.threshold && this.callbacks.onSwipeUp) {
          this.callbacks.onSwipeUp() // Call up swipe callback
        }
      }

      // Reset distances after processing
      this.distX = 0
      this.distY = 0
    })
  }
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize pull-to-refresh functionality
  initPullToRefresh()

  // Initialize context menu for long press actions
  initContextMenu()

  // Add swipe gesture detection for going back (e.g., on mobile)
  new SwipeDetector(document.body, {
    onSwipeRight: () => {
      // Only go back if not on the home page
      if (AppState.currentPage !== "home") {
        goBack()
      }
    },
  })
})

/* ========================================
   INDEX1.JS - CONTINUATION FROM INDEX.JS
   This file contains additional features and utilities
======================================== */

/* ========================================
   CACHE MANAGEMENT
======================================== */

const CacheManager = {
  set(key, value, expiryMinutes = 60) {
    const item = {
      value: value,
      expiry: new Date().getTime() + expiryMinutes * 60 * 1000,
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(item))
  },

  get(key) {
    const itemStr = localStorage.getItem(`cache_${key}`)
    if (!itemStr) return null

    try {
      const item = JSON.parse(itemStr)

      if (new Date().getTime() > item.expiry) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      return item.value
    } catch (e) {
      return null
    }
  },

  clear() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("cache_")) {
        localStorage.removeItem(key)
      }
    })
  },
}

/* ========================================
   ANALYTICS TRACKING
======================================== */

const Analytics = {
  trackPageView(pageName) {
    console.log("Page View:", pageName)
    // Add your analytics service here (Google Analytics, etc.)
  },

  trackEvent(category, action, label) {
    console.log("Event:", { category, action, label })
    // Add your analytics service here
  },

  trackPurchase(orderId, amount) {
    console.log("Purchase:", { orderId, amount })
    // Add your analytics service here
  },
}

/* ========================================
   SHARE FUNCTIONALITY
======================================== */

async function shareProduct(product) {
  const shareData = {
    title: product.name,
    text: `Check out ${product.name} - ${formatPrice(product.price)}`,
    url: window.location.href,
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
      Analytics.trackEvent("Share", "Product", product.name)
    } else {
      // Fallback to copying link
      await copyToClipboard(window.location.href)
    }
  } catch (error) {
    console.error("Share error:", error)
  }
}

/* ========================================
   PWA INSTALL PROMPT
======================================== */

let deferredPrompt

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPrompt = e

  // Show install button
  showInstallPrompt()
})

function showInstallPrompt() {
  const installBtn = document.createElement("button")
  installBtn.className = "buy-now-btn"
  installBtn.innerHTML = '<i class="fas fa-download"></i> Install App'
  installBtn.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        showToast("Installed", "App installed successfully", "success")
      }

      deferredPrompt = null
      installBtn.remove()
    }
  })

  document.body.appendChild(installBtn)

  // Remove after 10 seconds
  setTimeout(() => installBtn.remove(), 10000)
}

/* ========================================
   OFFLINE DETECTION
======================================== */

window.addEventListener("online", () => {
  showToast("Connected", "You are back online", "success")
  // Retry any pending operations
})

window.addEventListener("offline", () => {
  showToast("Offline", "No internet connection", "warning")
})

/* ========================================
   PERFORMANCE MONITORING
======================================== */

function measurePerformance() {
  if (window.performance) {
    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart

    console.log(`Page Load Time: ${pageLoadTime}ms`)
  }
}

window.addEventListener("load", measurePerformance)

/* ========================================
   ERROR BOUNDARY
======================================== */

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error)

  // Don't show error toast for every error in production
  if (window.location.hostname === "localhost") {
    showToast("Error", event.error?.message || "An error occurred", "error")
  }
})

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason)
})

/* ========================================
   SEARCH FUNCTIONALITY
======================================== */

let searchTimeout

function initSearch() {
  const searchInput = document.createElement("input")
  searchInput.type = "text"
  searchInput.placeholder = "Search products..."
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    background: var(--bg-secondary);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  `

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value)
    }, 300)
  })

  return searchInput
}

function performSearch(query) {
  if (!query) {
    // Show all products
    document.querySelectorAll(".product-card").forEach((card) => {
      card.style.display = "block"
    })
    return
  }

  const lowerQuery = query.toLowerCase()

  document.querySelectorAll(".product-card").forEach((card) => {
    const name = card.querySelector(".product-name")?.textContent.toLowerCase()
    const amount = card.querySelector(".product-amount")?.textContent.toLowerCase()

    if (name?.includes(lowerQuery) || amount?.includes(lowerQuery)) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
}

/* ========================================
   IMAGE LAZY LOADING
======================================== */

function initLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.add("loaded")
        observer.unobserve(img)
      }
    })
  })

  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img)
  })
}

/* ========================================
   ADVANCED ANIMATIONS
======================================== */

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  document.querySelectorAll(".category-group, .news-card, .order-card").forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = "all 0.5s ease"
    observer.observe(el)
  })
}

// Call on page load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initScrollAnimations, 500)
})

/* ========================================
   NOTIFICATION PERMISSION
======================================== */

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

function showBrowserNotification(title, options = {}) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.png",
      badge: "/favicon.png",
      ...options,
    })
  }
}

/* ========================================
   KEYBOARD SHORTCUTS
======================================== */

document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    // Focus search input if it exists
    const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]')
    if (searchInput) {
      searchInput.focus()
    }
  }

  // Escape to close modals
  if (e.key === "Escape") {
    closeProductDetail()
    closeOrderConfirm()
    closeAuthModal()
    closeNotifications()
    document.getElementById("userMenu")?.classList.remove("active")
  }

  // Arrow keys for navigation (if applicable)
  if (e.key === "ArrowLeft" && AppState.currentPage !== "home") {
    goBack()
  }
})

/* ========================================
   PRINT FUNCTIONALITY
======================================== */

function printOrderReceipt(orderId) {
  const order = AppState.orders.find((o) => o.id === orderId)
  if (!order) return

  const printWindow = window.open("", "_blank")
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order Receipt #${order.order_id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .order-info {
          margin-bottom: 20px;
        }
        .order-info div {
          margin: 10px 0;
        }
        .total {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 20px;
          text-align: right;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order Receipt</h1>
        <p>Order #${order.order_id}</p>
      </div>
      <div class="order-info">
        <div><strong>Product:</strong> ${order.products?.name}</div>
        <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
        <div><strong>Payment Method:</strong> ${order.payment_methods?.name}</div>
        <div><strong>Status:</strong> ${order.status.toUpperCase()}</div>
      </div>
      <div class="total">
        Total: ${formatPrice(order.amount)}
      </div>
      <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
        Print Receipt
      </button>
    </body>
    </html>
  `)
  printWindow.document.close()
}

/* ========================================
   EXPORT DATA
======================================== */

function exportOrdersToCSV() {
  if (!AppState.orders || AppState.orders.length === 0) {
    showToast("No Data", "No orders to export", "warning")
    return
  }

  const headers = ["Order ID", "Product", "Amount", "Payment Method", "Status", "Date"]
  const rows = AppState.orders.map((order) => [
    order.order_id,
    order.products?.name || "N/A",
    order.amount,
    order.payment_methods?.name || "N/A",
    order.status,
    new Date(order.created_at).toLocaleString(),
  ])

  let csvContent = headers.join(",") + "\n"
  rows.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n"
  })

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orders_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  showToast("Exported", "Orders exported successfully", "success")
}

/* ========================================
   DARK MODE TOGGLE (Optional Enhancement)
======================================== */

function toggleDarkMode() {
  document.body.classList.toggle("light-mode")
  const isLight = document.body.classList.contains("light-mode")
  localStorage.setItem("theme", isLight ? "light" : "dark")
  showToast("Theme Changed", `Switched to ${isLight ? "light" : "dark"} mode`, "info")
}

// Load saved theme preference
function loadThemePreference() {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "light") {
    document.body.classList.add("light-mode")
  }
}

// Apply theme on load
document.addEventListener("DOMContentLoaded", loadThemePreference)

/* ========================================
   COUPON SYSTEM
======================================== */

async function applyCoupon(couponCode) {
  if (!couponCode) {
    showToast("Invalid Coupon", "Please enter a coupon code", "warning")
    return null
  }

  showLoader()

  try {
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("status", "active")
      .single()

    if (error || !coupon) {
      hideLoader()
      showToast("Invalid Coupon", "Coupon code not found or expired", "error")
      return null
    }

    // Check if coupon is still valid (expiry date)
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      hideLoader()
      showToast("Expired Coupon", "This coupon has expired", "error")
      return null
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      hideLoader()
      showToast("Coupon Limit Reached", "This coupon has reached its usage limit", "error")
      return null
    }

    hideLoader()
    showToast("Coupon Applied!", `${coupon.discount_percent}% discount applied`, "success")
    return coupon
  } catch (error) {
    console.error("Coupon apply error:", error)
    hideLoader()
    showToast("Error", "Failed to apply coupon", "error")
    return null
  }
}

/* ========================================
   REFERRAL SYSTEM
======================================== */

function generateReferralLink() {
  if (!AppState.currentUser) return null

  const baseUrl = window.location.origin
  const referralCode = AppState.currentUser.id.substring(0, 8)
  return `${baseUrl}?ref=${referralCode}`
}

function copyReferralLink() {
  const link = generateReferralLink()
  if (link) {
    copyToClipboard(link)
    showToast("Referral Link Copied", "Share with friends to earn rewards!", "success")
  }
}

/* ========================================
   WISHLIST SYSTEM
======================================== */

const WishlistManager = {
  items: [],

  async load() {
    if (!AppState.sessionActive) return

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, products(*)")
        .eq("user_id", AppState.currentUser.id)

      if (error) throw error

      this.items = data || []
      this.updateUI()
    } catch (error) {
      console.error("Wishlist load error:", error)
    }
  },

  updateUI() {
    const badge = document.getElementById("wishlistCount")
    if (badge) {
      badge.textContent = this.items.length
      badge.style.display = this.items.length > 0 ? "flex" : "none"
    }
  },
}

/* ========================================
   COMPARISON SYSTEM
======================================== */

const ComparisonManager = {
  items: [],
  maxItems: 4,

  add(product) {
    if (this.items.length >= this.maxItems) {
      showToast("Comparison Full", `You can only compare up to ${this.maxItems} products`, "warning")
      return
    }

    if (this.items.find((p) => p.id === product.id)) {
      showToast("Already Added", "This product is already in comparison", "info")
      return
    }

    this.items.push(product)
    this.save()
    this.updateUI()
    showToast("Added to Comparison", `${product.name} added to comparison`, "success")
  },

  remove(productId) {
    this.items = this.items.filter((p) => p.id !== productId)
    this.save()
    this.updateUI()
  },

  clear() {
    this.items = []
    this.save()
    this.updateUI()
  },

  save() {
    localStorage.setItem("comparison", JSON.stringify(this.items))
  },

  load() {
    const saved = localStorage.getItem("comparison")
    if (saved) {
      try {
        this.items = JSON.parse(saved)
      } catch (e) {
        this.items = []
      }
    }
  },

  updateUI() {
    const badge = document.getElementById("comparisonCount")
    if (badge) {
      badge.textContent = this.items.length
      badge.style.display = this.items.length > 0 ? "flex" : "none"
    }
  },

  showComparison() {
    if (this.items.length < 2) {
      showToast("Add More Products", "Add at least 2 products to compare", "warning")
      return
    }

    // Create comparison modal
    const modal = document.createElement("div")
    modal.className = "comparison-modal"
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      overflow-y: auto;
      padding: 2rem;
    `

    let comparisonHTML = `
      <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2>Product Comparison</h2>
          <button onclick="this.closest('.comparison-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(${this.items.length}, 1fr); gap: 1rem;">
    `

    this.items.forEach((product) => {
      const finalPrice = calculateDiscount(product.price, product.discount_percent)
      comparisonHTML += `
        <div style="text-align: center;">
          <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <h3 style="margin-bottom: 0.5rem;">${product.name}</h3>
          <div style="font-size: 1.2rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 1rem;">
            ${formatPrice(finalPrice)}
          </div>
          <div style="text-align: left; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div style="margin-bottom: 0.5rem;"><strong>Amount:</strong> ${product.amount || "N/A"}</div>
            ${product.discount_percent > 0 ? `<div style="margin-bottom: 0.5rem;"><strong>Discount:</strong> ${product.discount_percent}%</div>` : ""}
            ${product.type ? `<div style="margin-bottom: 0.5rem;"><strong>Type:</strong> ${product.type}</div>` : ""}
          </div>
          <button onclick="ComparisonManager.remove('${product.id}'); this.closest('.comparison-modal').remove(); ComparisonManager.showComparison();" 
            style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
            Remove
          </button>
        </div>
      `
    })

    comparisonHTML += `
        </div>
        <button onclick="ComparisonManager.clear(); this.closest('.comparison-modal').remove();" 
          style="margin-top: 2rem; padding: 0.75rem 1.5rem; background: var(--primary-gradient); border: none; border-radius: var(--radius-md); color: white; cursor: pointer; font-weight: 600;">
          Clear All
        </button>
      </div>
    `

    modal.innerHTML = comparisonHTML
    document.body.appendChild(modal)
  },
}

/* ========================================
   RECENTLY VIEWED
======================================== */

const RecentlyViewedManager = {
  items: [],
  maxItems: 10,

  add(product) {
    // Remove if already exists
    this.items = this.items.filter((p) => p.id !== product.id)

    // Add to beginning
    this.items.unshift(product)

    // Limit to maxItems
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems)
    }

    this.save()
  },

  save() {
    localStorage.setItem("recentlyViewed", JSON.stringify(this.items))
  },

  load() {
    const saved = localStorage.getItem("recentlyViewed")
    if (saved) {
      try {
        this.items = JSON.parse(saved)
      } catch (e) {
        this.items = []
      }
    }
  },

  render(containerId) {
    const container = document.getElementById(containerId)
    if (!container || this.items.length === 0) return

    container.innerHTML = `
      <h3 style="margin-bottom: 1rem;">Recently Viewed</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
        ${this.items
          .map(
            (product) => `
          <div class="product-card" onclick="openProductDetail(${JSON.stringify(product).replace(/"/g, "&quot;")})">
            <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md);">
            <div style="padding: 0.5rem;">
              <div style="font-size: 0.9rem; font-weight: 600;">${product.name}</div>
              <div style="color: var(--accent-purple); font-weight: bold;">${formatPrice(calculateDiscount(product.price, product.discount_percent))}</div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `
  },
}

/* ========================================
   QUICK VIEW
======================================== */

function showQuickView(product) {
  const modal = document.createElement("div")
  modal.className = "quick-view-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2rem;
  `

  const finalPrice = calculateDiscount(product.price, product.discount_percent)

  modal.innerHTML = `
    <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2>Quick View</h2>
        <button onclick="this.closest('.quick-view-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;">
      <h3 style="margin-bottom: 0.5rem;">${product.name}</h3>
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">${product.amount || "N/A"}</div>
      <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 1rem;">
        ${formatPrice(finalPrice)}
        ${product.discount_percent > 0 ? `<span style="font-size: 1rem; text-decoration: line-through; color: var(--text-muted); margin-left: 0.5rem;">${formatPrice(product.price)}</span>` : ""}
      </div>
      ${product.description ? `<p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">${product.description}</p>` : ""}
      <div style="display: flex; gap: 1rem;">
        <button onclick="openProductDetail(${JSON.stringify(product).replace(/"/g, "&quot;")}); this.closest('.quick-view-modal').remove();" 
          class="buy-now-btn" style="flex: 1;">
          View Full Details
        </button>
        <button onclick="FavoritesManager.toggle('${product.id}')" 
          style="padding: 0.75rem 1rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
          <i class="far fa-heart"></i>
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

/* ========================================
   INITIALIZATION FOR INDEX1.JS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Load comparison items
  ComparisonManager.load()
  ComparisonManager.updateUI()

  // Load recently viewed
  RecentlyViewedManager.load()

  // Load wishlist
  if (AppState.sessionActive) {
    WishlistManager.load()
  }

  // Initialize lazy loading
  initLazyLoading()

  // Request notification permission if user is logged in
  if (AppState.sessionActive) {
    requestNotificationPermission()
  }
})

/* ========================================
   HELPER FUNCTIONS
======================================== */

// View order details function
function viewOrderDetails(orderId) {
  const order = AppState.orders.find((o) => o.id === orderId)
  if (!order) return

  const modal = document.createElement("div")
  modal.className = "order-details-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2rem;
  `

  let inputDataHTML = ""
  if (order.input_data) {
    try {
      const inputData = JSON.parse(order.input_data)
      inputDataHTML = Object.entries(inputData)
        .map(
          ([key, value]) => `
        <div style="margin-bottom: 0.5rem;">
          <strong>${key}:</strong> ${value}
        </div>
      `,
        )
        .join("")
    } catch (e) {
      console.error("Input data parse error:", e)
    }
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>Order Details</h2>
        <button onclick="this.closest('.order-details-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">Order #${order.order_id}</div>
        <div style="color: var(--text-secondary);">${new Date(order.created_at).toLocaleString()}</div>
      </div>
      
      <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
        <div style="margin-bottom: 0.5rem;"><strong>Product:</strong> ${order.products?.name}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Payment Method:</strong> ${order.payment_methods?.name}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Amount:</strong> ${formatPrice(order.amount)}</div>
        <div><strong>Status:</strong> <span style="color: ${order.status === "approved" ? "#4ade80" : order.status === "rejected" ? "#ef4444" : "#fbbf24"};">${order.status.toUpperCase()}</span></div>
      </div>
      
      ${
        inputDataHTML
          ? `
        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 1rem;">Order Information</h3>
          ${inputDataHTML}
        </div>
      `
          : ""
      }
      
      ${
        order.payment_proof_url
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem;">Payment Proof</h3>
          <img src="${order.payment_proof_url}" alt="Payment Proof" style="width: 100%; border-radius: var(--radius-md);">
        </div>
      `
          : ""
      }
      
      <div style="display: flex; gap: 1rem;">
        ${
          order.status === "approved" && order.download_url
            ? `
          <button onclick="downloadOrderPDF('${order.id}')" class="buy-now-btn" style="flex: 1;">
            <i class="fas fa-download"></i> Download
          </button>
        `
            : ""
        }
        <button onclick="printOrderReceipt('${order.id}')" style="flex: 1; padding: 0.75rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
          <i class="fas fa-print"></i> Print Receipt
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

/* ========================================
   FINAL INITIALIZATION
======================================== */

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp)
} else {
  initializeApp()
}

console.log("✅ Gaming Store v1.0.0 - All systems ready!")
