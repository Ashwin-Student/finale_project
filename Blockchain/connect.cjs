const { ethers } = require("ethers");

// 🔥 Your deployed contract address
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// 🔥 ABI (keep your full ABI here — I kept it same)
const abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "manufacturer",
          "type": "address"
        }
      ],
      "name": "BatchCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "DistributorDispatched",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "DistributorReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "name": "RetailerReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        }
      ],
      "name": "ReviewSubmitted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addr",
          "type": "address"
        }
      ],
      "name": "addDistributor",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addr",
          "type": "address"
        }
      ],
      "name": "addManufacturer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addr",
          "type": "address"
        }
      ],
      "name": "addRetailer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "batchStage",
      "outputs": [
        {
          "internalType": "enum SeedTraceability.Stage",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_seedName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_seedVariety",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_cropType",
          "type": "string"
        }
      ],
      "name": "createBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "_transportMode",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "_vehicle",
          "type": "string"
        }
      ],
      "name": "distributorDispatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "distributorDispatchData",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "dispatchDate",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "transportMode",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "vehicleNumber",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_warehouse",
          "type": "string"
        }
      ],
      "name": "distributorReceive",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "distributorReceiveData",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "receivedDate",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "warehouseLocation",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "distributors",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "farmerReview",
      "outputs": [
        {
          "internalType": "string",
          "name": "farmerName",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "rating",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "review",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        }
      ],
      "name": "getFullBatchHistory",
      "outputs": [
        {
          "components": [
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "seedName",
                  "type": "string"
                },
                {
                  "internalType": "string",
                  "name": "seedVariety",
                  "type": "string"
                },
                {
                  "internalType": "string",
                  "name": "cropType",
                  "type": "string"
                },
                {
                  "internalType": "uint256",
                  "name": "manufacturingDate",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "manufacturer",
                  "type": "address"
                }
              ],
              "internalType": "struct SeedTraceability.ManufacturerData",
              "name": "manufacturer",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "receivedDate",
                  "type": "uint256"
                },
                {
                  "internalType": "string",
                  "name": "warehouseLocation",
                  "type": "string"
                },
                {
                  "internalType": "address",
                  "name": "distributor",
                  "type": "address"
                }
              ],
              "internalType": "struct SeedTraceability.DistributorReceive",
              "name": "distributorReceive",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "dispatchDate",
                  "type": "uint256"
                },
                {
                  "internalType": "uint8",
                  "name": "transportMode",
                  "type": "uint8"
                },
                {
                  "internalType": "string",
                  "name": "vehicleNumber",
                  "type": "string"
                },
                {
                  "internalType": "address",
                  "name": "distributor",
                  "type": "address"
                }
              ],
              "internalType": "struct SeedTraceability.DistributorDispatch",
              "name": "distributorDispatch",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "receivedDate",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "sellingPrice",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "retailer",
                  "type": "address"
                }
              ],
              "internalType": "struct SeedTraceability.RetailerData",
              "name": "retailer",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "farmerName",
                  "type": "string"
                },
                {
                  "internalType": "uint8",
                  "name": "rating",
                  "type": "uint8"
                },
                {
                  "internalType": "string",
                  "name": "review",
                  "type": "string"
                },
                {
                  "internalType": "address",
                  "name": "farmer",
                  "type": "address"
                }
              ],
              "internalType": "struct SeedTraceability.FarmerReview",
              "name": "review",
              "type": "tuple"
            },
            {
              "internalType": "enum SeedTraceability.Stage",
              "name": "currentStage",
              "type": "uint8"
            }
          ],
          "internalType": "struct SeedTraceability.FullBatchHistory",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "manufacturerData",
      "outputs": [
        {
          "internalType": "string",
          "name": "seedName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "seedVariety",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "cropType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "manufacturingDate",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "manufacturer",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "manufacturers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "retailerData",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "receivedDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellingPrice",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        }
      ],
      "name": "retailerReceive",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "retailers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_batchId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_farmerName",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "_rating",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "_review",
          "type": "string"
        }
      ],
      "name": "submitReview",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

async function main() {

  // Connect to local blockchain
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Get signer (Account 0)
  const signer = await provider.getSigner();

  // Connect to contract
  const contract = new ethers.Contract(contractAddress, abi, signer);

  console.log("✅ Connected to contract");

  // 🔥 Add Manufacturer
  const tx1 = await contract.addManufacturer(await signer.getAddress());
  await tx1.wait();
  console.log("✅ Manufacturer added");

  // 🔥 Create Batch
  const batchId = ethers.encodeBytes32String("BATCH001");

  const tx2 = await contract.createBatch(
    batchId,
    "Wheat Seeds",
    "Premium Variety",
    "Wheat"
  );
  await tx2.wait();
  console.log("✅ Batch created");

  // 🔥 Add Distributor
  const txD = await contract.addDistributor(await signer.getAddress());
  await txD.wait();
  console.log("✅ Distributor added");

  // 🔥 Distributor Receive
  const tx3 = await contract.distributorReceive(
    batchId,
    "Nagpur Warehouse"
  );
  await tx3.wait();
  console.log("✅ Distributor received");

  // 🔥 Distributor Dispatch
  const tx4 = await contract.distributorDispatch(
    batchId,
    1,
    "MH31AB1234"
  );
  await tx4.wait();
  console.log("✅ Distributor dispatched");

  // 🔥 Add Retailer
  const txR = await contract.addRetailer(await signer.getAddress());
  await txR.wait();
  console.log("✅ Retailer added");

  // 🔥 Retailer Receive
  const tx5 = await contract.retailerReceive(
    batchId,
    500
  );
  await tx5.wait();
  console.log("✅ Retailer received");

  // 🔥 Submit Review
  const tx6 = await contract.submitReview(
    batchId,
    "Farmer Ashwin",
    5,
    "Good quality seeds"
  );
  await tx6.wait();
  console.log("✅ Review submitted");

  const stage = await contract.batchStage(batchId);
  console.log("📊 Current Stage:", stage);

  // 🔥 Get Full History (NOW it will work)
  const data = await contract.getFullBatchHistory(batchId);
  console.log("📦 Batch Data:", data);

}

main().catch(console.error);