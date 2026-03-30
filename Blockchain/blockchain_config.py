from web3 import Web3
import json

# Connect to Ganache
GANACHE_URL = "http://127.0.0.1:8545"
web3 = Web3(Web3.HTTPProvider(GANACHE_URL))

try:
    if web3.is_connected():
        print("Connected to Blockchain")
    else:
        print("Blockchain connection failed")
except Exception as e:
    print("Blockchain connection error:", e)

# Your deployed contract address
contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

# Load ABI (paste your ABI JSON here or load from file)
abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": False,
      "inputs": [
        {
          "indexed": False,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": False,
          "internalType": "address",
          "name": "manufacturer",
          "type": "address"
        }
      ],
      "name": "BatchCreated",
      "type": "event"
    },
    {
      "anonymous": False,
      "inputs": [
        {
          "indexed": False,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": False,
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "DistributorDispatched",
      "type": "event"
    },
    {
      "anonymous": False,
      "inputs": [
        {
          "indexed": False,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": False,
          "internalType": "address",
          "name": "distributor",
          "type": "address"
        }
      ],
      "name": "DistributorReceived",
      "type": "event"
    },
    {
      "anonymous": False,
      "inputs": [
        {
          "indexed": False,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": False,
          "internalType": "address",
          "name": "retailer",
          "type": "address"
        }
      ],
      "name": "RetailerReceived",
      "type": "event"
    },
    {
      "anonymous": False,
      "inputs": [
        {
          "indexed": False,
          "internalType": "bytes32",
          "name": "batchId",
          "type": "bytes32"
        },
        {
          "indexed": False,
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
  ]  # <-- PASTE YOUR FULL ABI HERE

# Create contract instance
contract = web3.eth.contract(
    address=contract_address,
    abi=abi
)

# Default account (Ganache account 0)
try:
    web3.eth.default_account = web3.eth.accounts[0]
    print("DEFAULT ACCOUNT:", web3.eth.default_account)
except Exception as e:
    print("Failed to set default account:", e)