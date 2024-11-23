// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILendingPool {
    struct UserPosition {
        uint256 deposited;
        uint256 borrowed;
        uint256 collateral;
        uint256 lastUpdateTimestamp;
    }

    struct PoolState {
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 lastUpdateTimestamp;
        uint256 utilizationRate;
        uint256 currentLendingRate;
        uint256 currentBorrowingRate;
    }

    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
    function borrow(address token, uint256 amount, address collateralToken, uint256 collateralAmount) external;
    function repay(address token, uint256 amount) external;
    function getUserPosition(address user, address token) external view returns (
        uint256 deposited,
        uint256 borrowed,
        uint256 collateral,
        uint256 lastUpdateTimestamp
    );
    function getPoolState(address token) external view returns (PoolState memory);
}
