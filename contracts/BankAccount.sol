//SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract BankAccount {
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

        for (uint i; i < owners.length; i++) {
            if (owners[i] == msg.sender) revert("owner duplicated");
            if (owners.length >= 2) {
                for (uint j = i + 1; j < owners.length; j++) {
                    if (owners[i] == owners[j]) {
                        revert("owner duplicated");
                    }
                }
            }
        }

        _;
    }

    modifier requestExist(uint accountId, uint withdrawId) {
        require(
            accounts[accountId].withdrawRequest[withdrawId].user != address(0),
            "request does not exist!"
        );
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

    function requestWithdraw(
        uint accountId,
        uint amount
    ) external checkAccountOwner(accountId) {
        uint id = nextWithdrawId;
        WithdrawRequest storage request = accounts[id].withdrawRequest[id];
        request.user = msg.sender;
        request.amount = amount;
        request.approvals++;
        request.ownerApproved[msg.sender] = true;
        nextWithdrawId++;
        emit WithdrawRequested(
            msg.sender,
            accountId,
            id,
            amount,
            block.timestamp
        );
    }

    function approveWithdraw(
        uint accountId,
        uint withdrawId
    )
        external
        checkAccountOwner(accountId)
        requestExist(accountId, withdrawId)
    {
        WithdrawRequest storage request = accounts[accountId].withdrawRequest[
            withdrawId
        ];
        require(request.ownerApproved[msg.sender] == false, "Already approved");
        require(request.approved == false);
        request.approvals++;
        request.ownerApproved[msg.sender] = true;
        if (accounts[accountId].owners.length == request.approvals) {
            request.approved = true;
        }
    }

    function withdraw(
        uint accountId,
        uint withdrawId
    )
        external
        checkAccountOwner(accountId)
        requestExist(accountId, withdrawId)
    {
        WithdrawRequest storage request = accounts[accountId].withdrawRequest[
            withdrawId
        ];
        require(request.user == msg.sender, "");
        require(request.approved, "request not approved");
        uint amount = request.amount;
        require(accounts[accountId].balance >= amount, "Insufficient balance");
        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequest[withdrawId];
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "witdraw failure");
        emit Withdraw(withdrawId, block.timestamp);
    }

    function getBalance(uint accountId) public view returns (uint) {
        return accounts[accountId].balance;
    }

    function getOwners(uint accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;
    }

    function getApprovals(
        uint accountId,
        uint withdrawId
    ) public view returns (uint) {
        return accounts[accountId].withdrawRequest[withdrawId].approvals;
    }

    function getAccounts() public view returns (uint[] memory) {
        return userAccounts[msg.sender];
    }
}
