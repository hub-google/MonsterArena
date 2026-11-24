// Stable public API: pages use this single entry, while implementations live by domain.
export {GAME_RULES_V2} from '../services/backend.js';
import {transactionApi} from '../services/transactions.js';
import {accountApi} from '../services/account.js';
import {unitApi} from '../services/units.js';
import {economyApi} from '../services/economy.js';
import {battleApi} from '../services/battle.js';
import {guildApi} from '../services/guild.js';
import {socialApi} from '../services/social.js';

export const api = {
  ...transactionApi,
  ...accountApi,
  ...unitApi,
  ...economyApi,
  ...battleApi,
  ...guildApi,
  ...socialApi,
};
