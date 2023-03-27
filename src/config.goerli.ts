import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import {
  managerGiveTransformer,
  openCdpTransformer,
} from './borrow/transformers/cdpManagerTransformer';

import {
  vatCombineTransformer,
  vatMoveEventsTransformer,
  vatRawMoveTransformer,
  vatTransformer,
} from './borrow/transformers/vatTransformer';
import { auctionTransformer, catTransformer } from './borrow/transformers/catTransformer';
import {
  AbiInfo,
  makeRawEventExtractorBasedOnTopicIgnoreConflicts,
  makeRawEventBasedOnDSNoteTopic,
} from './borrow/customExtractors';
import { flipNoteTransformer, flipTransformer } from './borrow/transformers/flipperTransformer';
import { getIlkInfo } from './borrow/dependencies/getIlkInfo';
import { getUrnForCdp } from './borrow/dependencies/getUrnForCdp';
import {
  auctionLiq2Transformer,
  dogTransformer,
  getDogTransformerName,
} from './borrow/transformers/dogTransformer';
import { clipperTransformer } from './borrow/transformers/clipperTransformer';

import { getOraclesAddresses } from './utils/addresses';
import {
  getOracleTransformerName,
  oraclesTransformer,
} from './borrow/transformers/oraclesTransformer';
import {
  eventEnhancerGasPrice,
  eventEnhancerTransformer,
  eventEnhancerTransformerEthPrice,
} from './borrow/transformers/eventEnhancer';
import { partialABI } from './utils';
import { multiplyTransformer } from './borrow/transformers/multiply';
import { getIlkForCdp } from './borrow/dependencies/getIlkForCdp';
import { getLiquidationRatio } from './borrow/dependencies/getLiquidationRatio';
import { exchangeTransformer } from './borrow/transformers/exchange';
import { multiplyHistoryTransformer } from './borrow/transformers/multiplyHistoryTransformer';

const AutomationBotABI = require('../abis/automation-bot.json');

const goerliAddresses = require('./addresses/goerli.json');

const PLACEHOLDER_BLOCK = Number(process.env.GENESIS);

const GOERLI_STARTING_BLOCKS = {
  GENESIS: Number(process.env.GENESIS) || 7886137,
  CDP_MANAGER: PLACEHOLDER_BLOCK,
  MCD_CAT: PLACEHOLDER_BLOCK,
  MCD_DOG: PLACEHOLDER_BLOCK,
};

const OASIS_CONTRACTS = {
  MULTIPLY_V1: goerliAddresses.MULTIPLY_PROXY_ACTIONS,
  MULTIPLY_V2: goerliAddresses.MULTIPLY_PROXY_ACTIONS,
  EXCHANGE_V1: goerliAddresses.EXCHANGE,
  EXCHANGE_V2: goerliAddresses.EXCHANGE,
};

const vat = {
  address: goerliAddresses.MCD_VAT,
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
};

const cdpManagers = [
  {
    address: goerliAddresses.CDP_MANAGER,
    startingBlock: GOERLI_STARTING_BLOCKS.CDP_MANAGER,
  },
];

const cats = [
  {
    address: goerliAddresses.MCD_CAT,
    startingBlock: GOERLI_STARTING_BLOCKS.MCD_CAT,
  },
];

const dogs = [
  {
    address: goerliAddresses.MCD_DOG,
    startingBlock: GOERLI_STARTING_BLOCKS.MCD_DOG,
  },
];

const clippers = [
  {
    name: 'clipper',
    abi: require('../abis/clipper.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const oracle = [
  {
    name: 'oracle',
    abi: require('../abis/oracle.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
  {
    name: 'lp-oracle',
    abi: require('../abis/lp-oracle.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const flipperNotes: AbiInfo[] = [
  {
    name: 'flipper',
    functionNames: [
      'tend(uint256,uint256,uint256)',
      'dent(uint256,uint256,uint256)',
      'deal(uint256)',
    ],
    abi: require('../abis/flipper.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];


const multiply = [
  {
    address: OASIS_CONTRACTS.MULTIPLY_V1,
    startingBlock: PLACEHOLDER_BLOCK,
  },
  // {
  //   address: OASIS_CONTRACTS.MULTIPLY_V2,
  //   startingBlock: 7590186,
  // },
];

const exchange = [
  {
    address: OASIS_CONTRACTS.EXCHANGE_V1,
    startingBlock: 7591385,
  },
  // {
  //   address: OASIS_CONTRACTS.EXCHANGE_V2,
  //   startingBlock: 7590186,
  // },
];

const addresses = {
  ...goerliAddresses,
  MIGRATION: '',
  ILK_REGISTRY: goerliAddresses.ILK_REGISTRY,
};

const oracles = getOraclesAddresses(goerliAddresses).map(description => ({
  ...description,
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
}));

const oraclesTransformers = oracles.map(getOracleTransformerName);

export const config: UserProvidedSpockConfig = {
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors([vat])
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers, { getUrnForCdp }),
    ...managerGiveTransformer(cdpManagers),
    vatTransformer(vat),
    vatCombineTransformer(vat),
    vatMoveEventsTransformer(vat),
    vatRawMoveTransformer(vat),
    multiplyHistoryTransformer(vat.address, {
      multiplyProxyActionsAddress: [...multiply],
      exchangeAddress: [...exchange],
    }),
    eventEnhancerGasPrice(vat, cdpManagers)
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  api: {
    whitelisting: {
      enabled: false,
      whitelistedQueriesDir: './queries',
    },
  },
  addresses,
  onStart: async services => {
    // await initializeCommandAliases(services, commandMapping);
  },
};
