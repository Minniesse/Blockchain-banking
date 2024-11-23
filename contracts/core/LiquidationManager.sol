// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface ILendingPool {
    function getUserPosition(address user, address token) external view returns (
        uint256 deposited,
        uint256 borrowed,
        uint256 collateral,
        uint256 lastUpdateTimestamp
    );
}

contract LiquidationManager is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");

    struct LiquidationParameters {
        uint256 liquidationThreshold;     // threshold in basis points (e.g., 8000 = 80%)
        uint256 liquidationBonus;         // bonus in basis points (e.g., 500 = 5%)
        uint256 maxLiquidationAmount;     // maximum percentage that can be liquidated in one tx
    }

    IPriceOracle public priceOracle;
    ILendingPool public lendingPool;
    
    mapping(address => LiquidationParameters) public tokenParameters;
    mapping(address => bool) public supportedTokens;

    event LiquidationExecuted(
        address indexed user,
        address indexed liquidator,
        address debtToken,
        address collateralToken,
        uint256 debtAmount,
        uint256 collateralAmount
    );

    event LiquidationParametersUpdated(
        address indexed token,
        uint256 threshold,
        uint256 bonus,
        uint256 maxAmount
    );

    constructor(address _priceOracle, address _lendingPool) {
        require(_priceOracle != address(0) && _lendingPool != address(0), "Invalid addresses");
        priceOracle = IPriceOracle(_priceOracle);
        lendingPool = ILendingPool(_lendingPool);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function calculateHealthFactor(
        address user,
        address debtToken,
        address collateralToken
    ) public view returns (uint256) {
        (,uint256 borrowed, uint256 collateral,) = lendingPool.getUserPosition(user, debtToken);
        
        if (borrowed == 0) return type(uint256).max;

        uint256 debtPrice = priceOracle.getPrice(debtToken);
        uint256 collateralPrice = priceOracle.getPrice(collateralToken);
        
        uint256 debtValue = borrowed * debtPrice;
        uint256 collateralValue = collateral * collateralPrice;
        
        return (collateralValue * 10000) / debtValue;
    }

    function liquidate(
        address user,
        address debtToken,
        address collateralToken,
        uint256 debtAmount
    ) external nonReentrant whenNotPaused onlyRole(LIQUIDATOR_ROLE) {
        require(supportedTokens[debtToken] && supportedTokens[collateralToken], 
                "Unsupported tokens");

        // Check if position is liquidatable
        uint256 healthFactor = calculateHealthFactor(user, debtToken, collateralToken);
        require(healthFactor < tokenParameters[debtToken].liquidationThreshold, 
                "Position not liquidatable");

        // Get user position
        (,uint256 borrowed, uint256 collateral,) = lendingPool.getUserPosition(
            user, 
            debtToken
        );

        // Validate liquidation amount
        uint256 maxLiquidatable = (borrowed * tokenParameters[debtToken].maxLiquidationAmount) / 10000;
        require(debtAmount <= maxLiquidatable, "Exceeds max liquidation amount");

        // Calculate collateral to receive
        uint256 debtPrice = priceOracle.getPrice(debtToken);
        uint256 collateralPrice = priceOracle.getPrice(collateralToken);
        
        uint256 debtValue = debtAmount * debtPrice;
        uint256 baseCollateralAmount = (debtValue * 1e18) / collateralPrice;
        
        // Add liquidation bonus
        uint256 bonusAmount = (baseCollateralAmount * tokenParameters[debtToken].liquidationBonus) / 10000;
        uint256 totalCollateralAmount = baseCollateralAmount + bonusAmount;
        
        require(totalCollateralAmount <= collateral, "Insufficient collateral");

        // Execute liquidation
        // Transfer debt tokens from liquidator
        IERC20(debtToken).transferFrom(msg.sender, address(this), debtAmount);
        
        // Transfer collateral to liquidator
        IERC20(collateralToken).transfer(msg.sender, totalCollateralAmount);

        emit LiquidationExecuted(
            user,
            msg.sender,
            debtToken,
            collateralToken,
            debtAmount,
            totalCollateralAmount
        );
    }

    function setLiquidationParameters(
        address token,
        uint256 threshold,
        uint256 bonus,
        uint256 maxAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold <= 10000, "Invalid threshold");
        require(bonus <= 2000, "Bonus too high"); // Max 20% bonus
        require(maxAmount <= 10000, "Invalid max amount");

        tokenParameters[token] = LiquidationParameters({
            liquidationThreshold: threshold,
            liquidationBonus: bonus,
            maxLiquidationAmount: maxAmount
        });

        emit LiquidationParametersUpdated(token, threshold, bonus, maxAmount);
    }

    function addSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = false;
    }

    // Emergency functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
