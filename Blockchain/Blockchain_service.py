from .blockchain_config import contract, web3

# Create Batch
def create_batch(batch_id, seed_name, variety, crop_type):
    batch_bytes = web3.keccak(text=batch_id)  # FIXED

    tx = contract.functions.createBatch(
        batch_bytes,
        seed_name,
        variety,
        crop_type
    ).transact()

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()

# Add Manufacturer
# Add Manufacturer (FINAL CORRECT)
def add_manufacturer(address):
    tx = contract.functions.addManufacturer(address).transact()
    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()

# Get Batch History
def get_batch(batch_id):
    batch_bytes = web3.keccak(text=batch_id)
    data = contract.functions.getFullBatchHistory(batch_bytes).call()
    return data

#add distributor
def add_distributor(address):
    tx = contract.functions.addDistributor(address).transact()
    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()

def add_retailer(address):
    tx = contract.functions.addRetailer(address).transact()
    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


def distributor_receive(batch_id, warehouse):
    batch_bytes = web3.keccak(text=batch_id)

    tx = contract.functions.distributorReceive(
        batch_bytes,
        warehouse
    ).transact()

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


# Distributor Dispatch
def distributor_dispatch(batch_id, mode, vehicle):
    batch_bytes = web3.keccak(text=batch_id)

    tx = contract.functions.distributorDispatch(
        batch_bytes,
        mode,
        vehicle
    ).transact()

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


# Retailer Receive
def retailer_receive(batch_id, price):
    batch_bytes = web3.keccak(text=batch_id)

    tx = contract.functions.retailerReceive(
        batch_bytes,
        price
    ).transact()

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


# Submit Review
def submit_review(batch_id, name, rating, review):
    batch_bytes = web3.keccak(text=batch_id)

    tx = contract.functions.submitReview(
        batch_bytes,
        name,
        rating,
        review
    ).transact()

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()