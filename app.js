// Global variables
let provider;
let wallet;
let contract;

// Add these at the top of your file
const deploymentAddresses = {
    "localhost": {
        "Bank": "0x5FbDB2315678afecb367f032d93F642f64180aa3" // This is the default first contract address in Hardhat
    }
};

const contractArtifact = {
    abi: [
        {
            "inputs": [],
            "name": "getBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "withdraw",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
};

// Get contract address based on network
async function getContractAddress() {
    try {
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name);
        
        if (network.name === "unknown") { // Local network
            return deploymentAddresses.localhost.Bank;
        }
        
        // Add logic for other networks if needed
        throw new Error("Unsupported network");
    } catch (error) {
        console.error("Error getting contract address:", error);
        return deploymentAddresses.localhost.Bank; // Fallback to localhost address
    }
}

// Initialize the application
async function init() {
    try {
        // Check if user is logged in
        const selectedAccountKey = localStorage.getItem('selectedAccount');
        if (!localStorage.getItem('isLoggedIn') || !selectedAccountKey) {
            window.location.href = 'account.html';
            return;
        }

        // Connect to local Hardhat network
        provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        
        // Create wallet instance with the selected account's private key
        wallet = new ethers.Wallet(selectedAccountKey, provider);
        const address = await wallet.getAddress();
        
        // Update only the avatar with the account's address as seed
        document.querySelector('#currentAccount img').src = 
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
        
        // Get contract address and initialize contract
        const contractAddress = await getContractAddress();
        console.log("Using contract address:", contractAddress);
        console.log("Connected with account:", address);
        
        contract = new ethers.Contract(contractAddress, contractArtifact.abi, wallet);
        
        // Initial UI updates
        await updateBalances();
        await loadTransactions();
        
        // Set up periodic updates
        setInterval(updateBalances, 5000);
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize application: ' + error.message, true);
    }
}

// Add this function for batch fetching
async function batchFetchBalances() {
    try {
        // Create a batch provider
        const batch = [];
        
        // Get wallet address
        const address = await wallet.getAddress();
        
        // Add balance requests to batch
        batch.push(provider.getBalance(address));
        if (contract) {
            batch.push(contract.getBalance());
        }
        
        // Execute all promises in parallel
        const [walletBalance, contractBalance] = await Promise.all(batch);
        
        // Update UI with results
        document.getElementById('walletBalance').textContent = 
            `ETH ${parseFloat(ethers.utils.formatEther(walletBalance)).toFixed(4)}`;
        
        if (contractBalance) {
            document.getElementById('contractBalance').textContent = 
                `ETH ${parseFloat(ethers.utils.formatEther(contractBalance)).toFixed(4)}`;
        }
        
        console.log('Batch balance fetch complete');
        return { walletBalance, contractBalance };
    } catch (error) {
        console.error('Batch fetch error:', error);
        showNotification('Failed to fetch balances', true);
    }
}

// Update the updateBalances function to use batch fetching
async function updateBalances() {
    try {
        const balances = await batchFetchBalances();
        
        // Calculate and update income/expenses if needed
        if (balances) {
            // You can add logic here to calculate income/expenses from transaction history
            const transactions = JSON.parse(localStorage.getItem(TRANSACTION_HISTORY_KEY) || '[]');
            
            let income = 0;
            let expenses = 0;
            
            transactions.forEach(tx => {
                if (tx.type === 'Received' || tx.type === 'Deposit') {
                    income += parseFloat(tx.amount);
                } else if (tx.type === 'Sent' || tx.type === 'Withdraw') {
                    expenses += parseFloat(tx.amount);
                }
            });
            
            document.getElementById('totalIncome').textContent = `ETH ${income.toFixed(4)}`;
            document.getElementById('totalExpenses').textContent = `ETH ${expenses.toFixed(4)}`;
        }
        
        console.log('Balances updated');
    } catch (error) {
        console.error('Error updating balances:', error);
        showNotification('Failed to update balances', true);
    }
}

// Add event listeners when the page loads
window.addEventListener('load', async () => {
    try {
        await init();
    } catch (error) {
        console.error('Failed to load application:', error);
        showNotification('Failed to load application', true);
    }
});

// Add this if you want to test the connection immediately
async function testConnection() {
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log('Current block number:', blockNumber);
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}

// Add these functions for transaction history management
const TRANSACTION_HISTORY_KEY = 'transactionHistory';

function saveTransaction(transaction) {
    try {
        // Get existing transactions
        let transactions = JSON.parse(localStorage.getItem(TRANSACTION_HISTORY_KEY) || '[]');
        
        // Add new transaction
        transactions.push({
            ...transaction,
            timestamp: Date.now(),
            status: 'Completed'
        });
        
        // Keep only last 50 transactions
        transactions = transactions.slice(-50);
        
        // Save back to localStorage
        localStorage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(transactions));
        
        // Update UI
        loadTransactions();
    } catch (error) {
        console.error('Error saving transaction:', error);
    }
}

