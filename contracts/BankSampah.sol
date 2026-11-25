// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BankSampah {
    address public owner;

    uint256 public plastikRate = 100;
    uint256 public kertasRate = 80;
    uint256 public logamRate = 200;

    struct User {
        bool isRegistered;
        uint256 totalWeightKg;
        uint256 incentiveBalance;
    }

    mapping(address => User) public users;

    event UserRegistered(address indexed userAddress);
    event WasteCollected(
        address indexed userAddress,
        string wasteType,
        uint256 weightKg,
        uint256 incentiveEarned
    );
    event IncentiveWithdrawn(address indexed userAddress, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Hanya pemilik kontrak yang diizinkan");
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "Akun belum terdaftar");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerUser() external {
        require(!users[msg.sender].isRegistered, "Alamat sudah terdaftar");
        users[msg.sender] = User({
            isRegistered: true,
            totalWeightKg: 0,
            incentiveBalance: 0
        });
        emit UserRegistered(msg.sender);
    }

    function calculateIncentive(string memory wasteType, uint256 weightKg)
        public
        view
        returns (uint256)
    {
        bytes32 typeHash = keccak256(bytes(wasteType));
        if (typeHash == keccak256(bytes("plastik"))) {
            return weightKg * plastikRate;
        } else if (typeHash == keccak256(bytes("kertas"))) {
            return weightKg * kertasRate;
        } else if (typeHash == keccak256(bytes("logam"))) {
            return weightKg * logamRate;
        } else {
            revert("Jenis sampah tidak valid");
        }
    }

    function collectWaste(string memory wasteType, uint256 weightKg)
        external
        onlyRegistered
    {
        require(weightKg > 0, "Berat sampah harus lebih dari 0");
        uint256 incentive = calculateIncentive(wasteType, weightKg);
        users[msg.sender].totalWeightKg += weightKg;
        users[msg.sender].incentiveBalance += incentive;
        emit WasteCollected(msg.sender, wasteType, weightKg, incentive);
    }

    function withdrawIncentive(uint256 amount) external onlyRegistered {
        require(amount > 0, "Jumlah harus lebih dari 0");
        require(
            users[msg.sender].incentiveBalance >= amount,
            "Saldo insentif tidak mencukupi"
        );
        users[msg.sender].incentiveBalance -= amount;
        emit IncentiveWithdrawn(msg.sender, amount);
    }

    function getMySummary()
        external
        view
        returns (bool isRegistered, uint256 totalWeightKg, uint256 incentiveBalance)
    {
        User memory u = users[msg.sender];
        return (u.isRegistered, u.totalWeightKg, u.incentiveBalance);
    }
}