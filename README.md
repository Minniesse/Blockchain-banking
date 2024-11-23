# SEC-205 Distributed Ledger and Blockchain
## Assessment Report

Name: Paksaran Kongkaew
Email: pkongkae@cmkl.ac.th
Application Name: DeFi Lending Protocol (DLP)

## System Description

(1) Purposes and objectives of this application:
- Enable peer-to-peer lending and borrowing of cryptocurrency assets without traditional intermediaries
- Provide a transparent and automated lending system using smart contracts
- Allow users to earn interest by depositing their crypto assets into lending pools
- Enable users to obtain loans by providing cryptocurrency collateral
- Automate loan management including interest calculations, collateral monitoring, and liquidation processes

(2) Users of this application:
- Lenders: Users who want to earn interest by providing liquidity to the lending pools
- Borrowers: Users who need loans and are willing to provide crypto collateral
- Liquidators: External parties who help maintain system solvency by liquidating under-collateralized positions
- Platform administrators: Responsible for protocol governance and risk parameter updates

(3) Blockchain technology fit:
This application fits perfectly with blockchain technology because:
- Smart contracts can automate complex lending operations without human intermediaries
- Blockchain's immutability ensures transparent and auditable lending history
- Decentralized nature removes the need for traditional banking infrastructure
- Smart contracts can execute instant liquidations when required
- Token standards (ERC-20) provide a foundation for handling various crypto assets

(4) Reason for selecting this application:
- Growing demand for decentralized financial services
- Clear use case for smart contract automation
- Strong potential for implementing various security and privacy features
- Opportunity to demonstrate complex financial logic in smart contracts
- Real-world utility and practical application of blockchain technology

## System Architecture

Our DeFi Lending Protocol implements a three-layer architecture with external service integration:

1. User Interface Layer:
- Web Interface: React-based frontend application
- Web3 Wallet: MetaMask or other Ethereum wallet integration
- Provides user interface for lending, borrowing, and managing positions

2. Application Layer:
- API Gateway: Handles all external requests and Web3 interactions
- Caching Service: Optimizes data retrieval and reduces blockchain queries
- Indexing Service: Maintains organized transaction history and user activities
- Notification Service: Alerts users about important events (liquidation risks, etc.)

3. Smart Contract Layer:
- Lending Core Contract: Main contract handling lending/borrowing logic
- Token Contract: ERC-20 compatible contract for handling supported assets
- Price Feed Contract: Manages price oracle integration
- Governance Contract: Handles protocol parameters and upgrades

4. External Services:
- Chainlink Oracle: Provides reliable price feeds
- IPFS Storage: Stores additional metadata and documentation

## System Requirements

### Functional Requirements:
• User Account Management
  - Users can connect their Web3 wallets
  - Users can view their lending/borrowing positions
  - Users can check their collateral ratios

• Lending Functions
  - Users can deposit supported cryptocurrencies into lending pools
  - Users can withdraw their deposited assets plus earned interest
  - Users can view current lending APY rates

• Borrowing Functions
  - Users can borrow assets by providing collateral
  - Users can repay loans partially or fully
  - Users can add or remove collateral
  - System automatically calculates interest rates based on pool utilization

• Liquidation Functions
  - System monitors collateral ratios
  - Automatic liquidation triggers when positions become under-collateralized
  - Liquidators can execute liquidation transactions

### Non-functional Requirements:
• Performance
  - Smart contract transactions should complete within 2-3 block confirmations
  - UI should update within 3 seconds of blockchain confirmation
  - System should handle at least 1000 concurrent users

• Security
  - Smart contracts must be audited before deployment
  - Multi-signature requirements for admin functions
  - Emergency pause functionality for critical issues
  - Rate limiting for API calls

• Reliability
  - System should maintain 99.9% uptime
  - Fallback oracle providers for price feeds
  - Automatic backup of indexed data

### Other Requirements:
• Regulatory Compliance
  - KYC/AML integration capability
  - Transaction monitoring system
  - Compliance reporting functionality

• Development Requirements
  - Solidity version >=0.8.0
  - OpenZeppelin security standards
  - Comprehensive test coverage (>95%)
  - Documentation in NatSpec format

## Use Case Scenarios

