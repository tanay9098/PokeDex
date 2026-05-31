import { ethers } from 'hardhat';

async function main() {
  console.log('Starting deployment...');

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

  // Save deployment addresses
  const deploymentAddresses = {
    pokemonNFT: pokemonNFTAddress,
    marketplace: marketplaceAddress,
    network: (await ethers.provider.getNetwork()).name,
    deployer: (await ethers.getSigners())[0].address,
  };

  console.log('\nDeployment Summary:');
  console.log(JSON.stringify(deploymentAddresses, null, 2));

  return deploymentAddresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });