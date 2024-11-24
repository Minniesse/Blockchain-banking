// Sample accounts (replace with your actual accounts)
const accounts = [
    {
        name: "Account 1",
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    },
    {
        name: "Account 2",
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    },
    {
        name: "Account 3",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    }
];

let selectedAccount = null;
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

async function initializeAccounts() {
    const accountList = document.getElementById('accountList');
    accountList.innerHTML = '';

    for (const account of accounts) {
        const balance = await provider.getBalance(account.address);
        const formattedBalance = ethers.utils.formatEther(balance);

        const accountElement = document.createElement('div');
        accountElement.className = 'account-option';
        accountElement.innerHTML = `
            <img class="account-avatar" src="https://api.dicebear.com/7.x/avataaars/svg?seed=${account.name}" alt="Account avatar">
            <div class="account-details">
                <div class="account-name">${account.name}</div>
                <div class="account-address">${account.address.slice(0, 6)}...${account.address.slice(-4)}</div>
            </div>
            <div class="account-balance">ETH ${parseFloat(formattedBalance).toFixed(4)}</div>
        `;

        accountElement.addEventListener('click', () => selectAccount(account, accountElement));
        accountList.appendChild(accountElement);
    }

    // Add connect button
    const connectButton = document.createElement('button');
    connectButton.className = 'connect-button';
    connectButton.textContent = 'Connect Wallet';
    connectButton.disabled = true;
    connectButton.onclick = connectWallet;
    accountList.appendChild(connectButton);
}

function selectAccount(account, element) {
    // Remove selected class from all accounts
    document.querySelectorAll('.account-option').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selected class to clicked account
    element.classList.add('selected');
    selectedAccount = account;

    // Enable connect button
    document.querySelector('.connect-button').disabled = false;
}

async function connectWallet() {
    if (!selectedAccount) {
        showNotification('Please select an account', true);
        return;
    }

    try {
        // Store the selected account info
        localStorage.setItem('selectedAccount', selectedAccount.privateKey);
        localStorage.setItem('isLoggedIn', 'true');

        showNotification('Connected successfully!');
        
        // Redirect to main page after short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Failed to connect: ' + error.message, true);
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize when page loads
window.addEventListener('load', initializeAccounts); 