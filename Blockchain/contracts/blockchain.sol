// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SeedTraceability {

    /* ---------- ROLES ---------- */

    address public owner;

    mapping(address => bool) public manufacturers;
    mapping(address => bool) public distributors;
    mapping(address => bool) public retailers;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyManufacturer() {
        require(manufacturers[msg.sender], "Not manufacturer");
        _;
    }

    modifier onlyDistributor() {
        require(distributors[msg.sender], "Not distributor");
        _;
    }

    modifier onlyRetailer() {
        require(retailers[msg.sender], "Not retailer");
        _;
    }

    /* ---------- STAGES ---------- */

    enum Stage {
        None,
        Manufactured,
        AtDistributor,
        Dispatched,
        AtRetailer,
        Reviewed
    }

    /* ---------- STRUCTS ---------- */

    struct ManufacturerData {
        string seedName;
        string seedVariety;
        string cropType;
        uint256 manufacturingDate;
        address manufacturer;
    }

    struct DistributorReceive {
        uint256 receivedDate;
        string warehouseLocation;
        address distributor;
    }

    struct DistributorDispatch {
        uint256 dispatchDate;
        uint8 transportMode;
        string vehicleNumber;
        address distributor;
    }

    struct RetailerData {
        uint256 receivedDate;
        uint256 sellingPrice;
        address retailer;
    }

    struct FarmerReview {
        string farmerName;
        uint8 rating;
        string review;
        address farmer;
    }

    struct FullBatchHistory {
        ManufacturerData manufacturer;
        DistributorReceive distributorReceive;
        DistributorDispatch distributorDispatch;
        RetailerData retailer;
        FarmerReview review;
        Stage currentStage;
    }

    /* ---------- STORAGE ---------- */

    mapping(bytes32 => ManufacturerData) public manufacturerData;
    mapping(bytes32 => DistributorReceive) public distributorReceiveData;
    mapping(bytes32 => DistributorDispatch) public distributorDispatchData;
    mapping(bytes32 => RetailerData) public retailerData;
    mapping(bytes32 => FarmerReview) public farmerReview;

    mapping(bytes32 => Stage) public batchStage;

    /* ---------- EVENTS ---------- */

    event BatchCreated(bytes32 batchId, address manufacturer);
    event DistributorReceived(bytes32 batchId, address distributor);
    event DistributorDispatched(bytes32 batchId, address distributor);
    event RetailerReceived(bytes32 batchId, address retailer);
    event ReviewSubmitted(bytes32 batchId, address farmer);

    /* ---------- ROLE MANAGEMENT ---------- */

    function addManufacturer(address _addr) public onlyOwner {
        manufacturers[_addr] = true;
    }

    function addDistributor(address _addr) public onlyOwner {
        distributors[_addr] = true;
    }

    function addRetailer(address _addr) public onlyOwner {
        retailers[_addr] = true;
    }

    /* ---------- MANUFACTURER ---------- */

    function createBatch(
        bytes32 _batchId,
        string memory _seedName,
        string memory _seedVariety,
        string memory _cropType
    ) public onlyManufacturer {

        require(batchStage[_batchId] == Stage.None, "Batch exists");

        manufacturerData[_batchId] = ManufacturerData(
            _seedName,
            _seedVariety,
            _cropType,
            block.timestamp,
            msg.sender
        );

        batchStage[_batchId] = Stage.Manufactured;

        emit BatchCreated(_batchId, msg.sender);
    }

    /* ---------- DISTRIBUTOR RECEIVE ---------- */

    function distributorReceive(
        bytes32 _batchId,
        string memory _warehouse
    ) public onlyDistributor {

        require(batchStage[_batchId] == Stage.Manufactured, "Invalid stage");

        distributorReceiveData[_batchId] = DistributorReceive(
            block.timestamp,
            _warehouse,
            msg.sender
        );

        batchStage[_batchId] = Stage.AtDistributor;

        emit DistributorReceived(_batchId, msg.sender);
    }

    /* ---------- DISTRIBUTOR DISPATCH ---------- */

    function distributorDispatch(
        bytes32 _batchId,
        uint8 _transportMode,
        string memory _vehicle
    ) public onlyDistributor {

        require(batchStage[_batchId] == Stage.AtDistributor, "Not received");

        distributorDispatchData[_batchId] = DistributorDispatch(
            block.timestamp,
            _transportMode,
            _vehicle,
            msg.sender
        );

        batchStage[_batchId] = Stage.Dispatched;

        emit DistributorDispatched(_batchId, msg.sender);
    }

    /* ---------- RETAILER ---------- */

    function retailerReceive(
        bytes32 _batchId,
        uint256 _price
    ) public onlyRetailer {

        require(batchStage[_batchId] == Stage.Dispatched, "Not dispatched");

        retailerData[_batchId] = RetailerData(
            block.timestamp,
            _price,
            msg.sender
        );

        batchStage[_batchId] = Stage.AtRetailer;

        emit RetailerReceived(_batchId, msg.sender);
    }

    /* ---------- FARMER REVIEW ---------- */

    function submitReview(
        bytes32 _batchId,
        string memory _farmerName,
        uint8 _rating,
        string memory _review
    ) public {

        require(batchStage[_batchId] == Stage.AtRetailer, "Not available");
        require(_rating >= 1 && _rating <= 5, "Rating 1-5");

        farmerReview[_batchId] = FarmerReview(
            _farmerName,
            _rating,
            _review,
            msg.sender
        );

        batchStage[_batchId] = Stage.Reviewed;

        emit ReviewSubmitted(_batchId, msg.sender);
    }

    /* ---------- GET FULL HISTORY ---------- */

    function getFullBatchHistory(bytes32 _batchId)
        public
        view
        returns (FullBatchHistory memory)
    {
        return FullBatchHistory(
            manufacturerData[_batchId],
            distributorReceiveData[_batchId],
            distributorDispatchData[_batchId],
            retailerData[_batchId],
            farmerReview[_batchId],
            batchStage[_batchId]
        );
    }
}
