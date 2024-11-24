let provider;
let signer;
let friends = [];
let cachedChainId = null;
let lastBalanceCheck = {
    timestamp: 0,
    balance: null
};

// Add lending pool state
let lendingPoolState = {
    totalDeposits: 0,
    apy: 5.5, // Mock APY
    userDeposits: 0,
    userBorrows: 0,
    collateralRatio: 150, // 150% collateral required
    healthFactor: 1.0
};

// Add logging system
const transactionLogs = [];

// Replace the single balance cache with a map of address-specific caches
let balanceCache = new Map();
const CACHE_DURATION = 5000; // Increase cache duration to 5 seconds

function getMockName(address, index) {
    const names = [
        "Alice", "Bob", "Charlie", "David", "Eva",
        "Frank", "Grace", "Henry", "Ivy", "Jack",
        "Kelly", "Liam", "Maria", "Noah", "Olivia",
        "Paul", "Quinn", "Rachel", "Sam", "Tom"
    ];
    return names[index] || `Friend ${index + 1}`;
}

async function initializeEthers() {
    try {
        const selectedAccount = localStorage.getItem('selectedAccount');
        if (!selectedAccount) {
            window.location.href = 'login.html';
            return;
        }

        provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        
        // Cache chainId
        if (!cachedChainId) {
            cachedChainId = await provider.getNetwork().then(network => network.chainId);
        }
        
        signer = provider.getSigner(selectedAccount);
        const userAddress = await signer.getAddress();
        
        const accounts = await provider.listAccounts();
        friends = await Promise.all(
            accounts
                .filter(address => address.toLowerCase() !== userAddress.toLowerCase())
                .map(async (address, index) => {
                    const balance = await getCachedBalance(address);
                    return {
                        name: getMockName(address, index),
                        address: address,
                        balance: ethers.utils.formatEther(balance)
                    };
                })
        );
        
        // Initialize all UI elements
        await updateAllUI();
        
        // Load saved logs
        loadLogsFromLocalStorage();
        
        // Add test button to UI (optional)
        addTestButton();
    } catch (error) {
        console.error("Error initializing:", error);
        document.getElementById("balance").innerHTML = "Error connecting to network";
    }
}

// Modal functions
function showDepositModal() {
    const modal = document.getElementById('depositModal');
    document.getElementById('modalApy').textContent = `${lendingPoolState.apy}%`;
    modal.style.display = "block";
}

function showBorrowModal() {
    const modal = document.getElementById('borrowModal');
    modal.style.display = "block";
    updateRequiredCollateral();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

// Lending pool functions
async function deposit() {
    try {
        const amount = document.getElementById('depositAmount').value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const tx = await signer.sendTransaction({
            to: await signer.getAddress(),
            value: ethers.utils.parseEther(amount)
        });
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            lendingPoolState.userDeposits += Number(amount);
            lendingPoolState.totalDeposits += Number(amount);
            
            await updateAllUI();
            closeModal('depositModal');
            document.getElementById('depositAmount').value = '';
            
            await logTransaction('DEPOSIT', {
                amount,
                initialBalance: await getBalanceNumber(),
                finalBalance: await getBalanceNumber(),
                txHash: receipt.transactionHash
            });
        }
        
    } catch (error) {
        console.error("Error depositing:", error);
        alert("Error making deposit: " + error.message);
    }
}

async function withdraw() {
    try {
        const amount = prompt("Enter amount to withdraw:");
        if (!amount || amount <= 0 || amount > lendingPoolState.userDeposits) {
            alert("Invalid withdrawal amount");
            return;
        }

        lendingPoolState.userDeposits -= Number(amount);
        lendingPoolState.totalDeposits -= Number(amount);
        
        await updateAllUI();
        
        logTransaction('WITHDRAW', {
            amount,
            initialBalance: await getBalanceNumber(),
            finalBalance: await getBalanceNumber()
        });
    } catch (error) {
        console.error("Error withdrawing:", error);
        alert("Error withdrawing: " + error.message);
    }
}

