// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BankingApp {
    mapping(address => uint256) private balances;
    mapping(address => Transaction[]) private transactions;

    struct Transaction {
        uint256 amount;
        uint256 timestamp;
        string transactionType;
    }

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        balances[msg.sender] += msg.value;
        
        transactions[msg.sender].push(Transaction({
            amount: msg.value,
            timestamp: block.timestamp,
            transactionType: "Deposit"
        }));
        
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        transactions[msg.sender].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Withdrawal"
        }));
        
        emit Withdrawal(msg.sender, amount);
    }

    function transfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        transactions[msg.sender].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Transfer Sent"
        }));

        transactions[to].push(Transaction({
            amount: amount,
            timestamp: block.timestamp,
            transactionType: "Transfer Received"
        }));

        emit Transfer(msg.sender, to, amount);
    }

    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    function getTransactionHistory() external view returns (Transaction[] memory) {
        return transactions[msg.sender];
    }
} 