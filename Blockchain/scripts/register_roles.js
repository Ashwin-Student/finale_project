import hre from "hardhat";

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const { ethers } = hre;
  const contract = await ethers.getContractAt("SeedTraceability", contractAddress);
  
  const accounts = await ethers.getSigners();
  
  // Account 0 is owner, let's make it a Manufacturer
  console.log("Adding Account 0 as Manufacturer:", accounts[0].address);
  let tx = await contract.addManufacturer(accounts[0].address);
  await tx.wait();
  
  // Account 1 as Distributor
  console.log("Adding Account 1 as Distributor:", accounts[1].address);
  tx = await contract.addDistributor(accounts[1].address);
  await tx.wait();
  
  // Account 2 as Retailer
  console.log("Adding Account 2 as Retailer:", accounts[2].address);
  tx = await contract.addRetailer(accounts[2].address);
  await tx.wait();
  
  console.log("All roles registered successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
