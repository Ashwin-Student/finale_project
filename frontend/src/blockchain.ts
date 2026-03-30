import { ethers } from "ethers";
import SeedTraceabilityABI from "./abis/SeedTraceability.json";

const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const HARDHAT_CHAIN_ID = '0x7a69'; // 31337

export const getContract = async () => {
  if (typeof window.ethereum === 'undefined') {
    alert("Please install MetaMask");
    return null;
  }

  try {
    // Attempt to switch to Hardhat network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: HARDHAT_CHAIN_ID,
            chainName: 'Hardhat Local',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
          }],
        });
      }
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const code = await provider.getCode(contractAddress);
    if (!code || code === "0x") {
      alert("SeedTraceability contract is not deployed on the selected network.");
      return null;
    }

    return new ethers.Contract(contractAddress, SeedTraceabilityABI, signer);
  } catch (err) {
    console.error("Metamask Connection Error:", err);
    return null;
  }
};
