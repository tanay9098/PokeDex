import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting deployment to Polygon Mumbai Testnet...');

  const network = await ethers.provider.getNetwork();
  console.log('Deploying to network:', network.name, 'Chain ID:', network.chainId);

  // Deploy PokemonNFT contract
  const PokemonNFT = await ethers.getContractFactory('PokemonNFT');
  const pokemonNFT = await PokemonNFT.deploy();
  await pokemonNFT.waitForDeployment();
  const pokemonNFTAddress = await pokemonNFT.getAddress();
  console.log('PokemonNFT deployed to:', pokemonNFTAddress);

  // Deploy PokemonMarketplace contract
  const PokemonMarketplace = await ethers.getContractFactory('PokemonMarketplace');
  const feeRecipient = (await ethers.getSigners())[0].address;
  const marketplace = await PokemonMarketplace.deploy(pokemonNFTAddress, feeRecipient);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log('PokemonMarketplace deployed to:', marketplaceAddress);

  // Save deployment addresses to file
  const deploymentAddresses = {
    pokemonNFT: pokemonNFTAddress,
    marketplace: marketplaceAddress,
    network: network.name,
    chainId: network.chainId,
    deployer: (await ethers.getSigners())[0].address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, '../deployment-addresses-testnet.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));

  console.log('\nDeployment Summary:');
  console.log(JSON.stringify(deploymentAddresses, null, 2));
  console.log('\nAddresses saved to:', deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });