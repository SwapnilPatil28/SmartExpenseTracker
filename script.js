// ========================================
// APPLICATION STATE MANAGEMENT
// ========================================

const appState = {
    expenses: [],
    monthlyBudget: 0,
    warningTimeoutId: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedFilter: 'all'
};

// ========================================
// DOM ELEMENT REFERENCES
// ========================================

const monthlyBudgetInput = document.getElementById('monthlyBudget');
const setBudgetBtn = document.getElementById('setBudgetBtn');
const budgetDisplay = document.getElementById('budgetDisplay');
const totalSpentDisplay = document.getElementById('totalSpent');
const remainingBudgetDisplay = document.getElementById('remainingBudget');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');

const expenseForm = document.getElementById('expenseForm');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseCategorySelect = document.getElementById('expenseCategory');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseDateInput = document.getElementById('expenseDate');
const formError = document.getElementById('formError');
const addExpenseBtn = document.getElementById('addExpenseBtn');

const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAllBtn');
const categoryFilters = document.getElementById('categoryFilters');

const budgetWarning = document.getElementById('budgetWarning');
const warningClose = document.getElementById('warningClose');

const liveClock = document.getElementById('liveClock');

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })}`;
}


function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

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

function filterExpensesByCategory(expenses, category) {
    if (category === 'all') {
        return expenses;
    }
    return expenses.filter(expense => expense.category === category);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// LOCAL STORAGE MANAGEMENT
// ========================================

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

function getMonthName(monthNum) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNum];
}

function loadFromLocalStorage() {
    try {
        const savedState = localStorage.getItem('expenseTrackerState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            appState.expenses = parsedState.expenses || [];
            appState.monthlyBudget = parsedState.monthlyBudget || 0;
            appState.currentMonth = parsedState.currentMonth ?? new Date().getMonth();
            appState.currentYear = parsedState.currentYear ?? new Date().getFullYear();
            
            checkAndResetMonth();
            
            monthlyBudgetInput.value = appState.monthlyBudget;
            updateBudgetDisplay();
            renderExpenses(true);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// ========================================
// BUDGET MANAGEMENT
// ========================================

function isCurrentMonth(expense) {
    const [year, month, day] = expense.date.split('-').map(Number);
    const expenseDate = new Date(year, month - 1, day);
    
    return expenseDate.getMonth() === appState.currentMonth && 
           expenseDate.getFullYear() === appState.currentYear;
}

function calculateTotalSpent() {
    return appState.expenses
        .filter(expense => isCurrentMonth(expense))
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

function setMonthlyBudget() {
    const budgetValue = parseFloat(monthlyBudgetInput.value);
    
    if (isNaN(budgetValue) || budgetValue <= 0) {
        showFormError('Please enter a valid budget amount greater than zero');
        monthlyBudgetInput.focus();
        return;
    }
    
    appState.monthlyBudget = budgetValue;
    saveToLocalStorage();
    
    setBudgetBtn.disabled = true;
    setBudgetBtn.textContent = 'Saving...';
    
    setTimeout(() => {
        updateBudgetDisplay();
        setBudgetBtn.disabled = false;
        setBudgetBtn.textContent = 'Set Budget';
        monthlyBudgetInput.blur();
    }, 500);
}

function updateBudgetDisplay() {
    const totalSpent = calculateTotalSpent();
    const remaining = appState.monthlyBudget - totalSpent;
    const percentage = appState.monthlyBudget > 0 
        ? Math.min((totalSpent / appState.monthlyBudget) * 100, 100) 
        : 0;
    
    budgetDisplay.textContent = formatCurrency(appState.monthlyBudget);
    totalSpentDisplay.textContent = formatCurrency(totalSpent);
    remainingBudgetDisplay.textContent = formatCurrency(remaining);
    
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `${percentage.toFixed(1)}% spent`;
    
    if (percentage >= 90) {
        progressFill.classList.add('warning');
    } else {
        progressFill.classList.remove('warning');
    }
    
    if (remaining < 0 && appState.monthlyBudget > 0) {
        showBudgetWarning();
    }
}

function showBudgetWarning() {
    if (appState.warningTimeoutId) {
        clearTimeout(appState.warningTimeoutId);
    }
    
    budgetWarning.classList.add('show');
    
    appState.warningTimeoutId = setTimeout(() => {
        hideBudgetWarning();
    }, 5000);
}

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

function validateExpenseForm() {
    const amount = parseFloat(expenseAmountInput.value);
    const category = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value;
    
    if (isNaN(amount) || amount <= 0) {
        showFormError('Please enter a valid amount greater than zero');
        expenseAmountInput.focus();
        return null;
    }
    
    if (!category) {
        showFormError('Please select a category');
        expenseCategorySelect.focus();
        return null;
    }
    
    if (description.length === 0) {
        showFormError('Please enter a description');
        expenseDescriptionInput.focus();
        return null;
    }
    
    if (!date) {
        showFormError('Please select a date');
        expenseDateInput.focus();
        return null;
    }
    
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

function addExpense(e) {
    e.preventDefault();
    
    hideFormError();
    
    const expenseData = validateExpenseForm();
    if (!expenseData) {
        return;
    }
    
    addExpenseBtn.disabled = true;
    addExpenseBtn.classList.add('loading');
    addExpenseBtn.querySelector('.btn-text').textContent = 'Adding';
    
    setTimeout(() => {
        appState.expenses.push(expenseData);
        
        saveToLocalStorage();
        
        updateBudgetDisplay();
        renderExpenses();
        
        expenseForm.reset();
        
        addExpenseBtn.disabled = false;
        addExpenseBtn.classList.remove('loading');
        addExpenseBtn.querySelector('.btn-text').textContent = 'Add Expense';
    }, 600);
}

function deleteExpense(expenseId) {
    const expenseElement = document.querySelector(`[data-expense-id="${expenseId}"]`);
    
    if (expenseElement) {
        expenseElement.classList.add('deleting');
        
        setTimeout(() => {
            appState.expenses = appState.expenses.filter(expense => expense.id !== expenseId);
            
            saveToLocalStorage();
            
            updateBudgetDisplay();
            renderExpenses();
        }, 300);
    }
}

function clearAllExpenses() {
    if (appState.expenses.length === 0) {
        return;
    }
    
    if (confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
        appState.expenses = [];
        
        saveToLocalStorage();
        
        updateBudgetDisplay();
        renderExpenses();
    }
}

// ========================================
// DOM RENDERING
// ========================================

function createExpenseElement(expense, skipAnimation = false) {
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    if (skipAnimation) {
        expenseItem.classList.add('no-animation');
    }
    if (!isCurrentMonth(expense)) {
        expenseItem.classList.add('previous-month');
    }
    expenseItem.setAttribute('data-expense-id', expense.id);
    
    const expenseDetails = document.createElement('div');
    expenseDetails.className = 'expense-details';
    
    const expenseIcon = document.createElement('div');
    expenseIcon.className = 'expense-icon';
    expenseIcon.textContent = getCategoryIcon(expense.category);
    
    const expenseInfo = document.createElement('div');
    expenseInfo.className = 'expense-info';
    
    const expenseDescription = document.createElement('div');
    expenseDescription.className = 'expense-description';
    expenseDescription.textContent = expense.description;
    
    const expenseMeta = document.createElement('div');
    expenseMeta.className = 'expense-meta';
    
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'expense-category';
    categoryBadge.textContent = getCategoryName(expense.category);
    
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(expense.date);
    
    expenseMeta.appendChild(categoryBadge);
    expenseMeta.appendChild(dateSpan);
    
    expenseInfo.appendChild(expenseDescription);
    expenseInfo.appendChild(expenseMeta);
    
    expenseDetails.appendChild(expenseIcon);
    expenseDetails.appendChild(expenseInfo);
    
    const expenseAmount = document.createElement('div');
    expenseAmount.className = 'expense-amount';
    expenseAmount.textContent = formatCurrency(expense.amount);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${expense.description}`);
    
    deleteBtn.addEventListener('click', () => deleteExpense(expense.id));
    
    expenseItem.appendChild(expenseDetails);
    expenseItem.appendChild(expenseAmount);
    expenseItem.appendChild(deleteBtn);
    
    return expenseItem;
}

function renderExpenses(skipAnimation = false) {
    expenseList.innerHTML = '';
    
    const filteredExpenses = filterExpensesByCategory(appState.expenses, appState.selectedFilter);
    
    if (filteredExpenses.length === 0) {
        expenseList.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
        }
        
        return b.id.localeCompare(a.id);
    });
    
    sortedExpenses.forEach(expense => {
        const expenseElement = createExpenseElement(expense, skipAnimation);
        expenseList.appendChild(expenseElement);
    });
}

// ========================================
// ERROR HANDLING
// ========================================

function showFormError(message) {
    formError.textContent = message;
    formError.classList.add('show');
    
    setTimeout(() => {
        hideFormError();
    }, 5000);
}

function hideFormError() {
    formError.classList.remove('show');
}

// ========================================
// LIVE CLOCK
// ========================================

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

function initEventListeners() {
    setBudgetBtn.addEventListener('click', setMonthlyBudget);
    
    monthlyBudgetInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setMonthlyBudget();
        }
    });
    
    expenseForm.addEventListener('submit', addExpense);
    
    clearAllBtn.addEventListener('click', clearAllExpenses);
    
    warningClose.addEventListener('click', hideBudgetWarning);
    
    [expenseAmountInput, expenseCategorySelect, expenseDescriptionInput, expenseDateInput].forEach(input => {
        input.addEventListener('input', hideFormError);
    });
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('filter-btn-active'));
            e.target.classList.add('filter-btn-active');
            appState.selectedFilter = e.target.getAttribute('data-category');
            renderExpenses();
        });
    });
}

// ========================================
// APPLICATION INITIALIZATION
// ========================================

function initApp() {
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;
    expenseDateInput.max = today;
    
    loadFromLocalStorage();
    
    initEventListeners();
    
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    
    console.log('Smart Expense Tracker initialized successfully! 💰');
}

// ========================================
// START APPLICATION
// ========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
