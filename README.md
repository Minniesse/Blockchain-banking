# DeFi Lending Protocol (DLP)

## Overview
The DeFi Lending Protocol (DLP) is a comprehensive decentralized lending platform that reimagines traditional banking services through blockchain technology. Operating on a local Hardhat network environment (http://127.0.0.1:8545), it enables peer-to-peer lending and borrowing of cryptocurrency assets while maintaining robust security measures.

## System Description

The protocol democratizes lending services by eliminating traditional intermediaries through smart contracts. Key capabilities include:

- Automated lending operations with 5.5% APY
- Collateralized borrowing with 150% minimum ratio
- Algorithmic interest rate mechanisms
- Automated collateral management
- Real-time position monitoring
- Transparent transaction tracking

### Target Users
- Lenders seeking passive income through crypto lending
- Borrowers requiring loans with crypto collateral
- Liquidators maintaining system solvency
- Protocol administrators managing governance

## System Architecture

### User Interface Layer
- **Primary Interface**: `index.html` dashboard for lending operations
- **Authentication**: `login.html` for Web3 wallet connections
- **Styling**: `styles.css` for consistent UI design
- **Features**:
  - Real-time balance monitoring
  - Transaction receipt system
  - Modal-based confirmations
  - Operation logging

### Application Layer
- **Core Logic**: `app.js` for Web3 management and contract interactions
- **Authentication**: `login.js` for wallet connections
- **Performance**: 5-second balance caching system
- **State Management**: Client-side state handling

### Smart Contract Layer
- **Network**: Local Hardhat (http://127.0.0.1:8545)
- **Core Contracts**:
  - `LendingPool.sol`: Lending operations management
  - `TokenVault.sol`: Asset custody and access control
  - `PriceOracle.sol`: Price feed integration
  - `LiquidationManager.sol`: Risk management
  - `GovernanceController.sol`: Protocol governance

## Security Features

### Smart Contract Security
- OpenZeppelin security modules integration
- Role-based access control
- Reentrancy protection
- Emergency pause functionality
- Time-locked governance actions

### Data Protection
- Hybrid on-chain/off-chain approach
- Essential transaction data on-chain
- Sensitive user data secured off-chain
- Comprehensive input validation
- Automated health monitoring

### Risk Management
- 150% minimum collateralization ratio
- Automated liquidation processes
- Price feed validation
- Emergency controls

## Getting Started

### Prerequisites
- Node.js and npm
- Hardhat for local blockchain
- Web3-compatible browser
- MetaMask or similar wallet

### Installation
1. Clone repository
2. Install dependencies: `npm install`
3. Start local network: `npx hardhat node`
4. Deploy contracts: `npx hardhat run scripts/deploy.js`
5. Launch frontend: `npm start`

## Testing
Comprehensive test suite available in `/test` directory:
- `lending-pool-test.js`
- `liquidation-manager-test.js`
- `governance-controller-test.js`

## Documentation
For detailed documentation on smart contracts, APIs, and system architecture, please refer to the `/docs` directory.

## Contributing
We welcome contributions. Please review our contributing guidelines and code of conduct in the repository.

## License
This project is licensed under the MIT License - see LICENSE.md for details.