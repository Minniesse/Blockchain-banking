const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceController", function () {
    let GovernanceController;
    let governance;
    let owner;
    let proposer;
    let executor;
    let voter1;
    let voter2;

    const votingDelay = 1;
    const votingPeriod = 5760;
    const quorumVotes = 100;

    beforeEach(async function () {
        [owner, proposer, executor, voter1, voter2] = await ethers.getSigners();

        GovernanceController = await ethers.getContractFactory("GovernanceController");
        governance = await GovernanceController.deploy(
            votingDelay,
            votingPeriod,
            quorumVotes
        );

        // Convert string to bytes32 using ethers
        const PROPOSER_ROLE = ethers.id("PROPOSER_ROLE");
        const EXECUTOR_ROLE = ethers.id("EXECUTOR_ROLE");

        await governance.grantRole(PROPOSER_ROLE, proposer.address);
        await governance.grantRole(EXECUTOR_ROLE, executor.address);
    });

    describe("Deployment", function () {
        it("Should set the correct initial parameters", async function () {
            const params = await governance.parameters();
            expect(params.votingDelay).to.equal(votingDelay);
            expect(params.votingPeriod).to.equal(votingPeriod);
            expect(params.quorumVotes).to.equal(quorumVotes);
        });
    });
});