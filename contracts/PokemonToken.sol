// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonToken
 * @dev ERC20 utility token for the PokeDex in-game economy.
 * Used for tournament entry fees, staking, and battle rewards.
 */
contract PokemonToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    // Authorized minters (BattleRewards contract, staking contracts, etc.)
    mapping(address => bool) public minters;

    // Staking state
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakeTimestamp;

    uint256 public tournamentEntryFee = 10 * 10 ** 18; // 10 tokens per tournament entry

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 reward);
    event TournamentEntryFeeUpdated(uint256 newFee);

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    constructor() ERC20("PokemonToken", "PKT") Ownable(msg.sender) {
        // Mint initial supply to owner for ecosystem bootstrapping
        _mint(msg.sender, 100_000_000 * 10 ** 18); // 100M initial supply
    }

    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function setTournamentEntryFee(uint256 fee) external onlyOwner {
        tournamentEntryFee = fee;
        emit TournamentEntryFeeUpdated(fee);
    }

    function payTournamentEntry() external {
        require(balanceOf(msg.sender) >= tournamentEntryFee, "Insufficient PKT balance");
        _burn(msg.sender, tournamentEntryFee); // Burn entry fee to control supply
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        emit TokensStaked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        uint256 duration = block.timestamp - stakeTimestamp[msg.sender];
        // 0.01% reward per day staked
        uint256 reward = (amount * duration) / (86400 * 10000);
        stakedBalance[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(msg.sender, reward);
        }
        emit TokensUnstaked(msg.sender, amount, reward);
    }
}
