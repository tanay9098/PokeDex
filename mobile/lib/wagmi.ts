import { createAppKit, defaultWagmiConfig } from '@reown/appkit-wagmi-react-native';
import { polygon } from 'viem/chains';
import { QueryClient } from '@tanstack/react-query';

// Get a free Project ID at https://cloud.walletconnect.com
export const WALLETCONNECT_PROJECT_ID = process.env.EXPO_PUBLIC_WC_PROJECT_ID ?? 'YOUR_PROJECT_ID';

const metadata = {
  name: 'PokéDex NFT',
  description: 'Buy and trade Pokémon NFTs',
  url: 'https://pokedex-nft.app',
  icons: ['https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/1.png'],
  redirect: { native: 'pokedex://', universal: 'https://pokedex-nft.app' },
};

const chains = [polygon] as const;

export const wagmiConfig = defaultWagmiConfig({ chains, projectId: WALLETCONNECT_PROJECT_ID, metadata });

export const queryClient = new QueryClient();

createAppKit({
  projectId: WALLETCONNECT_PROJECT_ID,
  wagmiConfig,
  defaultChain: polygon,
  enableAnalytics: false,
});
