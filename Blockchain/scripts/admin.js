const hre = require("hardhat");

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const Contract = await hre.ethers.getContractFactory("SeedTraceability");
  const contract = Contract.attach(contractAddress);
  const tx = await contract.addManufacturer("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc");
  await tx.wait();
  console.log("Manufacturer successfully added!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