// Add batch transaction fetching
async function batchFetchTransactions(fromBlock = 0, toBlock = 'latest') {
    try {
        const address = await wallet.getAddress();
        
        // Create filter for sent and received transactions
        const sentFilter = {
            fromBlock,
            toBlock,
            from: address
        };
        
        const receivedFilter = {
            fromBlock,
            toBlock,
            to: address
        };
        
        // Fetch transactions in parallel
        const [sentTxs, receivedTxs] = await Promise.all([
            provider.getLogs(sentFilter),
            provider.getLogs(receivedFilter)
        ]);
        
        // Combine and process transactions
        const allTxs = [...sentTxs, ...receivedTxs].map(async tx => {
            const receipt = await provider.getTransactionReceipt(tx.transactionHash);
            return {
                hash: tx.transactionHash,
                type: tx.from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received',
                amount: ethers.utils.formatEther(tx.value || '0'),
                timestamp: (await provider.getBlock(tx.blockNumber)).timestamp * 1000,
                status: receipt.status ? 'Completed' : 'Failed'
            };
        });
        
        return await Promise.all(allTxs);
    } catch (error) {
        console.error('Batch transaction fetch error:', error);
        return [];
    }
}

// Update loadTransactions to use batch fetching
async function loadTransactions() {
    try {
        const tbody = document.getElementById('transactionHistory');
        if (!tbody) return;
        
        tbody.innerHTML = ''; // Clear existing transactions
        
        // Get transactions from both localStorage and blockchain
        const localTxs = JSON.parse(localStorage.getItem(TRANSACTION_HISTORY_KEY) || '[]');
        const chainTxs = await batchFetchTransactions();
        
        // Combine and sort transactions
        const allTransactions = [...localTxs, ...chainTxs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50); // Keep only last 50 transactions
        
        if (allTransactions.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = 'No transactions';
            row.insertCell(1).textContent = '-';
            row.insertCell(2).textContent = '-';
            row.insertCell(3).textContent = '-';
            return;
        }

        // Display transactions
        allTransactions.forEach(tx => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = tx.type;
            row.insertCell(1).textContent = `${tx.amount} ETH`;
            row.insertCell(2).textContent = new Date(tx.timestamp).toLocaleString();
            row.insertCell(3).textContent = tx.status;
        });
    } catch (error) {
        console.error('Failed to load transactions:', error);
        const tbody = document.getElementById('transactionHistory');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4">Error loading transactions</td></tr>';
        }
    }
}

// Implement security checks
function validateTransaction(amount, recipient) {
    if (!ethers.utils.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
    }
    if (amount <= 0 || amount > maxTransactionLimit) {
        throw new Error('Invalid transaction amount');
    }
}

// Add emergency pause functionality
async function emergencyPause() {
    if (!isAdmin) throw new Error('Unauthorized');
    await contract.pause();
    showNotification('System paused for emergency');
}

// Implement price feed
async function getAssetPrice(tokenAddress) {
    try {
        const price = await contract.getLatestPrice(tokenAddress);
        return ethers.utils.formatUnits(price, 8); // Assuming 8 decimals
    } catch (error) {
        showNotification('Error fetching price', true);
        throw error;
    }
}

// Enhanced notification system
function showNotification(message, isError = false, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;
    
    // Add animation
    notification.style.animation = 'slideIn 0.5s ease-out';
    
    document.getElementById('notifications').appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, duration);
}

async function checkHealthFactor() {
    try {
        const healthFactor = await contract.calculateHealthFactor(wallet.address);
        if (healthFactor.lt(ethers.utils.parseUnits('1.5', 18))) {
            showNotification('Warning: Low health factor', true);
        }
        return healthFactor;
    } catch (error) {
        console.error('Error checking health factor:', error);
    }
}

function updateUI(data) {
    // Update balance displays
    document.getElementById('walletBalance').textContent = 
        `ETH ${parseFloat(ethers.utils.formatEther(data.balance)).toFixed(4)}`;
    
    // Update health factor indicator
    const healthFactor = data.healthFactor || 0;
    const healthStatus = document.getElementById('healthStatus');
    healthStatus.className = `health-status ${healthFactor < 1.5 ? 'warning' : 'good'}`;
    
    // Update transaction history
    loadTransactions();
}

// Add deposit function
async function deposit() {
    try {
        const amount = document.getElementById('depositAmount').value;
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', true);
            return;
        }

        const tx = await contract.deposit({
            value: ethers.utils.parseEther(amount.toString())
        });
        
        await tx.wait();
        
        // Save transaction
        saveTransaction({
            type: 'Deposit',
            amount: amount,
            from: await wallet.getAddress(),
            to: contract.address,
            hash: tx.hash
        });
        
        showNotification('Deposit transaction sent...');
        
        await tx.wait();
        showNotification('Deposit successful!');
        
        // Show receipt
        const address = await wallet.getAddress();
        showTransactionReceipt(
            'Deposit',
            amount,
            address,
            contract.address,
            tx.hash
        );
        
        // Update balances
        await updateBalances();
        await loadTransactions();
        
        // Clear input
        document.getElementById('depositAmount').value = '';
    } catch (error) {
        console.error('Deposit error:', error);
        showNotification('Deposit failed: ' + error.message, true);
    }
}

