// ========================================
// APPLICATION STATE MANAGEMENT
// ========================================

/**
 * Application state object that holds all expense data and budget information
 * This is the single source of truth for the application
 */
const appState = {
    expenses: [],
    monthlyBudget: 0,
    warningTimeoutId: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

// ========================================
// DOM ELEMENT REFERENCES
// ========================================

// Budget elements
const monthlyBudgetInput = document.getElementById('monthlyBudget');
const setBudgetBtn = document.getElementById('setBudgetBtn');
const budgetDisplay = document.getElementById('budgetDisplay');
const totalSpentDisplay = document.getElementById('totalSpent');
const remainingBudgetDisplay = document.getElementById('remainingBudget');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');

// Expense form elements
const expenseForm = document.getElementById('expenseForm');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseCategorySelect = document.getElementById('expenseCategory');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseDateInput = document.getElementById('expenseDate');
const formError = document.getElementById('formError');
const addExpenseBtn = document.getElementById('addExpenseBtn');

// Expense list elements
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAllBtn');

// Warning banner elements
const budgetWarning = document.getElementById('budgetWarning');
const warningClose = document.getElementById('warningClose');

// Live clock element
const liveClock = document.getElementById('liveClock');

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format number as Indian Rupee currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })}`;
}

/**
 * Format date to readable string
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

/**
 * Get category icon based on category value
 * @param {string} category - Category name
 * @returns {string} Category emoji icon
 */
function getCategoryIcon(category) {
    const icons = {
        'food': '🍔',
        'transport': '🚗',
        'shopping': '🛍️',
        'entertainment': '🎬',
        'healthcare': '💊',
        'utilities': '💡',
        'education': '📚',
        'other': '📦'
    };
    return icons[category] || '📦';
}

/**
 * Get readable category name
 * @param {string} category - Category value
 * @returns {string} Readable category name
 */
function getCategoryName(category) {
    const names = {
        'food': 'Food & Dining',
        'transport': 'Transport',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'healthcare': 'Healthcare',
        'utilities': 'Utilities',
        'education': 'Education',
        'other': 'Other'
    };
    return names[category] || 'Other';
}

/**
 * Generate unique ID for expense items
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// LOCAL STORAGE MANAGEMENT
// ========================================

/**
 * Save application state to localStorage
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('expenseTrackerState', JSON.stringify({
            expenses: appState.expenses,
            monthlyBudget: appState.monthlyBudget,
            currentMonth: appState.currentMonth,
            currentYear: appState.currentYear
        }));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Check if month has changed since last visit and reset if needed
 */
function checkAndResetMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // If month or year has changed, reset to new month
    if (appState.currentMonth !== currentMonth || appState.currentYear !== currentYear) {
        appState.currentMonth = currentMonth;
        appState.currentYear = currentYear;
        console.log(`New month detected! Budget tracking reset for ${getMonthName(currentMonth)} ${currentYear}`);
        saveToLocalStorage();
    }
}

/**
 * Get month name from month number
 * @param {number} monthNum - Month number (0-11)
 * @returns {string} Month name
 */
function getMonthName(monthNum) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNum];
}

/**
 * Load application state from localStorage
 */
function loadFromLocalStorage() {
    try {
        const savedState = localStorage.getItem('expenseTrackerState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            appState.expenses = parsedState.expenses || [];
            appState.monthlyBudget = parsedState.monthlyBudget || 0;
            appState.currentMonth = parsedState.currentMonth ?? new Date().getMonth();
            appState.currentYear = parsedState.currentYear ?? new Date().getFullYear();
            
            // Check if month has changed and reset if needed
            checkAndResetMonth()
            appState.expenses = parsedState.expenses || [];
            appState.monthlyBudget = parsedState.monthlyBudget || 0;
            
            // Update UI with loaded data
            monthlyBudgetInput.value = appState.monthlyBudget;
            updateBudgetDisplay();
            renderExpenses(true); // Pass true to skip animations on initial load
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// ========================================
// BUDGET MANAGEMENT
// ========================================

/**
 * Check if an expense belongs to the current month
 * @param {Object} expense - Expense object with date property
 * @returns {boolean} True if expense is from current month
 */
function isCurrentMonth(expense) {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === appState.currentMonth && 
           expenseDate.getFullYear() === appState.currentYear;
}

/**
 * Calculate total spent amount from current month's expenses only
 * @returns {number} Total spent amount for current month
 */
function calculateTotalSpent() {
    return appState.expenses
        .filter(expense => isCurrentMonth(expense))
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

/**
 * Set monthly budget with validation
 */
function setMonthlyBudget() {
    const budgetValue = parseFloat(monthlyBudgetInput.value);
    
    // Validation: Check if budget is valid
    if (isNaN(budgetValue) || budgetValue <= 0) {
        showFormError('Please enter a valid budget amount greater than zero');
        monthlyBudgetInput.focus();
        return;
    }
    
    // Update state and save
    appState.monthlyBudget = budgetValue;
    saveToLocalStorage();
    
    // Show loading state
    setBudgetBtn.disabled = true;
    setBudgetBtn.textContent = 'Saving...';
    
    // Simulate save delay and update UI
    setTimeout(() => {
        updateBudgetDisplay();
        setBudgetBtn.disabled = false;
        setBudgetBtn.textContent = 'Set Budget';
        monthlyBudgetInput.blur();
    }, 500);
}

/**
 * Update all budget-related displays in the DOM
 */
function updateBudgetDisplay() {
    const totalSpent = calculateTotalSpent();
    const remaining = appState.monthlyBudget - totalSpent;
    const percentage = appState.monthlyBudget > 0 
        ? Math.min((totalSpent / appState.monthlyBudget) * 100, 100) 
        : 0;
    
    // Update budget displays
    budgetDisplay.textContent = formatCurrency(appState.monthlyBudget);
    totalSpentDisplay.textContent = formatCurrency(totalSpent);
    remainingBudgetDisplay.textContent = formatCurrency(remaining);
    
    // Update progress bar
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `${percentage.toFixed(1)}% spent`;
    
    // Change progress bar color based on percentage
    if (percentage >= 90) {
        progressFill.classList.add('warning');
    } else {
        progressFill.classList.remove('warning');
    }
    
    // Show warning if budget exceeded
    if (remaining < 0 && appState.monthlyBudget > 0) {
        showBudgetWarning();
    }
}

/**
 * Show budget exceeded warning with auto-hide
 */
function showBudgetWarning() {
    // Clear any existing timeout to prevent multiple timers
    if (appState.warningTimeoutId) {
        clearTimeout(appState.warningTimeoutId);
    }
    
    // Show warning banner
    budgetWarning.classList.add('show');
    
    // Auto-hide after 5 seconds
    appState.warningTimeoutId = setTimeout(() => {
        hideBudgetWarning();
    }, 5000);
}

/**
 * Hide budget warning banner
 */
function hideBudgetWarning() {
    budgetWarning.classList.remove('show');
    if (appState.warningTimeoutId) {
        clearTimeout(appState.warningTimeoutId);
        appState.warningTimeoutId = null;
    }
}

// ========================================
// EXPENSE MANAGEMENT
// ========================================

/**
 * Validate expense form inputs
 * @returns {Object|null} Validated expense data or null if invalid
 */
function validateExpenseForm() {
    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value;
    
    // Validation: Amount
    if (isNaN(amount) || amount <= 0) {
        showFormError('Please enter a valid amount greater than zero');
        expenseAmountInput.focus();
        return null;
    }
    
    // Validation: Category
    if (!category) {
        showFormError('Please select a category');
        expenseCategorySelect.focus();
        return null;
    }
    
    // Validation: Description
    if (description.length === 0) {
        showFormError('Please enter a description');
        expenseDescriptionInput.focus();
        return null;
    }
    
    // Validation: Date
    if (!date) {
        showFormError('Please select a date');
        expenseDateInput.focus();
        return null;
    }
    
    // Check if date is not in the future
    // Parse the date string (YYYY-MM-DD) and create a local date at midnight
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        showFormError('Date cannot be in the future');
        expenseDateInput.focus();
        return null;
    }
    
    return {
        id: generateId(),
        amount,
        category,
        description,
        date
    };
}

/**
 * Add new expense to the application
 * @param {Event} e - Form submit event
 */
function addExpense(e) {
    e.preventDefault();
    
    // Clear any previous errors
    hideFormError();
    
    // Validate form
    const expenseData = validateExpenseForm();
    if (!expenseData) {
        return;
    }
    
    // Show loading state
    addExpenseBtn.disabled = true;
    addExpenseBtn.classList.add('loading');
    addExpenseBtn.querySelector('.btn-text').textContent = 'Adding';
    
    // Simulate processing delay
    setTimeout(() => {
        // Add to state (push to array, sorting will happen during render)
        appState.expenses.push(expenseData);
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update UI
        updateBudgetDisplay();
        renderExpenses(); // Will sort and render with proper styling
        
        // Reset form
        expenseForm.reset();
        
        // Reset button state
        addExpenseBtn.disabled = false;
        addExpenseBtn.classList.remove('loading');
        addExpenseBtn.querySelector('.btn-text').textContent = 'Add Expense';
    }, 600);
}

/**
 * Delete expense by ID with animation
 * @param {string} expenseId - ID of expense to delete
 */
function deleteExpense(expenseId) {
    // Find the expense item element
    const expenseElement = document.querySelector(`[data-expense-id="${expenseId}"]`);
    
    if (expenseElement) {
        // Add deleting animation class
        expenseElement.classList.add('deleting');
        
        // Wait for animation to complete before removing from DOM and state
        setTimeout(() => {
            // Remove from state
            appState.expenses = appState.expenses.filter(expense => expense.id !== expenseId);
            
            // Save to localStorage
            saveToLocalStorage();
            
            // Update UI
            updateBudgetDisplay();
            renderExpenses();
        }, 300); // Match animation duration
    }
}

/**
 * Clear all expenses with confirmation
 */
function clearAllExpenses() {
    if (appState.expenses.length === 0) {
        return;
    // Mark as previous month expense if not from current month
    if (!isCurrentMonth(expense)) {
        expenseItem.classList.add('previous-month');
    }
    }
    
    // Ask for confirmation
    if (confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
        // Clear state
        appState.expenses = [];
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update UI
        updateBudgetDisplay();
        renderExpenses();
    }
}

// ========================================
// DOM RENDERING
// ========================================

/**
 * Create expense item DOM element
 * @param {Object} expense - Expense data object
 * @param {boolean} skipAnimation - Whether to skip entry animation
 * @returns {HTMLElement} Expense item element
 */
function createExpenseElement(expense, skipAnimation = false) {
    // Create main container
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    if (skipAnimation) {
        expenseItem.classList.add('no-animation');
    }
    expenseItem.setAttribute('data-expense-id', expense.id);
    
    // Create details container
    const expenseDetails = document.createElement('div');
    expenseDetails.className = 'expense-details';
    
    // Create icon
    const expenseIcon = document.createElement('div');
    expenseIcon.className = 'expense-icon';
    expenseIcon.textContent = getCategoryIcon(expense.category);
    
    // Create info container
    const expenseInfo = document.createElement('div');
    expenseInfo.className = 'expense-info';
    
    // Create description
    const expenseDescription = document.createElement('div');
    expenseDescription.className = 'expense-description';
    expenseDescription.textContent = expense.description;
    
    // Create meta container
    const expenseMeta = document.createElement('div');
    expenseMeta.className = 'expense-meta';
    
    // Create category badge
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'expense-category';
    categoryBadge.textContent = getCategoryName(expense.category);
    
    // Create date span
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(expense.date);
    
    // Assemble meta
    expenseMeta.appendChild(categoryBadge);
    expenseMeta.appendChild(dateSpan);
    
    // Assemble info
    expenseInfo.appendChild(expenseDescription);
    expenseInfo.appendChild(expenseMeta);
    
    // Assemble details
    expenseDetails.appendChild(expenseIcon);
    expenseDetails.appendChild(expenseInfo);
    
    // Create amount display
    const expenseAmount = document.createElement('div');
    expenseAmount.className = 'expense-amount';
    expenseAmount.textContent = formatCurrency(expense.amount);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${expense.description}`);
    
    // Add click event to delete button (using event delegation pattern)
    deleteBtn.addEventListener('click', () => deleteExpense(expense.id));
    
    // Assemble final element
    expenseItem.appendChild(expenseDetails);
    expenseItem.appendChild(expenseAmount);
    expenseItem.appendChild(deleteBtn);
    
    return expenseItem;
}

