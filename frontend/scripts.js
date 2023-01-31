// const { ethers } = require("hardhat");

const abi = [
  "event AccountCreated(address[] owners, uint256 indexed id, uint256 timestamp)",
  "event Deposit(address indexed user, uint256 indexed accountId, uint256 value, uint256 timestamp)",
  "event Withdraw(uint256 indexed withdrawId, uint256 timestamp)",
  "event WithdrawRequested(address indexed user, uint256 indexed accountId, uint256 indexed withdrawId, uint256 value, uint256 timestamp)",
  "function approveWithdraw(uint256 accountId, uint256 withdrawId)",
  "function createAccount(address[] _owners)",
  "function deposit(uint256 accountId) payable",
  "function getAccounts() view returns (uint256[])",
  "function getApprovals(uint256 accountId, uint256 withdrawId) view returns (uint256)",
  "function getBalance(uint256 accountId) view returns (uint256)",
  "function getOwners(uint256 accountId) view returns (address[])",
  "function requestWithdraw(uint256 accountId, uint256 amount)",
  "function withdraw(uint256 accountId, uint256 withdrawId)",
];
const address = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

const provider = new ethers.providers.Web3Provider(window.ethereum);
// await provider.send("eth_requestAccounts", []);
// const signer = provider.getSigner();
let contract = null;
async function getAccess() {
  if (contract) return;
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  contract = new ethers.Contract(address, abi, signer);

  const eventLog = document.getElementById("events");
  contract.on("AccountCreated", (owners, id) => {
    eventLog.append(`Account created! with id ${id}, owners = ${owners}`);
  });
}

async function createAccount() {
  await getAccess();
  const owners = document
    .getElementById("owners")
    .innerText.split(",")
    .filter((n) => n);
  await contract.createAccount(owners);
  viewAccounts();
}

async function viewAccounts() {
  await getAccess();
  const result = await contract.getAccounts();
  document.getElementById("accounts").innerHTML = result;
}