async function borrow() {
    try {
        const amount = document.getElementById('borrowAmount').value;
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const requiredCollateral = (amount * lendingPoolState.collateralRatio) / 100;
        const userBalance = await getBalanceNumber();
        
        if (userBalance < requiredCollateral) {
            alert("Insufficient balance for collateral");
            return;
        }

        const tx = await signer.sendTransaction({
            to: await signer.getAddress(),
            value: ethers.utils.parseEther(amount.toString())
        });
        await tx.wait();

        lendingPoolState.userBorrows += Number(amount);
        updateHealthFactor();
        
        await updateAllUI();
        closeModal('borrowModal');
        document.getElementById('borrowAmount').value = '';
        
        logTransaction('BORROW', {
            amount,
            initialBalance: await getBalanceNumber(),
            finalBalance: await getBalanceNumber()
        });
    } catch (error) {
        console.error("Error borrowing:", error);
        alert("Error borrowing: " + error.message);
    }
}

async function repay() {
    try {
        const amount = prompt("Enter amount to repay:");
        if (!amount || amount <= 0 || amount > lendingPoolState.userBorrows) {
            alert("Invalid repayment amount");
            return;
        }

        const tx = await signer.sendTransaction({
            to: await signer.getAddress(),
            value: ethers.utils.parseEther(amount.toString())
        });
        await tx.wait();

        lendingPoolState.userBorrows -= Number(amount);
        updateHealthFactor();
        
        await updateAllUI();
        
        logTransaction('REPAY', {
            amount,
            initialBalance: await getBalanceNumber(),
            finalBalance: await getBalanceNumber()
        });
    } catch (error) {
        console.error("Error repaying:", error);
        alert("Error repaying: " + error.message);
    }
}

// Helper functions
function updateHealthFactor() {
    if (lendingPoolState.userBorrows === 0) {
        lendingPoolState.healthFactor = 999;
        return;
    }
    
    const collateralValue = lendingPoolState.userDeposits;
    const borrowValue = lendingPoolState.userBorrows;
    lendingPoolState.healthFactor = (collateralValue / borrowValue) * 100;
}

function updateRequiredCollateral() {
    const borrowAmount = document.getElementById('borrowAmount').value;
    const required = borrowAmount ? (borrowAmount * lendingPoolState.collateralRatio) / 100 : 0;
    document.getElementById('requiredCollateral').textContent = `${required.toFixed(4)} ETH`;
}

async function getBalanceNumber() {
    const balance = await getCachedBalance(await signer.getAddress());
    return Number(ethers.utils.formatEther(balance));
}

// UI update functions
async function updateAllUI() {
    await getBalance();
    await updateFriendsBalances();
    await updateFriendsList();
    await updateRecipientSelect();
    updateLendingPoolUI();
    updateBorrowingUI();
}

function updateLendingPoolUI() {
    document.getElementById('currentApy').textContent = `${lendingPoolState.apy}%`;
    document.getElementById('yourDeposits').textContent = `${lendingPoolState.userDeposits.toFixed(4)} ETH`;
}

function updateBorrowingUI() {
    document.getElementById('collateralRatio').textContent = `${lendingPoolState.collateralRatio}%`;
    document.getElementById('healthFactor').textContent = lendingPoolState.healthFactor.toFixed(2);
    document.getElementById('yourCollateral').textContent = `${lendingPoolState.userDeposits.toFixed(4)} ETH`;
    document.getElementById('yourDebt').textContent = `${lendingPoolState.userBorrows.toFixed(4)} ETH`;
}

