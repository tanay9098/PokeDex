import { createThirdwebClient } from "thirdweb";
import { polygon } from "thirdweb/chains";

export const client = createThirdwebClient({
  clientId: process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID ?? "",
});

export { polygon };
