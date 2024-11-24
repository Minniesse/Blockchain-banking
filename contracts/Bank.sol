// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Bank {
    struct Transaction {
        uint256 amount;
        uint256 timestamp;
        string transactionType;
    }

    mapping(address => uint256) private balances;
    mapping(address => Transaction[]) private transactionHistory;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Transferred(address indexed from, address indexed to, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        balances[msg.sender] += msg.value;
        
        transactionHistory[msg.sender].push(Transaction({
            amount: msg.value,
            timestamp: block.timestamp,
            transactionType: "Deposit"
        }));
        
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        transactionHistory[msg.sender].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Withdraw"
        }));
        
        emit Withdrawn(msg.sender, amount);
    }

    function transfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        transactionHistory[msg.sender].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Transfer Sent"
        }));
        
        transactionHistory[to].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Transfer Received"
        }));
        
        emit Transferred(msg.sender, to, amount);
    }

    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    function getTransactionHistory() external view returns (Transaction[] memory) {
        return transactionHistory[msg.sender];
    }
} 