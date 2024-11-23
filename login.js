let provider;
let selectedAccount = null;

async function initializeLogin() {
    try {
        provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        const accounts = await provider.listAccounts();
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in the node');
        }

        // Get balances for all accounts
        const accountsWithBalances = await Promise.all(
            accounts.map(async (address, index) => {
                const balance = await provider.getBalance(address);
                return {
                    address,
                    balance: ethers.utils.formatEther(balance),
                    name: getMockName(address, index),
                    email: getMockEmail(address, index)
                };
            })
        );

        displayAccounts(accountsWithBalances);
    } catch (error) {
        console.error("Error initializing:", error);
        document.getElementById("accountsList").innerHTML = `Error: ${error.message}`;
    }
}

function getMockName(address, index) {
    const names = [
        "Tomi S. Olatunji", "Patricia Winston", "Scott Williams",
        "Prince Igwe", "Jessica Bloomer", "David Cooper",
        "Eva Martinez", "Frank Johnson", "Grace Wilson",
        "Henry Davis"
    ];
    return names[index] || `Account ${index + 1}`;
}

function getMockEmail(address, index) {
    const emails = [
        "tomisinolarunji2@gmail.com", "patriciawin@example.com", "williamsemail.gmail.com",
        "kingto.be@gmail.com", "jessicabloomer@gmail.com", "david.cooper@example.com",
        "eva.martinez@example.com", "frank.j@example.com", "grace.wilson@example.com",
        "henry.davis@example.com"
    ];
    return emails[index] || `account${index + 1}@example.com`;
}

function displayAccounts(accounts) {
    const accountsList = document.getElementById("accountsList");
    accountsList.innerHTML = accounts.map(account => `
        <button class="account-item" onclick="selectAccountItem('${account.address}')">
            <div class="account-avatar" style="background: #${account.address.slice(2,8)}; color: white; display: flex; align-items: center; justify-content: center;">
                ${account.name[0]}
            </div>
            <div class="account-info">
                <div class="account-name">${account.name}</div>
                <div class="account-address">${account.email}</div>
                <div class="hidden-address" style="display: none;">${account.address}</div>
            </div>
            <div class="select-indicator"></div>
        </button>
    `).join('');
}

function selectAccountItem(address) {
    console.log("Selected address:", address);

    // Remove selected class from all items
    document.querySelectorAll('.account-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Find the clicked item by searching through all account items
    const items = document.querySelectorAll('.account-item');
    for (let item of items) {
        const hiddenAddress = item.querySelector('.hidden-address');
        if (hiddenAddress && hiddenAddress.textContent === address) {
            item.classList.add('selected');
            selectedAccount = address;
            const continueBtn = document.getElementById('continueBtn');
            continueBtn.disabled = false;
            break;
        }
    }
}

function continueToApp() {
    if (selectedAccount) {
        localStorage.setItem('selectedAccount', selectedAccount);
        window.location.href = 'index.html';
    }
}

// Initialize when page loads
window.addEventListener('load', initializeLogin); 