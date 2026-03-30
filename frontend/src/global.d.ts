declare module "*.json" {
  const value: any;
  export default value;
}

// src/global.d.ts
interface Window {
  ethereum?: any;
}