async function updateFriendsList() {
    const friendsList = document.getElementById("friendsList");
    // Refresh friends' balances before updating the list
    await updateFriendsBalances();
    
    friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item">
            <div class="friend-info">
                <div class="friend-avatar">${friend.name[0]}</div>
                <div class="friend-details">
                    <div class="friend-name">${friend.name}</div>
                </div>
            </div>
            <div class="friend-balance">${Number(friend.balance).toFixed(4)} ETH</div>
        </div>
    `).join('');
}

function updateRecipientSelect() {
    const select = document.getElementById("recipientSelect");
    select.innerHTML = '<option value="">Select recipient</option>' + 
        friends.map(friend => `
            <option value="${friend.address}">${friend.name} - ${Number(friend.balance).toFixed(4)} ETH</option>
        `).join('');
}

async function getBalance() {
    try {
        const address = await signer.getAddress();
        const balance = await getCachedBalance(address);
        const etherBalance = ethers.utils.formatEther(balance);
        document.getElementById("balance").innerHTML = `${Number(etherBalance).toFixed(4)} ETH`;
    } catch (error) {
        console.error("Error getting balance:", error);
        document.getElementById("balance").innerHTML = "Error fetching balance";
    }
}

async function transfer() {
    try {
        const recipient = document.getElementById("recipientSelect").value;
        const amount = document.getElementById("amount").value;

        if (!recipient || !amount) {
            alert("Please select a recipient and enter an amount");
            return;
        }

        const tx = await signer.sendTransaction({
            to: recipient,
            value: ethers.utils.parseEther(amount)
        });
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            await getBalance();
            await updateFriendsBalances();
            await updateFriendsList();
            await updateRecipientSelect();
            
            document.getElementById("amount").value = "";
            document.getElementById("recipientSelect").value = "";
            
            await logTransaction('TRANSFER', {
                amount,
                recipient,
                initialBalance: await getBalanceNumber(),
                finalBalance: await getBalanceNumber(),
                txHash: receipt.transactionHash
            });
        }
        
    } catch (error) {
        console.error("Error transferring:", error);
        alert("Error transferring ETH: " + error.message);
    }
}

async function updateFriendsBalances() {
    const addresses = friends.map(friend => friend.address);
    const balances = await batchGetBalances(addresses);
    
    friends.forEach(friend => {
        const balance = balances.get(friend.address);
        if (balance) {
            friend.balance = ethers.utils.formatEther(balance);
        }
    });
}

// Add a refresh function
async function refreshAll() {
    try {
        const userAddress = await signer.getAddress();
        const allAddresses = [userAddress, ...friends.map(f => f.address)];
        
        // Fetch all balances in one batch
        balanceCache.clear();
        const balances = await batchGetBalances(allAddresses);
        
        // Update UI with new balances
        const userBalance = balances.get(userAddress);
        if (userBalance) {
            document.getElementById("balance").innerHTML = 
                `${Number(ethers.utils.formatEther(userBalance)).toFixed(4)} ETH`;
        }
        
        // Update friends' balances
        friends.forEach(friend => {
            const balance = balances.get(friend.address);
            if (balance) {
                friend.balance = ethers.utils.formatEther(balance);
            }
        });
        
        // Update UI components
        await updateFriendsList();
        await updateRecipientSelect();
        updateLendingPoolUI();
        updateBorrowingUI();
    } catch (error) {
        console.error("Error refreshing:", error);
    }
}

// Initialize when page loads
window.addEventListener('load', initializeEthers);

// Add event listener for borrow amount input
document.getElementById('borrowAmount')?.addEventListener('input', updateRequiredCollateral);

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// Add logging system
async function logTransaction(type, details) {
    const timestamp = new Date().toISOString();
    const currentBalance = await getBalanceNumber();
    
    const log = {
        timestamp,
        type,
        details,
        currentBalance,
        balanceSnapshot: { ...lendingPoolState }
    };
    
    transactionLogs.push(log);
    
    // Enhanced console logging with current balance
    console.log('Transaction Log:', {
        ...log,
        currentBalance: `${currentBalance} ETH`
    });
    console.log('Current Balance:', `${currentBalance} ETH`);
    console.log('-------------------');
    
    // Show receipt
    await showTransactionReceipt(type, details, currentBalance);
    
    // Save to localStorage
    saveLogsToLocalStorage();
    
    // Update recent activity
    await updateRecentActivity();
}

function saveLogsToLocalStorage() {
    localStorage.setItem('transactionLogs', JSON.stringify(transactionLogs));
}

function loadLogsFromLocalStorage() {
    const savedLogs = localStorage.getItem('transactionLogs');
    if (savedLogs) {
        transactionLogs.push(...JSON.parse(savedLogs));
    }
}

// Test cases function
async function runTestCases() {
    console.log('Starting Test Cases...');
    
    try {
        // Test Case 1: Deposit
        console.log('\nTest Case 1: Deposit');
        await testDeposit(1.0); // Deposit 1 ETH
        await testDeposit(2.5); // Deposit 2.5 ETH
        
        // Test Case 2: Borrow
        console.log('\nTest Case 2: Borrow');
        await testBorrow(0.5); // Borrow 0.5 ETH
        await testBorrow(1.0); // Borrow 1.0 ETH
        
        // Test Case 3: Repay
        console.log('\nTest Case 3: Repay');
        await testRepay(0.3); // Repay 0.3 ETH
        await testRepay(0.7); // Repay 0.7 ETH
        
        // Test Case 4: Withdraw
        console.log('\nTest Case 4: Withdraw');
        await testWithdraw(0.5); // Withdraw 0.5 ETH
        await testWithdraw(1.0); // Withdraw 1.0 ETH
        
        // Test Case 5: Transfer
        console.log('\nTest Case 5: Transfer');
        await testTransfer(0.1); // Transfer 0.1 ETH
        
        console.log('\nAll test cases completed!');
        console.log('Full Transaction Logs:', transactionLogs);
        
    } catch (error) {
        console.error('Test Cases Failed:', error);
    }
}

// Individual test functions
async function testDeposit(amount) {
    try {
        console.log(`Testing Deposit: ${amount} ETH`);
        const initialBalance = await getBalanceNumber();
        
        // Perform deposit
        document.getElementById('depositAmount').value = amount;
        await deposit();
        
        const finalBalance = await getBalanceNumber();
        
        logTransaction('TEST_DEPOSIT', {
            amount,
            initialBalance,
            finalBalance,
            success: true
        });
        
        console.log('Deposit Test Result:', {
            amount,
            initialBalance,
            finalBalance,
            difference: finalBalance - initialBalance
        });
        
    } catch (error) {
        logTransaction('TEST_DEPOSIT_ERROR', {
            amount,
            error: error.message
        });
        console.error('Deposit Test Failed:', error);
    }
}

async function testBorrow(amount) {
    try {
        console.log(`Testing Borrow: ${amount} ETH`);
        const initialBalance = await getBalanceNumber();
        const initialBorrows = lendingPoolState.userBorrows;
        
        // Perform borrow
        document.getElementById('borrowAmount').value = amount;
        await borrow();
        
        const finalBalance = await getBalanceNumber();
        const finalBorrows = lendingPoolState.userBorrows;
        
        logTransaction('TEST_BORROW', {
            amount,
            initialBalance,
            finalBalance,
            initialBorrows,
            finalBorrows,
            success: true
        });
        
        console.log('Borrow Test Result:', {
            amount,
            initialBalance,
            finalBalance,
            borrowDifference: finalBorrows - initialBorrows
        });
        
    } catch (error) {
        logTransaction('TEST_BORROW_ERROR', {
            amount,
            error: error.message
        });
        console.error('Borrow Test Failed:', error);
    }
}

async function testRepay(amount) {
    try {
        console.log(`Testing Repay: ${amount} ETH`);
        const initialBalance = await getBalanceNumber();
        const initialBorrows = lendingPoolState.userBorrows;
        
        // Mock the prompt function for testing
        window.prompt = () => amount.toString();
        await repay();
        
        const finalBalance = await getBalanceNumber();
        const finalBorrows = lendingPoolState.userBorrows;
        
        logTransaction('TEST_REPAY', {
            amount,
            initialBalance,
            finalBalance,
            initialBorrows,
            finalBorrows,
            success: true
        });
        
        console.log('Repay Test Result:', {
            amount,
            initialBalance,
            finalBalance,
            repayDifference: initialBorrows - finalBorrows
        });
        
    } catch (error) {
        logTransaction('TEST_REPAY_ERROR', {
            amount,
            error: error.message
        });
        console.error('Repay Test Failed:', error);
    }
}

async function testWithdraw(amount) {
    try {
        console.log(`Testing Withdraw: ${amount} ETH`);
        const initialBalance = await getBalanceNumber();
        const initialDeposits = lendingPoolState.userDeposits;
        
        // Mock the prompt function for testing
        window.prompt = () => amount.toString();
        await withdraw();
        
        const finalBalance = await getBalanceNumber();
        const finalDeposits = lendingPoolState.userDeposits;
        
        logTransaction('TEST_WITHDRAW', {
            amount,
            initialBalance,
            finalBalance,
            initialDeposits,
            finalDeposits,
            success: true
        });
        
        console.log('Withdraw Test Result:', {
            amount,
            initialBalance,
            finalBalance,
            withdrawDifference: initialDeposits - finalDeposits
        });
        
    } catch (error) {
        logTransaction('TEST_WITHDRAW_ERROR', {
            amount,
            error: error.message
        });
        console.error('Withdraw Test Failed:', error);
    }
}

async function testTransfer(amount) {
    try {
        console.log(`Testing Transfer: ${amount} ETH`);
        const initialBalance = await getBalanceNumber();
        
        // Get first friend's address for testing
        const recipient = friends[0]?.address;
        if (!recipient) throw new Error('No recipient available for testing');
        
        // Perform transfer
        document.getElementById('recipientSelect').value = recipient;
        document.getElementById('amount').value = amount;
        await transfer();
        
        const finalBalance = await getBalanceNumber();
        
        logTransaction('TEST_TRANSFER', {
            amount,
            recipient,
            initialBalance,
            finalBalance,
            success: true
        });
        
        console.log('Transfer Test Result:', {
            amount,
            recipient,
            initialBalance,
            finalBalance,
            transferDifference: initialBalance - finalBalance
        });
        
    } catch (error) {
        logTransaction('TEST_TRANSFER_ERROR', {
            amount,
            error: error.message
        });
        console.error('Transfer Test Failed:', error);
    }
}

// Add test button to UI (optional)
function addTestButton() {
    const navbar = document.querySelector('.navbar');
    const testButton = document.createElement('button');
    testButton.className = 'action-btn';
    testButton.innerHTML = '<i class="fas fa-vial"></i> Run Tests';
    testButton.onclick = runTestCases;
    navbar.appendChild(testButton);
}

// Update showTransactionReceipt function
async function showTransactionReceipt(type, details, currentBalance) {
    const modal = document.getElementById('receiptModal');
    const overlay = document.getElementById('overlay');
    const timestamp = new Date().toLocaleString();
    
    // Set timestamp
    document.getElementById('receiptTimestamp').textContent = timestamp;
    
    // Create receipt content based on transaction type
    let receiptContent = '';
    
    // Transaction type header
    receiptContent += `
        <div class="receipt-row">
            <strong>Transaction Type:</strong>
            <span>${type}</span>
        </div>
    `;
    
    // Add transaction-specific details
    switch(type) {
        case 'DEPOSIT':
            receiptContent += `
                <div class="receipt-row">
                    <span>Amount Deposited:</span>
                    <span>${details.amount} ETH</span>
                </div>
            `;
            break;
        case 'WITHDRAW':
            receiptContent += `
                <div class="receipt-row">
                    <span>Amount Withdrawn:</span>
                    <span>${details.amount} ETH</span>
                </div>
            `;
            break;
        case 'BORROW':
            receiptContent += `
                <div class="receipt-row">
                    <span>Amount Borrowed:</span>
                    <span>${details.amount} ETH</span>
                </div>
                <div class="receipt-row">
                    <span>Collateral Required:</span>
                    <span>${(details.amount * lendingPoolState.collateralRatio / 100).toFixed(4)} ETH</span>
                </div>
            `;
            break;
        case 'REPAY':
            receiptContent += `
                <div class="receipt-row">
                    <span>Amount Repaid:</span>
                    <span>${details.amount} ETH</span>
                </div>
            `;
            break;
        case 'TRANSFER':
            receiptContent += `
                <div class="receipt-row">
                    <span>Amount Sent:</span>
                    <span>${details.amount} ETH</span>
                </div>
                <div class="receipt-row">
                    <span>Recipient:</span>
                    <span>${details.recipient.slice(0, 6)}...${details.recipient.slice(-4)}</span>
                </div>
            `;
            break;
    }
    
    // Add balance information
    receiptContent += `
        <div class="receipt-row" style="margin-top: 15px;">
            <strong>Current Balance:</strong>
            <strong>${currentBalance} ETH</strong>
        </div>
    `;
    
    // Update receipt details
    document.getElementById('receiptDetails').innerHTML = receiptContent;
    
    // Show overlay and modal with fade
    overlay.style.display = 'block';
    modal.style.display = 'block';
    
    // Trigger reflow to ensure animation plays
    void overlay.offsetWidth;
    void modal.offsetWidth;
    
    overlay.classList.add('fade-in');
    modal.classList.add('fade-in');
}

// Update closeReceipt function
function closeReceipt() {
    const modal = document.getElementById('receiptModal');
    const overlay = document.getElementById('overlay');
    
    // Add fade out animation
    overlay.classList.remove('fade-in');
    modal.classList.remove('fade-in');
    overlay.classList.add('fade-out');
    modal.classList.add('fade-out');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        // Remove animation classes
        overlay.classList.remove('fade-out');
        modal.classList.remove('fade-out');
    }, 300); // Match animation duration (0.3s = 300ms)
}

// Add click handler for overlay to close receipt
document.getElementById('overlay').addEventListener('click', closeReceipt);

// Add this function to update recent activity
async function updateRecentActivity() {
    const recentActivity = document.querySelector('.recent-activity');
    const activityContent = document.createElement('div');
    
    // Get last 5 transactions from logs
    const recentTransactions = transactionLogs.slice(-5).reverse();
    
    const activityHTML = recentTransactions.map(log => {
        const date = new Date(log.timestamp).toLocaleString();
        let activityText = '';
        let iconClass = '';
        
        switch(log.type) {
            case 'DEPOSIT':
                iconClass = 'fas fa-arrow-down received';
                activityText = `Deposited ${log.details.amount} ETH`;
                break;
            case 'WITHDRAW':
                iconClass = 'fas fa-arrow-up sent';
                activityText = `Withdrew ${log.details.amount} ETH`;
                break;
            case 'BORROW':
                iconClass = 'fas fa-hand-holding-usd received';
                activityText = `Borrowed ${log.details.amount} ETH`;
                break;
            case 'REPAY':
                iconClass = 'fas fa-hand-holding-usd sent';
                activityText = `Repaid ${log.details.amount} ETH`;
                break;
            case 'TRANSFER':
                iconClass = 'fas fa-paper-plane sent';
                activityText = `Sent ${log.details.amount} ETH to ${log.details.recipient.slice(0, 6)}...`;
                break;
        }
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${log.type.toLowerCase()}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-text">${activityText}</div>
                    <div class="activity-date">${date}</div>
                </div>
                <div class="activity-amount">
                    ${log.currentBalance} ETH
                </div>
            </div>
        `;
    }).join('');
    
    activityContent.innerHTML = activityHTML || '<div class="no-activity">No recent activity</div>';
    
    // Clear previous content and add new
    const activityContainer = recentActivity.querySelector('.section-title').nextElementSibling;
    if (activityContainer) {
        activityContainer.remove();
    }
    recentActivity.appendChild(activityContent);
}

// Update the getCachedBalance function to handle multiple addresses
async function getCachedBalance(address, forceRefresh = false) {
    const now = Date.now();

    const cachedData = balanceCache.get(address);
    
    if (!forceRefresh && 
        cachedData && 
        (now - cachedData.timestamp) < CACHE_DURATION) {
        return cachedData.balance;
    }

    const balance = await provider.getBalance(address);
    balanceCache.set(address, {
        timestamp: now,
        balance: balance
    });
    
    return balance;
}

// Add batch balance fetching
async function batchGetBalances(addresses) {
    const now = Date.now();
    const balancesToFetch = [];
    const results = new Map();

    // Check cache first
    addresses.forEach(address => {
        const cachedData = balanceCache.get(address);
        if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
            results.set(address, cachedData.balance);
        } else {
            balancesToFetch.push(address);
        }
    });

    // Fetch only uncached balances
    if (balancesToFetch.length > 0) {
        const promises = balancesToFetch.map(address => 
            provider.getBalance(address).then(balance => {
                balanceCache.set(address, {
                    timestamp: now,
                    balance: balance
                });
                results.set(address, balance);
            })
        );
        await Promise.all(promises);
    }

    return results;
}