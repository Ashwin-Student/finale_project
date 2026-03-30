import { ethers } from "ethers";
import SeedTraceabilityABI from './abis/SeedTraceability.json';

// ✅ For MetaMask in browser
const provider = new ethers.BrowserProvider(window.ethereum);

// Get signer (your currently connected wallet)
const signer = await provider.getSigner();

// Replace with your deployed contract address
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Connect contract
export const contract = new ethers.Contract(contractAddress, SeedTraceabilityABI, signer);