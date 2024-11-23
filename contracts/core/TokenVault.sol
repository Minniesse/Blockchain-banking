// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TokenVault is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    struct TokenInfo {
        bool isSupported;
        uint256 totalBalance;
        uint256 reserveBalance;
        uint256 minimumReserve; // Percentage in basis points (1% = 100)
    }

    mapping(address => TokenInfo) public tokens;
    mapping(address => bool) public authorizedCallers;

    event TokenAdded(address indexed token, uint256 minimumReserve);
    event TokenRemoved(address indexed token);
    event TokenDeposited(address indexed token, address indexed from, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);
    event ReserveUpdated(address indexed token, uint256 newMinimumReserve);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || hasRole(VAULT_MANAGER_ROLE, msg.sender), 
                "Caller not authorized");
        _;
    }

    function addSupportedToken(address token, uint256 minimumReserve) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(token != address(0), "Invalid token address");
        require(!tokens[token].isSupported, "Token already supported");
        require(minimumReserve <= 10000, "Invalid reserve percentage");

        tokens[token] = TokenInfo({
            isSupported: true,
            totalBalance: 0,
            reserveBalance: 0,
            minimumReserve: minimumReserve
        });

        emit TokenAdded(token, minimumReserve);
    }

    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyAuthorized 
        returns (bool)
    {
        require(tokens[token].isSupported, "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        TokenInfo storage tokenInfo = tokens[token];
        
        // Transfer tokens from the sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update balances
        tokenInfo.totalBalance += amount;
        uint256 reserveAmount = (amount * tokenInfo.minimumReserve) / 10000;
        tokenInfo.reserveBalance += reserveAmount;

        emit TokenDeposited(token, msg.sender, amount);
        return true;
    }

    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyAuthorized returns (bool) {
        require(tokens[token].isSupported, "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient");

        TokenInfo storage tokenInfo = tokens[token];
        
        // Check available balance (total - reserve)
        uint256 availableBalance = tokenInfo.totalBalance - tokenInfo.reserveBalance;
        require(amount <= availableBalance, "Insufficient available balance");

        // Update balances
        tokenInfo.totalBalance -= amount;
        
        // Recalculate reserve based on new total balance
        uint256 newReserveRequired = (tokenInfo.totalBalance * tokenInfo.minimumReserve) / 10000;
        tokenInfo.reserveBalance = newReserveRequired;

        // Transfer tokens to recipient
        IERC20(token).safeTransfer(to, amount);

        emit TokenWithdrawn(token, to, amount);
        return true;
    }

    function updateMinimumReserve(address token, uint256 newMinimumReserve) 
        external 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        require(tokens[token].isSupported, "Token not supported");
        require(newMinimumReserve <= 10000, "Invalid reserve percentage");

        TokenInfo storage tokenInfo = tokens[token];
        tokenInfo.minimumReserve = newMinimumReserve;
        
        // Update reserve balance based on new percentage
        tokenInfo.reserveBalance = (tokenInfo.totalBalance * newMinimumReserve) / 10000;

        emit ReserveUpdated(token, newMinimumReserve);
    }

    function authorizeNewCaller(address caller) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(caller != address(0), "Invalid caller address");
        require(!authorizedCallers[caller], "Caller already authorized");

        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    function revokeCaller(address caller) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(authorizedCallers[caller], "Caller not authorized");

        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }

    // Emergency functions
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(EMERGENCY_ROLE) {
        require(tokens[token].isSupported, "Token not supported");
        require(to != address(0), "Invalid recipient");
        
        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }

    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // View functions
    function getTokenBalance(address token) external view returns (uint256) {
        return tokens[token].totalBalance;
    }

    function getAvailableBalance(address token) external view returns (uint256) {
        TokenInfo storage tokenInfo = tokens[token];
        return tokenInfo.totalBalance - tokenInfo.reserveBalance;
    }
}
