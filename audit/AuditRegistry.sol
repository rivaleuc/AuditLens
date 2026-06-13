// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditRegistry {
    struct AuditRecord {
        bytes32 codeHash;
        bytes32 findingsHash;
        address auditor;
        uint256 timestamp;
    }

    mapping(bytes32 => AuditRecord) public records;
    event AuditRecorded(bytes32 indexed key, address indexed auditor);

    function recordAudit(bytes32 key, bytes32 codeHash, bytes32 findingsHash) external {
        records[key] = AuditRecord(codeHash, findingsHash, msg.sender, block.timestamp);
        emit AuditRecorded(key, msg.sender);
    }

    function getRecord(bytes32 key) external view returns (AuditRecord memory) {
        return records[key];
    }
}
