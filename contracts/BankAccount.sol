//SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract BankAccount {
    address owner;
    struct WithdrawRequest {
        address user;
        uint amount;
        uint approvals;
        mapping(address => bool) ownerApproved;
        bool approved;
    }

    struct Account {
        address[] owners;
        uint balance;
        mapping(uint => WithdrawRequest) withdrawRequest;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint[]) userAccounts;

    uint nextAccountId;
    uint nextWithdrawId;

    event Deposit(
        address indexed user,
        uint indexed accountId,
        uint value,
        uint timestamp
    );
    event WithdrawRequested(
        address indexed user,
        uint indexed accountId,
        uint indexed withdrawId,
        uint value,
        uint timestamp
    );

    event Withdraw(uint indexed withdrawId, uint timestamp);
    event AccountCreated(address[] owners, uint indexed id, uint timestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier checkAccountOwner(uint accountId) {
        bool isOwner = false;
        for (uint i; i < accounts[accountId].owners.length; i++) {
            if (accounts[accountId].owners[i] == msg.sender) {
                isOwner = true;
                break;
            }
        }
        require(isOwner, "You are not the owner");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length <= 4, "Max 4 owners per account");
        if (owners.length >= 2) {
            for (uint i; i < owners.length - 1; i++) {
                for (uint j = i + 1; j < owners.length; j++) {
                    if (owners[i] == owners[j]) {
                        revert("owner duplicated");
                    }
                }
            }
        }
        _;
    }

    function deposit(
        uint accountId
    ) external payable checkAccountOwner(accountId) {
        accounts[accountId].balance += msg.value;
    }

    function createAccount(
        address[] calldata _owners
    ) external validOwners(_owners) {
        address[] memory owners = new address[](_owners.length + 1);
        uint id = nextAccountId;
        for (uint i; i < _owners.length + 1; i++) {
            if (i == _owners.length) owners[_owners.length] = msg.sender;
            else owners[i] = _owners[i];
            if (userAccounts[owners[i]].length > 2) {
                revert("Max user account attempt");
            }
            userAccounts[owners[i]].push(id);
        }
        accounts[id].owners = owners;
        nextAccountId++;
        emit AccountCreated(owners, id, block.timestamp);
    }
}
