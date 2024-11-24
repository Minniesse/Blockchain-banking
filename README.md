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

Our DeFi Lending Protocol implements a client-side web architecture:

1. User Interface Layer:
- HTML/CSS-based frontend application (index.html, login.html)
- Web3 integration via ethers.js
- Responsive design with modern UI components
- Transaction receipt system for operation feedback

2. Application Layer:
- Client-side JavaScript (app.js, login.js)
- Balance caching system for performance optimization
- Transaction logging and monitoring
- State management for lending pool operations

3. Smart Contract Interaction Layer:
- Ethers.js provider and signer setup
- Local blockchain connection (http://127.0.0.1:8545)
- Transaction handling and event management
- Balance and state updates

4. Testing and Monitoring:
- Automated test cases for all operations
- Transaction logging system
- Local storage for persistent data
- Performance monitoring

## System Requirements

### Functional Requirements:
• User Account Management
  - Users can connect to local blockchain network
  - Users can select from available accounts
  - Users can view real-time balance updates
  - Users can monitor transaction history

• Lending Functions
  - Users can deposit ETH into lending pools
  - Users can withdraw their deposited assets
  - Users can view current APY rates (currently fixed at 5.5%)
  - Transaction receipts provided for all operations

• Borrowing Functions
  - Users can borrow ETH against collateral
  - Users can repay loans partially or fully
  - Collateral ratio maintained at 150%
  - Health factor monitoring implemented

• Transfer Functions
  - Users can transfer ETH to other users
  - Friend list management
  - Transaction history tracking
  - Balance caching for performance

### Non-functional Requirements:
• Performance
  - Balance caching with 5-second duration
  - Batch balance fetching for multiple accounts
  - Optimized UI updates
  - Responsive transaction feedback

• Security
  - Transaction validation
  - Balance checks before operations
  - Error handling for all operations
  - Secure local storage implementation

• User Experience
  - Modal-based operation interfaces
  - Transaction receipts
  - Real-time balance updates
  - Friend list management

## Test Cases

The application includes comprehensive test cases:

1. Deposit Tests:
- Test Case: Deposit 1.0 ETH
- Test Case: Deposit 2.5 ETH
- Validation: Balance updates, event logging

2. Borrow Tests:
- Test Case: Borrow 0.5 ETH
- Test Case: Borrow 1.0 ETH
- Validation: Collateral checks, health factor updates

3. Repay Tests:
- Test Case: Repay 0.3 ETH
- Test Case: Repay 0.7 ETH
- Validation: Loan position updates, collateral release

4. Withdraw Tests:
- Test Case: Withdraw 0.5 ETH
- Test Case: Withdraw 1.0 ETH
- Validation: Balance updates, position checks

5. Transfer Tests:
- Test Case: Transfer 0.1 ETH
- Validation: Sender/receiver balance updates

## Implementation Details

### Key Components:

1. User Interface (index.html):
- Modern responsive design
- Modal-based operations
- Real-time balance display
- Transaction history view

2. Authentication (login.html):
- Account selection interface
- Account details display
- Session management

3. Core Logic (app.js):
- Lending pool operations
- Balance management
- Transaction handling
- Event logging

4. Authentication Logic (login.js):
- Account initialization
- Provider setup
- Session handling

### Key Features:

1. Balance Management:
- Caching system with 5-second duration
- Batch balance fetching
- Real-time updates

2. Transaction Logging:
- Detailed operation logging
- Local storage persistence
- Transaction receipts
- Test case results

3. Lending Pool:
- Fixed 5.5% APY
- 150% collateral ratio
- Health factor monitoring
- Proportional collateral release

4. User Experience:
- Modal interfaces
- Transaction feedback
- Friend list management
- Balance caching

## Security Analysis

(1) Application Security Implementation:
- Balance validation before operations
- Transaction confirmation waiting
- Error handling for all operations
- Local storage for transaction logs

(2) Data Management:
- Client-side balance caching
- Transaction history logging
- State management for lending operations
- Session handling for user accounts

(3) Security Features:
- Transaction validation
- Balance checks
- Error handling
- Secure local storage

## Privacy Analysis

(1) Data Handling:
- Local blockchain interaction
- Client-side state management
- Transaction logging
- Balance caching

(2) Privacy Features:
- Local network operations
- Client-side processing
- Minimal data storage
- Transaction logging

(3) Technical Implementation:

| Feature | Implementation | Details |
|---------|----------------|----------|
| Balance Caching | Yes | 5-second duration cache for performance |
| Transaction Logs | Yes | Local storage with detailed operation tracking |
| State Management | Yes | Client-side lending pool state handling |
| Error Handling | Yes | Comprehensive error catching and user feedback |
| Testing System | Yes | Automated test cases for all operations |

