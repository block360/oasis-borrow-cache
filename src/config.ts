import { config as mainConfig } from './config.mainnet';
import { config as kovanConfig } from './config.kovan';
import { config as localConfig } from './config.localnet';
import { config as goerliConfig } from './config.goerli';
import { MessageNames, MessageTypes, sendMessage } from './utils/awsQueue';

const config = (() => {
  switch (process.env.VL_CHAIN_NAME) {
    case 'mainnet':
      return 'mainnet';
    case 'localnet':
      return localConfig;
    case 'kovan':
      return kovanConfig;
    case 'goerli':
      return goerliConfig;
    default:
      throw new Error(
        `Please select network from (mainnet, goerli, kovan, localnet). Was ${process.env.VL_CHAIN_NAME}`,
      );
  }
})();

sendMessage(
  MessageNames.START,
  MessageTypes.ETL,
  'GSU-Protocol-cache',
  `Start-${Date.now().toString()}`,
  `Start-${Date.now().toString()}`,
  'Start-GSU-Protocol-Cache',
);
console.log(`Using ${process.env.VL_CHAIN_NAME} config.`);

export default config as typeof mainConfig;