// Add withdraw function
async function withdraw() {
    try {
        const amount = document.getElementById('withdrawAmount').value;
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', true);
            return;
        }

        const tx = await contract.withdraw(ethers.utils.parseEther(amount.toString()));
        
        await tx.wait();
        
        // Save transaction
        saveTransaction({
            type: 'Withdraw',
            amount: amount,
            from: contract.address,
            to: await wallet.getAddress(),
            hash: tx.hash
        });
        
        showNotification('Withdraw transaction sent...');
        
        await tx.wait();
        showNotification('Withdrawal successful!');
        
        // Show receipt
        const address = await wallet.getAddress();
        showTransactionReceipt(
            'Withdraw',
            amount,
            address,
            contract.address,
            tx.hash
        );
        
        // Update balances
        await updateBalances();
        await loadTransactions();
        
        // Clear input
        document.getElementById('withdrawAmount').value = '';
    } catch (error) {
        console.error('Withdraw error:', error);
        showNotification('Withdrawal failed: ' + error.message, true);
    }
}

// Add this function to handle logout
async function logout() {
    try {
        // Clear any stored data
        localStorage.clear();
        sessionStorage.clear();
        
        // Reset contract and wallet
        contract = null;
        wallet = null;
        
        // Show notification
        showNotification('Logged out successfully');
        
        // Redirect to account page
        setTimeout(() => {
            window.location.href = 'account.html'; // Redirect to account page
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, true);
    }
}

// Add transfer function
async function transfer() {
    try {
        const amount = document.getElementById('transferAmount').value;
        const recipientSelect = document.getElementById('recipient');
        let recipient = recipientSelect.value;
        
        // Validate inputs
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', true);
            return;
        }
        
        if (!recipient) {
            showNotification('Please select a recipient', true);
            return;
        }

        // Convert amount to Wei
        const transferAmount = ethers.utils.parseEther(amount.toString());
        
        // Check wallet balance
        const balance = await provider.getBalance(wallet.address);
        if (balance.lt(transferAmount)) {
            showNotification('Insufficient balance', true);
            return;
        }

        // Create and send transaction
        const tx = await wallet.sendTransaction({
            to: recipient,
            value: transferAmount
        });
        
        await tx.wait();
        
        // Save transaction
        saveTransaction({
            type: 'Transfer',
            amount: amount,
            from: await wallet.getAddress(),
            to: recipient,
            hash: tx.hash
        });
        
        // Show receipt and update UI
        showTransactionReceipt(
            'Transfer',
            amount,
            await wallet.getAddress(),
            recipient,
            tx.hash
        );
        
        await updateBalances();
        
        // Clear form
        document.getElementById('transferAmount').value = '';
        recipientSelect.value = '';
        
    } catch (error) {
        console.error('Transfer error:', error);
        showNotification('Transfer failed: ' + error.message, true);
    }
}

// Add recipient change handler
function handleRecipientChange() {
    const recipientSelect = document.getElementById('recipient');
    const customAddressInput = document.getElementById('customAddress');
    
    if (recipientSelect.value === 'custom') {
        customAddressInput.style.display = 'block';
    } else {
        customAddressInput.style.display = 'none';
    }
}

// Update showTransactionReceipt function
function showTransactionReceipt(type, amount, from, to, hash) {
    try {
        const modal = document.getElementById('receiptModal');
        if (!modal) {
            console.error('Receipt modal not found');
            return;
        }

        // Update receipt details
        document.getElementById('receiptType').textContent = type;
        document.getElementById('receiptAmount').textContent = `${amount} ETH`;
        document.getElementById('receiptFrom').textContent = `${from.slice(0, 6)}...${from.slice(-4)}`;
        document.getElementById('receiptTo').textContent = `${to.slice(0, 6)}...${to.slice(-4)}`;
        document.getElementById('receiptHash').textContent = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
        document.getElementById('receiptTime').textContent = new Date().toLocaleString();
        
        // Show modal with animation
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.classList.add('show');
        
        console.log('Receipt modal displayed');
    } catch (error) {
        console.error('Error showing receipt:', error);
    }
}

function closeReceipt() {
    try {
        const modal = document.getElementById('receiptModal');
        if (!modal) {
            console.error('Modal not found');
            return;
        }
        
        // Add fade-out animation
        modal.style.opacity = '0';
        
        // Remove show class after animation
        setTimeout(() => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }, 300);
    } catch (error) {
        console.error('Error closing receipt:', error);
    }
}

// Add this function to test the modal
function testModal() {
    showTransactionReceipt(
        'Test Transfer',
        '1.0',
        '0x1234567890abcdef',
        '0xabcdef1234567890',
        '0x9876543210fedcba'
    );
}