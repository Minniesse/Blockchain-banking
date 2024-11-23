let provider;
let signer;
let friends = [];

// Add lending pool state
let lendingPoolState = {
    totalDeposits: 0,
    apy: 5.5, // Mock APY
    userDeposits: 0,
    userBorrows: 0,
    collateralRatio: 150, // 150% collateral required
    healthFactor: 1.0
};

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
        signer = provider.getSigner(selectedAccount);
        const userAddress = await signer.getAddress();
        
        const accounts = await provider.listAccounts();
        friends = await Promise.all(
            accounts
                .filter(address => address.toLowerCase() !== userAddress.toLowerCase())
                .map(async (address, index) => {
                    const balance = await provider.getBalance(address);
                    return {
                        name: getMockName(address, index),
                        address: address,
                        balance: ethers.utils.formatEther(balance)
                    };
                })
        );
        
        // Initialize all UI elements
        await updateAllUI();
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
            to: await signer.getAddress(), // Self-transfer for demo
            value: ethers.utils.parseEther(amount)
        });

        await tx.wait();
        
        // Update lending pool state
        lendingPoolState.userDeposits += Number(amount);
        lendingPoolState.totalDeposits += Number(amount);
        
        await updateAllUI();
        closeModal('depositModal');
        document.getElementById('depositAmount').value = '';
        
        alert("Deposit successful!");
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

        // Update lending pool state
        lendingPoolState.userDeposits -= Number(amount);
        lendingPoolState.totalDeposits -= Number(amount);
        
        await updateAllUI();
        alert("Withdrawal successful!");
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

        // Update lending pool state
        lendingPoolState.userBorrows += Number(amount);
        updateHealthFactor();
        
        await updateAllUI();
        closeModal('borrowModal');
        document.getElementById('borrowAmount').value = '';
        
        alert("Borrow successful!");
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

        // Update lending pool state
        lendingPoolState.userBorrows -= Number(amount);
        updateHealthFactor();
        
        await updateAllUI();
        alert("Repayment successful!");
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
    const balance = await provider.getBalance(await signer.getAddress());
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
        const balance = await provider.getBalance(address);
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

        await tx.wait();
        alert("Transfer successful!");

        // Update all balances and UI
        await getBalance();
        await updateFriendsBalances();
        await updateFriendsList();
        await updateRecipientSelect();
        
        // Clear form
        document.getElementById("amount").value = "";
        document.getElementById("recipientSelect").value = "";
    } catch (error) {
        console.error("Error transferring:", error);
        alert("Error transferring ETH: " + error.message);
    }
}

async function updateFriendsBalances() {
    for (let friend of friends) {
        const balance = await provider.getBalance(friend.address);
        friend.balance = ethers.utils.formatEther(balance);
    }
}

// Add a refresh function
async function refreshAll() {
    await getBalance();
    await updateFriendsBalances();
    await updateFriendsList();
    await updateRecipientSelect();
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