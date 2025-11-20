const { ethers } = require('ethers');

// ERC-20 ABI cho symbol, decimals, name
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)'
];

async function testTokenFetch() {
  // Kết nối tới Sepolia
  const provider = new ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');

  // Các token addresses từ database
  const tokens = [
    { address: '0x29450e8180b90d66829303e98ab5e02125f3d6be', name: 'Token used in auction' },
    { address: '0xf43843516260b1b78bf77148f149cabd9240425a', name: 'Token 2' },
    { address: '0x1699cdd4a1a2d1180f5114deb4a874d88fefee41', name: 'Token 3' },
  ];

  console.log('\n=== TESTING TOKEN INFO FETCHING ===\n');

  for (const token of tokens) {
    console.log(`\nTesting: ${token.name}`);
    console.log(`Address: ${token.address}`);

    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);

      // Fetch symbol
      try {
        const symbol = await contract.symbol();
        console.log(`  Symbol: ${symbol}`);
      } catch (e) {
        console.log(`  Symbol: ERROR - ${e.message}`);
      }

      // Fetch decimals
      try {
        const decimals = await contract.decimals();
        console.log(`  Decimals: ${decimals}`);
      } catch (e) {
        console.log(`  Decimals: ERROR - ${e.message}`);
      }

      // Fetch name
      try {
        const name = await contract.name();
        console.log(`  Name: ${name}`);
      } catch (e) {
        console.log(`  Name: ERROR - ${e.message}`);
      }
    } catch (error) {
      console.log(`  FAILED: ${error.message}`);
    }
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testTokenFetch().catch(console.error);