### Use Case ID: UC-001
Use Case Name: Deposit Assets into Lending Pool
Use Case Description: User deposits supported cryptocurrency assets into the lending pool to earn interest
Stakeholders: 
- Depositor (Primary user)
- Smart Contract System
- Price Oracle
Steps/Procedures:
1. User connects Web3 wallet to platform
2. User selects asset type to deposit
   2a. System checks if asset is supported
   2b. If not supported, shows error message
3. User enters deposit amount
   3a. System checks wallet balance
   3b. If insufficient balance, shows error message
4. User approves token spending
5. User confirms deposit transaction
6. System:
   6a. Transfers tokens from user wallet
   6b. Mints equivalent lending tokens
   6c. Updates user position
7. System displays confirmation and new balance

### Use Case ID: UC-002
Use Case Name: Borrow Assets Using Collateral
Use Case Description: User borrows assets by providing cryptocurrency collateral
Stakeholders:
- Borrower (Primary user)
- Smart Contract System
- Price Oracle
- Risk Assessment System
Steps/Procedures:
1. User connects Web3 wallet
2. User selects collateral asset and amount
   2a. System validates collateral asset
   2b. System checks wallet balance
3. User selects asset to borrow and amount
4. System:
   4a. Calculates maximum borrowing capacity
   4b. Validates borrowing amount against collateral
   4c. Displays health factor and interest rate
5. User approves collateral token transfer
6. User confirms borrowing transaction
7. System:
   7a. Transfers collateral to protocol
   7b. Transfers borrowed assets to user
   7c. Updates user position and risk metrics

[Additional use cases UC-003 through UC-005 are implemented in the code but omitted here for brevity]

## Smart Contract List:

1. LendingPool Contract:
- Purpose: Core contract managing lending and borrowing operations
- Inputs: User address, token address, amount, operation type
- Outputs: Operation status, updated positions, events
- Key functions: deposit(), withdraw(), borrow(), repay()

2. TokenVault Contract:
- Purpose: Manages token storage and handling
- Inputs: Token address, amount, operation type
- Outputs: Operation status, vault balances, events
- Key functions: deposit(), withdraw(), getBalance()

3. PriceOracle Contract:
- Purpose: Provides price data for assets
- Inputs: Token address, price feed address
- Outputs: Current prices, validity status
- Key functions: getPrice(), updatePrice()

4. LiquidationManager Contract:
- Purpose: Handles under-collateralized position liquidations
- Inputs: Position details, liquidation parameters
- Outputs: Liquidation results, updated positions
- Key functions: liquidate(), calculateHealthFactor()

5. GovernanceController Contract:
- Purpose: Manages protocol parameters and governance
- Inputs: Proposal details, voting parameters
- Outputs: Voting results, executed changes
- Key functions: propose(), vote(), execute()

Link to Video File: [Your video link here]

## Security Analysis

(1) Application Security Assessment:
- Smart contracts implement comprehensive access controls
- Critical functions are protected by reentrancy guards
- Emergency pause functionality for risk mitigation
- Multi-signature requirements for administrative actions
- Timelock delays for parameter changes

(2) Data Protection:
- Personal data is stored off-chain
- On-chain data limited to essential financial information
- Asset transfers protected by approval mechanisms
- Price feeds secured through Chainlink oracles

(3) Security Implementations:
- OpenZeppelin security patterns utilized
- Regular security audits required
- Automated monitoring systems
- Circuit breakers for emergency situations

## Privacy Analysis

(1) Personal Data Usage:
- Minimal personal information collected
- Wallet addresses pseudonymized
- Optional KYC information stored off-chain
- Transaction history publicly visible but pseudonymous

(2) Privacy Features:
- Anonymity: Basic anonymity through wallet addresses
- Conditional Privacy: Optional KYC for higher limits
- Selective Disclosure: Users control information sharing

(3) Privacy Techniques Analysis:

| Techniques | Included? | Justifications |
|------------|-----------|----------------|
| Zero-Knowledge Proof | No | Not implemented in current version due to gas cost considerations. Future versions may include for specific operations. |
| Ring Signatures | No | Not necessary for basic lending operations. Could be added for enhanced privacy in future versions. |
| Stealth Addresses | No | Standard Ethereum addresses used for transparency and auditability. |
| Encryption | Yes | Used for off-chain data storage and communication. |
| Data Minimization | Yes | Only essential information stored on-chain. |

