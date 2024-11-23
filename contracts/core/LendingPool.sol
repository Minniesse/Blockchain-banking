// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LendingPool
 * @notice Main lending pool contract that handles deposits, borrowing, repayments, and liquidations
 */
contract LendingPool is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    uint256 private constant UTILIZATION_RATE_PRECISION = 1e18;
    uint256 private constant INTEREST_RATE_PRECISION = 1e18;
    uint256 private constant LIQUIDATION_THRESHOLD = 8000; // 80% in basis points
    uint256 private constant LIQUIDATION_BONUS = 500;      // 5% in basis points

    struct UserPosition {
        uint256 deposited;
        uint256 borrowed;
        uint256 collateral;
        uint256 lastUpdateTimestamp;
        uint256 interestIndex;
    }

    struct PoolState {
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 lastUpdateTimestamp;
        uint256 utilizationRate;
        uint256 currentLendingRate;
        uint256 currentBorrowingRate;
        uint256 baseRate;
        uint256 rateSlope1;
        uint256 rateSlope2;
        uint256 interestIndex;
    }

    // User => Token => Position
    mapping(address => mapping(address => UserPosition)) public userPositions;
    
    // Token => PoolState
    mapping(address => PoolState) public poolStates;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount, uint256 collateralAmount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event LiquidationCall(
        address indexed user, 
        address indexed liquidator, 
        uint256 debtToCover, 
        uint256 liquidatedCollateralAmount
    );
    event TokenSupportUpdated(address indexed token, bool isSupported);
    event InterestRateUpdated(
        address indexed token,
        uint256 utilizationRate,
        uint256 lendingRate,
        uint256 borrowingRate
    );

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(RISK_ADMIN_ROLE, msg.sender);
        _setupRole(EMERGENCY_ROLE, msg.sender);
    }

    /**
     * @notice Deposits tokens into the lending pool
     * @param token The address of the token to deposit
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        PoolState storage poolState = poolStates[token];
        UserPosition storage position = userPositions[msg.sender][token];

        // Update pool state
        _updatePoolState(token);

        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update user position
        position.deposited += amount;
        position.lastUpdateTimestamp = block.timestamp;
        position.interestIndex = poolState.interestIndex;

        // Update pool totals
        poolState.totalDeposits += amount;

        emit Deposit(msg.sender, token, amount);
    }

    /**
     * @notice Borrows tokens from the lending pool using collateral
     * @param token The address of the token to borrow
     * @param amount The amount to borrow
     * @param collateralToken The address of the token to use as collateral
     * @param collateralAmount The amount of collateral to provide
     */
    function borrow(
        address token,
        uint256 amount,
        address collateralToken,
        uint256 collateralAmount
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[token] && supportedTokens[collateralToken], "Token not supported");
        require(amount > 0 && collateralAmount > 0, "Invalid amounts");

        PoolState storage poolState = poolStates[token];
        UserPosition storage position = userPositions[msg.sender][token];

        // Update pool state
        _updatePoolState(token);

        // Transfer collateral from user
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Update user position
        position.borrowed += amount;
        position.collateral += collateralAmount;
        position.lastUpdateTimestamp = block.timestamp;
        position.interestIndex = poolState.interestIndex;

        // Update pool totals
        poolState.totalBorrows += amount;

        // Transfer borrowed tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);

        // Check health factor after borrow
        require(_calculateHealthFactor(msg.sender, token) >= LIQUIDATION_THRESHOLD, "Insufficient collateral");

        emit Borrow(msg.sender, token, amount, collateralAmount);
    }

    /**
     * @notice Withdraws deposited tokens from the lending pool
     * @param token The address of the token to withdraw
     * @param amount The amount to withdraw
     */
    function withdraw(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        UserPosition storage position = userPositions[msg.sender][token];
        require(position.deposited >= amount, "Insufficient balance");

        // Update pool state
        _updatePoolState(token);

        // Update user position
        position.deposited -= amount;
        position.lastUpdateTimestamp = block.timestamp;

        // Update pool totals
        poolStates[token].totalDeposits -= amount;

        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, token, amount);
    }

    /**
     * @notice Repays borrowed tokens
     * @param token The address of the token to repay
     * @param amount The amount to repay
     */
    function repay(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        UserPosition storage position = userPositions[msg.sender][token];
        require(position.borrowed > 0, "No borrowed amount");

        // Update pool state
        _updatePoolState(token);

        uint256 repayAmount = amount > position.borrowed ? position.borrowed : amount;

        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), repayAmount);

        // Update user position
        position.borrowed -= repayAmount;
        position.lastUpdateTimestamp = block.timestamp;

        // Update pool totals
        poolStates[token].totalBorrows -= repayAmount;

        emit Repay(msg.sender, token, repayAmount);
    }

    /**
     * @notice Liquidates an unhealthy position
     * @param user Address of the user to liquidate
     * @param token Address of the debt token
     * @param debtToCover Amount of debt to cover
     */
    function liquidate(
        address user,
        address token,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused onlyRole(LIQUIDATOR_ROLE) {
        require(supportedTokens[token], "Token not supported");
        require(debtToCover > 0, "Amount must be greater than 0");

        UserPosition storage position = userPositions[user][token];
        require(position.borrowed > 0, "No debt to liquidate");

        // Check if position is liquidatable
        require(
            _calculateHealthFactor(user, token) < LIQUIDATION_THRESHOLD,
            "Position is healthy"
        );

        // Calculate liquidation amounts
        uint256 actualDebtToCover = debtToCover > position.borrowed 
            ? position.borrowed 
            : debtToCover;

        uint256 collateralToLiquidate = (actualDebtToCover * (LIQUIDATION_BONUS + 10000)) / 10000;
        require(collateralToLiquidate <= position.collateral, "Too much collateral to liquidate");

        // Update pool state
        _updatePoolState(token);

        // Update user position
        position.borrowed -= actualDebtToCover;
        position.collateral -= collateralToLiquidate;
        position.lastUpdateTimestamp = block.timestamp;

        // Update pool totals
        poolStates[token].totalBorrows -= actualDebtToCover;

        // Transfer tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), actualDebtToCover);
        IERC20(token).safeTransfer(msg.sender, collateralToLiquidate);

        emit LiquidationCall(user, msg.sender, actualDebtToCover, collateralToLiquidate);
    }

    /**
     * @notice Sets whether a token is supported by the lending pool
     * @param token The token address
     * @param isSupported Whether the token should be supported
     */
    function setSupportedToken(address token, bool isSupported) 
        external 
        onlyRole(RISK_ADMIN_ROLE) 
    {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = isSupported;
        emit TokenSupportUpdated(token, isSupported);
    }

    /**
     * @notice Updates the interest rate parameters for a token
     * @param token The token address
     * @param baseRate The base interest rate
     * @param slope1 The first slope of the interest rate curve
     * @param slope2 The second slope of the interest rate curve
     */
    function updateInterestRateParameters(
        address token,
        uint256 baseRate,
        uint256 slope1,
        uint256 slope2
    ) external onlyRole(RISK_ADMIN_ROLE) {
        require(supportedTokens[token], "Token not supported");
        
        PoolState storage poolState = poolStates[token];
        poolState.baseRate = baseRate;
        poolState.rateSlope1 = slope1;
        poolState.rateSlope2 = slope2;

        _updatePoolState(token);
    }

    /**
     * @notice Calculates the health factor for a user's position
     * @param user The user address
     * @param token The token address
     * @return The health factor (scaled by 10000)
     */
    function _calculateHealthFactor(address user, address token) 
        internal 
        view 
        returns (uint256) 
    {
        UserPosition storage position = userPositions[user][token];
        
        if (position.borrowed == 0) return type(uint256).max;
        
        return (position.collateral * 10000) / position.borrowed;
    }

    /**
     * @notice Updates the pool state including interest rates
     * @param token The token address
     */
    function _updatePoolState(address token) internal {
        PoolState storage poolState = poolStates[token];
        
        if (block.timestamp == poolState.lastUpdateTimestamp) return;

        // Calculate time delta
        uint256 timeDelta = block.timestamp - poolState.lastUpdateTimestamp;
        
        if (timeDelta > 0 && poolState.totalDeposits > 0) {
            // Calculate utilization rate
            poolState.utilizationRate = poolState.totalBorrows * UTILIZATION_RATE_PRECISION / poolState.totalDeposits;

            // Update interest rates
            poolState.currentLendingRate = _calculateLendingRate(poolState);
            poolState.currentBorrowingRate = _calculateBorrowingRate(poolState);

            // Update interest index
            uint256 interestAccrued = (poolState.currentBorrowingRate * timeDelta) / 365 days;
            poolState.interestIndex = poolState.interestIndex * (INTEREST_RATE_PRECISION + interestAccrued) / INTEREST_RATE_PRECISION;
        }

        poolState.lastUpdateTimestamp = block.timestamp;

        emit InterestRateUpdated(
            token,
            poolState.utilizationRate,
            poolState.currentLendingRate,
            poolState.currentBorrowingRate
        );
    }

    /**
     * @notice Calculates the current lending interest rate
     * @param poolState The pool state
     * @return The lending rate (scaled by INTEREST_RATE_PRECISION)
     */
    function _calculateLendingRate(PoolState storage poolState) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 utilizationRate = poolState.utilizationRate;
        
        if (utilizationRate <= UTILIZATION_RATE_PRECISION / 2) {
            return poolState.baseRate + 
                   (utilizationRate * poolState.rateSlope1) / UTILIZATION_RATE_PRECISION;
        } else {
            return poolState.baseRate + 
                   ((UTILIZATION_RATE_PRECISION / 2) * poolState.rateSlope1) / UTILIZATION_RATE_PRECISION +
                   ((utilizationRate - UTILIZATION_RATE_PRECISION / 2) * poolState.rateSlope2) / UTILIZATION_RATE_PRECISION;
        }
    }

    /**
     * @notice Calculates the current borrowing interest rate
     * @param poolState The pool state
     * @return The borrowing rate (scaled by INTEREST_RATE_PRECISION)
     */
    function _calculateBorrowingRate(PoolState storage poolState) 
        internal 
        view 
        returns (uint256) 
    {
        // Borrowing rate is typically higher than lending rate
        return _calculateLendingRate(poolState) * 12 / 10; // 20% premium
    }

    // Emergency functions
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Additional functions to be implemented:
    // - withdraw()
    // - repay()
    // - liquidate()
    // - getHealthFactor()
    // - updatePrices()
}