/**
 * Render all expenses to the DOM
 * @param {boolean} skipAnimation - Whether to skip entry animations
 */
function renderExpenses(skipAnimation = false) {
    // Clear expense list
    expenseList.innerHTML = '';
    
    // Show empty state if no expenses
    if (appState.expenses.length === 0) {
        expenseList.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Sort expenses by date (newest first), then by ID (most recent first)
    const sortedExpenses = [...appState.expenses].sort((a, b) => {
        // First compare by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime(); // Newer dates first
        }
        
        // If dates are same, sort by ID (which contains timestamp)
        // Newer IDs (created more recently) should come first
        return b.id.localeCompare(a.id);
    });
    
    // Create and append expense elements
    sortedExpenses.forEach(expense => {
        const expenseElement = createExpenseElement(expense, skipAnimation);
        expenseList.appendChild(expenseElement);
    });
}

// ========================================
// ERROR HANDLING
// ========================================

/**
 * Show form error message
 * @param {string} message - Error message to display
 */
function showFormError(message) {
    formError.textContent = message;
    formError.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideFormError();
    }, 5000);
}

/**
 * Hide form error message
 */
function hideFormError() {
    formError.classList.remove('show');
}

// ========================================
// LIVE CLOCK (setInterval)
// ========================================

/**
 * Update live clock display with current time
 */
function updateLiveClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    liveClock.textContent = `Last updated: ${hours}:${minutes}:${seconds}`;
}

// ========================================
// EVENT LISTENERS
// ========================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Budget management
    setBudgetBtn.addEventListener('click', setMonthlyBudget);
    
    // Allow Enter key to set budget
    monthlyBudgetInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setMonthlyBudget();
        }
    });
    
    // Expense form submission
    expenseForm.addEventListener('submit', addExpense);
    
    // Clear all expenses
    clearAllBtn.addEventListener('click', clearAllExpenses);
    
    // Warning close button
    warningClose.addEventListener('click', hideBudgetWarning);
    
    // Clear form errors on input
    [expenseAmountInput, expenseCategorySelect, expenseDescriptionInput, expenseDateInput].forEach(input => {
        input.addEventListener('input', hideFormError);
    });
}

// ========================================
// APPLICATION INITIALIZATION
// ========================================

/**
 * Initialize the application
 */
function initApp() {
    // Set today's date as default in date input
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;
    expenseDateInput.max = today; // Prevent future dates
    
    // Load saved data from localStorage
    loadFromLocalStorage();
    
    // Initialize event listeners
    initEventListeners();
    
    // Start live clock (updates every second)
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    
    console.log('Smart Expense Tracker initialized successfully! 💰');
}

// ========================================
// START APPLICATION
// ========================================

// Initialize app when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
