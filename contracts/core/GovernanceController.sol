// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GovernanceController is AccessControl, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    Counters.Counter private proposalIds;

    // Proposal states
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Executed }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes[] calldatas;
        address[] targets;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        uint256 forVotes;
        uint256 againstVotes;
        mapping(address => bool) hasVoted;
    }

    struct ProposalParameters {
        uint256 votingDelay;    // Delay before voting starts (in blocks)
        uint256 votingPeriod;   // Duration of voting (in blocks)
        uint256 quorumVotes;    // Minimum votes required for proposal to pass
    }

    mapping(uint256 => Proposal) public proposals;
    ProposalParameters public parameters;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        string description,
        uint256 startTime,
        uint256 endTime
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 weight
    );
    event ParametersUpdated(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 quorumVotes
    );

    constructor(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumVotes
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        parameters = ProposalParameters({
            votingDelay: _votingDelay,
            votingPeriod: _votingPeriod,
            quorumVotes: _quorumVotes
        });
    }

    function propose(
        address[] memory targets,
        bytes[] memory calldatas,
        string memory description
    ) external onlyRole(PROPOSER_ROLE) returns (uint256) {
        require(targets.length == calldatas.length, "Invalid proposal length");
        require(targets.length > 0, "Empty proposal");

        uint256 proposalId = proposalIds.current();
        proposalIds.increment();

        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.calldatas = calldatas;
        newProposal.targets = targets;
        newProposal.startTime = block.timestamp + parameters.votingDelay;
        newProposal.endTime = newProposal.startTime + parameters.votingPeriod;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            description,
            newProposal.startTime,
            newProposal.endTime
        );

        return proposalId;
    }

    function castVote(uint256 proposalId, bool support) external returns (uint256) {
        require(getProposalState(proposalId) == ProposalState.Active, "Voting is closed");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;

        // In a real implementation, vote weight would be determined by token balance
        uint256 weight = 1;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight);
        return weight;
    }

    function execute(uint256 proposalId) 
        external 
        onlyRole(EXECUTOR_ROLE) 
        returns (bool) 
    {
        require(
            getProposalState(proposalId) == ProposalState.Succeeded,
            "Proposal not succeeded"
        );

        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call(proposal.calldatas[i]);
            require(success, "Proposal execution failed");
        }

        emit ProposalExecuted(proposalId);
        return true;
    }

    function cancel(uint256 proposalId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(
            getProposalState(proposalId) != ProposalState.Executed,
            "Cannot cancel executed proposal"
        );

        Proposal storage proposal = proposals[proposalId];
        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    function getProposalState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.timestamp <= proposal.startTime) {
            return ProposalState.Pending;
        }

        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        if (proposal.forVotes <= proposal.againstVotes || 
            proposal.forVotes < parameters.quorumVotes) {
            return ProposalState.Defeated;
        }

        return ProposalState.Succeeded;
    }

    function updateParameters(
        uint256 newVotingDelay,
        uint256 newVotingPeriod,
        uint256 newQuorumVotes
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        parameters.votingDelay = newVotingDelay;
        parameters.votingPeriod = newVotingPeriod;
        parameters.quorumVotes = newQuorumVotes;

        emit ParametersUpdated(newVotingDelay, newVotingPeriod, newQuorumVotes);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // View functions
    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (
            address proposer,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool canceled,
            uint256 forVotes,
            uint256 againstVotes
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.canceled,
            proposal.forVotes,
            proposal.againstVotes
        );
    }

    function hasVoted(uint256 proposalId, address account) 
        external 
        view 
        returns (bool) 
    {
        return proposals[proposalId].hasVoted[account];
    }
}
