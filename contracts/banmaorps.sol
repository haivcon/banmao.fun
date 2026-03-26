// SPDX-License-Identifier: MIT
// ca1 thêm forfeit

// 0x6372DBbe7ab8d756bC95b20B2B726E215EfC6876
// 0x2Ae44e728106a826616aA8CFec062F22bE255aCB
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BanmaoRPS is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Choice { None, Rock, Paper, Scissors }
    enum RoomState { WaitingOpponent, Committing, Revealing, Finished, Canceled }

    struct Room {
        address creator;
        address opponent;
        uint256 stake;
        bytes32 commitA;
        bytes32 commitB;
        Choice revealA;
        Choice revealB;
        uint64 commitDeadline;
        uint64 revealDeadline;
        RoomState state;
    }

    IERC20 public immutable token;
    address public immutable communityWallet;
    address public immutable deadWallet; // ví chết
    uint256 public nextRoomId = 1;
    uint256 public constant FEE_BP = 200;
    uint256 public constant BP_DENOM = 10000;

    mapping(uint256 => Room) public rooms;

    event RoomCreated(uint256 indexed roomId, address indexed creator, uint256 stake);
    event Joined(uint256 indexed roomId, address indexed opponent);
    event Committed(uint256 indexed roomId, address indexed player);
    event Revealed(uint256 indexed roomId, address indexed player, Choice choice);
    event Resolved(uint256 indexed roomId, address winner, uint256 payout, uint256 fee);
    event Refunded(uint256 indexed roomId);
    event Canceled(uint256 indexed roomId);
    event Forfeited(uint256 indexed roomId, address indexed loser, address indexed winner, uint256 winnerPayout);

    constructor(address _token, address _communityWallet, address _deadWallet) {
        token = IERC20(_token);
        communityWallet = _communityWallet;
        deadWallet = _deadWallet;
    }

    function getHash(Choice c, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(c, salt));
    }

    function createRoom(uint256 stake, uint64 commitDurationSecs) external nonReentrant returns (uint256 roomId) {
        require(stake > 0, "stake=0");
        roomId = nextRoomId++;
        Room storage r = rooms[roomId];
        r.creator = msg.sender;
        r.stake = stake;
        r.commitDeadline = uint64(block.timestamp) + commitDurationSecs;
        r.state = RoomState.WaitingOpponent;
        token.safeTransferFrom(msg.sender, address(this), stake);
        emit RoomCreated(roomId, msg.sender, stake);
    }

    function joinRoom(uint256 roomId) external nonReentrant {
        Room storage r = rooms[roomId];
        require(r.state == RoomState.WaitingOpponent, "bad state");
        require(msg.sender != r.creator, "same player");
        require(block.timestamp <= r.commitDeadline, "expired");
        r.opponent = msg.sender;
        r.state = RoomState.Committing;
        token.safeTransferFrom(msg.sender, address(this), r.stake);
        emit Joined(roomId, msg.sender);
    }

    function commit(uint256 roomId, bytes32 commitHash) external nonReentrant {
        Room storage r = rooms[roomId];
        require(r.state == RoomState.Committing, "bad state");
        require(block.timestamp <= r.commitDeadline, "expired");
        if (msg.sender == r.creator) {
            require(r.commitA == 0, "already committed");
            r.commitA = commitHash;
        } else if (msg.sender == r.opponent) {
            require(r.commitB == 0, "already committed");
            r.commitB = commitHash;
        } else revert("not player");
        emit Committed(roomId, msg.sender);
        if (r.commitA != 0 && r.commitB != 0) {
            r.state = RoomState.Revealing;
            r.revealDeadline = uint64(block.timestamp) + 15 minutes;
        }
    }

    function reveal(uint256 roomId, Choice c, bytes32 salt) external nonReentrant {
        Room storage r = rooms[roomId];
        require(r.state == RoomState.Revealing, "bad state");
        require(block.timestamp <= r.revealDeadline, "too late");
        require(c != Choice.None, "invalid");
        bytes32 h = keccak256(abi.encodePacked(c, salt));
        if (msg.sender == r.creator) {
            require(r.commitA == h, "mismatch");
            r.revealA = c;
        } else if (msg.sender == r.opponent) {
            require(r.commitB == h, "mismatch");
            r.revealB = c;
        } else revert("not player");
        emit Revealed(roomId, msg.sender, c);
        if (r.revealA != Choice.None && r.revealB != Choice.None) {
            _settle(roomId);
        }
    }

    // 💥 HÀM MỚI: FORFEIT
    function forfeit(uint256 roomId) external nonReentrant {
        Room storage r = rooms[roomId];
        require(
            r.state == RoomState.Committing || r.state == RoomState.Revealing,
            "cannot forfeit now"
        );
        require(msg.sender == r.creator || msg.sender == r.opponent, "not player");
        require(r.state != RoomState.Finished, "game ended");

        address loser = msg.sender;
        address winner = (loser == r.creator) ? r.opponent : r.creator;
        require(winner != address(0), "no opponent yet");

        r.state = RoomState.Finished;

        uint256 pot = r.stake * 2;
        uint256 winnerPayout = (pot * 90) / 100;
        uint256 communityFee = (pot * 5) / 100;
        uint256 burnFee = pot - winnerPayout - communityFee;

        token.safeTransfer(winner, winnerPayout);
        token.safeTransfer(communityWallet, communityFee);
        token.safeTransfer(deadWallet, burnFee);

        emit Forfeited(roomId, loser, winner, winnerPayout);
    }

    // Các hàm claimTimeout, _settle, _refund, _payoutWinner giữ nguyên như cũ
    function claimTimeout(uint256 roomId) external nonReentrant {
        Room storage r = rooms[roomId];
        require(r.state != RoomState.Finished && r.state != RoomState.Canceled, "Game ended");
        require(r.creator == msg.sender || r.opponent == msg.sender, "not player");
        
        if (r.state == RoomState.WaitingOpponent) {
            require(block.timestamp > r.commitDeadline, "Join/Commit period is not over");
            require(msg.sender == r.creator, "Only creator can cancel");

            r.state = RoomState.Canceled;
            uint256 stake = r.stake;
            uint256 fee = (stake * FEE_BP) / BP_DENOM;
            uint256 refundAmount = stake - fee;
            token.safeTransfer(communityWallet, fee);
            token.safeTransfer(r.creator, refundAmount);
            emit Canceled(roomId);
            emit Refunded(roomId);
            return;
        }

        if (r.state == RoomState.Committing) {
            require(block.timestamp > r.commitDeadline, "Commit period is not over");
            bool creatorCommitted = r.commitA != 0;
            bool opponentCommitted = r.commitB != 0;

            if (creatorCommitted && !opponentCommitted) {
                _payoutWinner(roomId, r.creator);
                return;
            } else if (opponentCommitted && !creatorCommitted) {
                _payoutWinner(roomId, r.opponent);
                return;
            } else if (!creatorCommitted && !opponentCommitted) {
                _refund(roomId);
                return;
            } else {
                revert("Both players committed. Waiting for Reveal.");
            }
        }

        require(r.state == RoomState.Revealing, "Invalid state for Reveal Timeout");
        require(block.timestamp > r.revealDeadline, "Reveal period is not over");

        address winner;
        if (r.revealA != Choice.None && r.revealB == Choice.None) {
            winner = r.creator;
        } else if (r.revealB != Choice.None && r.revealA == Choice.None) {
            winner = r.opponent;
        } else {
            r.state = RoomState.Canceled;
            uint256 stake = r.stake;
            uint256 fee = (stake * FEE_BP) / BP_DENOM;
            uint256 refundAmount = stake - fee;
            token.safeTransfer(communityWallet, fee * 2);
            token.safeTransfer(r.creator, refundAmount);
            token.safeTransfer(r.opponent, refundAmount);
            emit Refunded(roomId);
            emit Canceled(roomId);
            return;
        }
        _payoutWinner(roomId, winner);
    }

    function _settle(uint256 roomId) internal {
        Room storage r = rooms[roomId];
        if (r.revealA == r.revealB) {
            r.state = RoomState.Canceled;
            uint256 stake = r.stake;
            uint256 fee = (stake * FEE_BP) / BP_DENOM;
            uint256 refundAmount = stake - fee;
            token.safeTransfer(communityWallet, fee * 2);
            token.safeTransfer(r.creator, refundAmount);
            token.safeTransfer(r.opponent, refundAmount);
            emit Refunded(roomId);
            emit Canceled(roomId);
            return;
        }
        address winner = _winner(r.revealA, r.revealB) == 1 ? r.creator : r.opponent;
        _payoutWinner(roomId, winner);
    }

    function _winner(Choice a, Choice b) internal pure returns (uint8) {
        if (
            (a == Choice.Rock && b == Choice.Scissors) ||
            (a == Choice.Scissors && b == Choice.Paper) ||
            (a == Choice.Paper && b == Choice.Rock)
        ) return 1;
        return 2;
    }

    function _refund(uint256 roomId) internal {
        Room storage r = rooms[roomId];
        r.state = RoomState.Canceled;
        token.safeTransfer(r.creator, r.stake);
        if (r.opponent != address(0)) token.safeTransfer(r.opponent, r.stake);
        emit Refunded(roomId);
        emit Canceled(roomId);
    }

    function _payoutWinner(uint256 roomId, address winner) internal {
        Room storage r = rooms[roomId];
        r.state = RoomState.Finished;
        uint256 pot = r.stake * 2;
        uint256 fee = (pot * FEE_BP) / BP_DENOM;
        uint256 payout = pot - fee;
        token.safeTransfer(communityWallet, fee);
        token.safeTransfer(winner, payout);
        emit Resolved(roomId, winner, payout, fee);
    }
}
