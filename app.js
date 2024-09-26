const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const ethers = require('ethers');
const fs = require('fs');
require("dotenv").config();

// Environment variables
const YANG_TELEGRAM_CHAT_ID = process.env.YANG_TELEGRAM_CHAT_ID;
const YANG_TELEGRAM_BOT_TOKEN = process.env.YANG_TELEGRAM_BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINGECKO_API = process.env.COINGECKO_API;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const WSS_ENDPOINT = process.env.WSS_ENDPOINT;
const YANG_CONTRACT_ADDRESS = process.env.YANG_CONTRACT_ADDRESS || '0x384c9c33737121c4499c85d815ea57d1291875ab';
const YIN_CONTRACT_ADDRESS = process.env.YIN_CONTRACT_ADDRESS || '0xeCb36fF12cbe4710E9Be2411de46E6C180a4807f';
const YIN_POOL_ADDRESS = process.env.YIN_POOL_ADDRESS || '0x90fbb03389061020eec7ce9a7435966363410b87';
const FLUX_API_ENDPOINT = process.env.FLUX_API_ENDPOINT || 'https://voidapi.onrender.com/api/yang-data';
let cachedYangPrice = null;
let lastYangPriceFetchTime = 0;
const YANG_PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
// Constants
const YANG_TOKEN_DECIMALS = 8;
const YIN_TOKEN_DECIMALS = 8;
const YANG_INITIAL_SUPPLY = 2500000;
const YANG_BURN_ANIMATION = "https://fluxonbase.com/burn.jpg";

// Initialize Telegram bot
const yangBot = new TelegramBot(YANG_TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize providers and contracts
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "deployer", "type": "address"},
      {"internalType": "uint256", "name": "supply", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "spender", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "value", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "uint8", "name": "v", "type": "uint8"},
      {"internalType": "bytes32", "name": "r", "type": "bytes32"},
      {"internalType": "bytes32", "name": "s", "type": "bytes32"}
    ],
    "name": "permit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const UNISWAP_V3_POOL_ABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
];

const YANG_ABI = [
  'function doBurn() nonpayable returns (bool)',
  'function getCurrentPrice() view returns (uint256)',
];

// Initialize Contracts
const yangContract = new ethers.Contract(YANG_CONTRACT_ADDRESS, YANG_ABI, wallet);
const yinToken = new ethers.Contract(YIN_CONTRACT_ADDRESS, ERC20_ABI, provider);
const yangToken = new ethers.Contract(YANG_CONTRACT_ADDRESS, ERC20_ABI, provider);

// State Variables
let yangTotalBurnedAmount = 0;
let currentYinUsdPrice = null;
const yangMessageQueue = [];
let isYangSendingMessage = false;
const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();

// Initialize a global WebSocket provider variable to ensure only one instance exists
let wsProvider = null;

// Flag to prevent multiple event listener attachments
let listenersAttached = false;

// Utility Functions
function loadProcessedTransactions() {
  try {
    if (fs.existsSync(processedTransactionsFilePath)) {
      const data = fs.readFileSync(processedTransactionsFilePath, "utf-8");
      if (data.trim()) {
        processedTransactions = new Set(JSON.parse(data));
        console.log(`Loaded ${processedTransactions.size} processed transactions.`);
      }
    }
  } catch (error) {
    console.error("Error loading processed transactions:", error);
  }
}

function saveProcessedTransactions() {
  try {
    // Create a backup
    if (fs.existsSync(processedTransactionsFilePath)) {
      fs.copyFileSync(processedTransactionsFilePath, `${processedTransactionsFilePath}.bak`);
    }

    // Write the new data
    const data = JSON.stringify(Array.from(processedTransactions));
    fs.writeFileSync(processedTransactionsFilePath, data, "utf-8");
    console.log(`Saved ${processedTransactions.size} processed transactions.`);
  } catch (error) {
    console.error("Error saving processed transactions:", error);
    // Optionally, restore from backup
    if (fs.existsSync(`${processedTransactionsFilePath}.bak`)) {
      fs.copyFileSync(`${processedTransactionsFilePath}.bak`, processedTransactionsFilePath);
      console.log("Restored processed transactions from backup.");
    }
  }
}

const MAX_PROCESSED_TRANSACTIONS = 1000; // Adjust based on expected transaction volume
function markTransactionAsProcessed(txHash) {
  if (processedTransactions.size >= MAX_PROCESSED_TRANSACTIONS) {
 const firstTx = processedTransactions.values().next().value;
    processedTransactions.delete(firstTx);
    console.log(`Removed oldest transaction: ${firstTx}`);
  }

  processedTransactions.add(txHash);
  saveProcessedTransactions();
}

function resetProcessedTransactions() {
  processedTransactions.clear();
  try {
    fs.writeFileSync(processedTransactionsFilePath, JSON.stringify([]), "utf-8");
    console.log(`[${new Date().toISOString()}] Reset processed transactions.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error resetting processed transactions:`, error);
  }
}

async function getOptimizedGasPrice() {
  try {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(110).div(100); // 110% of current gas price
  } catch (error) {
    console.error('Error fetching gas price:', error);
    return ethers.utils.parseUnits('0.1', 'gwei');
  }
}

function getFluxRank(yangBalance) {
  const FLUX_RANKS = {
    "FLUX Eternal": 200000,
    "FLUX Sovereign": 100000,
    "FLUX Overseer": 90000,
    "FLUX Ascendant": 85000,
    "FLUX Transcendent": 80000,
    "FLUX Oracle": 75000,
    "FLUX Sage": 70000,
    "FLUX Luminary": 65000,
    "FLUX Visionary": 60000,
    "FLUX Mastermind": 55000,
    "FLUX Architect": 50000,
    "FLUX Innovator": 45000,
    "FLUX Alchemist": 40000,
    "FLUX Transmuter": 35000,
    "FLUX Channeler": 30000,
    "FLUX Conductor": 27500,
    "FLUX Amplifier": 25000,
    "FLUX Attunement": 22500,
    "FLUX Resonator": 20000,
    "FLUX Modulator": 17500,
    "FLUX Regulator": 15000,
    "FLUX Calibrator": 12500,
    "FLUX Equalizer": 10000,
    "FLUX Justiciar": 7500,
    "FLUX Arbiter": 6666,
    "FLUX Sentinel": 5000,
    "FLUX Warden": 3333,
    "FLUX Guardian": 2500,
    "FLUX Keeper": 2000,
    "FLUX Curator": 1750,
    "FLUX Mediator": 1500,
    "FLUX Synchronizer": 1250,
    "FLUX Balancer": 1000,
    "FLUX Harmonizer": 750,
    "FLUX Cultivator": 666,
    "FLUX Seeker": 500,
    "FLUX Disciple": 400,
    "FLUX Acolyte": 300,
    "FLUX Adept": 250,
    "FLUX Apprentice": 200,
    "FLUX Novice": 150,
    "FLUX Initiate": 100
  };

  let fluxRank = "FLUX Initiate";
  for (const [rank, threshold] of Object.entries(FLUX_RANKS)) {
    if (yangBalance >= threshold) {
      fluxRank = rank;
      break;
    }
  }

  return fluxRank;
}

function getFluxRankImageUrl(fluxRank) {
  const rankToImageUrlMap = {
    "FLUX Initiate": "https://fluxonbase.com/Initiate.png",
    "FLUX Novice": "https://fluxonbase.com/Novice.png",
    "FLUX Apprentice": "https://fluxonbase.com/Apprentice.png",
    "FLUX Adept": "https://fluxonbase.com/Adept.png",
    "FLUX Acolyte": "https://fluxonbase.com/Acolyte.png",
    "FLUX Disciple": "https://fluxonbase.com/Disciple.png",
    "FLUX Seeker": "https://fluxonbase.com/Seeker.png",
    "FLUX Cultivator": "https://fluxonbase.com/Cultivator.png",
    "FLUX Harmonizer": "https://fluxonbase.com/Harmonizer.png",
    "FLUX Balancer": "https://fluxonbase.com/Balancer.png",
    "FLUX Synchronizer": "https://fluxonbase.com/Synchronizer.png",
    "FLUX Mediator": "https://fluxonbase.com/Mediator.png",
    "FLUX Curator": "https://fluxonbase.com/Curator.png",
    "FLUX Keeper": "https://fluxonbase.com/Keeper.png",
    "FLUX Guardian": "https://fluxonbase.com/Guardian.png",
    "FLUX Warden": "https://fluxonbase.com/Warden.png",
    "FLUX Sentinel": "https://fluxonbase.com/Sentinel.png",
    "FLUX Arbiter": "https://fluxonbase.com/Arbiter.png",
    "FLUX Justiciar": "https://fluxonbase.com/Justiciar.png",
    "FLUX Equalizer": "https://fluxonbase.com/Equalizer.png",
    "FLUX Calibrator": "https://fluxonbase.com/Calibrator.png",
    "FLUX Regulator": "https://fluxonbase.com/Regulator.png",
    "FLUX Modulator": "https://fluxonbase.com/Modulator.png",
    "FLUX Resonator": "https://fluxonbase.com/Resonator.png",
    "FLUX Attunement": "https://fluxonbase.com/Attunement.png",
    "FLUX Amplifier": "https://fluxonbase.com/Amplifier.png",
    "FLUX Conductor": "https://fluxonbase.com/Conductor.png",
    "FLUX Channeler": "https://fluxonbase.com/Channeler.png",
    "FLUX Transmuter": "https://fluxonbase.com/Transmuter.png",
    "FLUX Alchemist": "https://fluxonbase.com/Alchemist.png",
    "FLUX Innovator": "https://fluxonbase.com/Innovator.png",
    "FLUX Architect": "https://fluxonbase.com/Architect.png",
    "FLUX Mastermind": "https://fluxonbase.com/Mastermind.png",
    "FLUX Visionary": "https://fluxonbase.com/Visionary.png",
    "FLUX Luminary": "https://fluxonbase.com/Luminary.png",
    "FLUX Sage": "https://fluxonbase.com/Sage.png",
    "FLUX Oracle": "https://fluxonbase.com/Oracle.png",
    "FLUX Transcendent": "https://fluxonbase.com/Transcendent.png",
    "FLUX Ascendant": "https://fluxonbase.com/Ascendant.png",
    "FLUX Overseer": "https://fluxonbase.com/Overseer.png",
    "FLUX Sovereign": "https://fluxonbase.com/Sovereign.png",
    "FLUX Eternal": "https://fluxonbase.com/Eternal.png"
  };

  return rankToImageUrlMap[fluxRank] || "https://fluxonbase.com/Initiate.png";
}

// Message Queue Functions
function addToYangMessageQueue(message) {
  yangMessageQueue.push(message);
}

function addToYangBurnQueue(photo, options) {
  yangMessageQueue.push({ photo, options });
  sendYangBurnFromQueue();
}
async function sendYangMessageFromQueue() {
  if (yangMessageQueue.length > 0 && !isYangSendingMessage) {
    isYangSendingMessage = true;
    const message = yangMessageQueue.shift();
    try {
      await yangBot.sendPhoto(YANG_TELEGRAM_CHAT_ID, message.photo, message.options);
      console.log(`[${new Date().toISOString()}] FLUX photo message sent successfully.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending FLUX message:`, error);
      // Optionally, you might want to re-queue the message or handle the error differently
    } finally {
      setTimeout(() => {
        isYangSendingMessage = false;
        sendYangMessageFromQueue(); // Process next message in queue, if any
      }, 2000);
    }
  }
}

async function sendYangBurnFromQueue() {
  if (yangMessageQueue.length > 0 && !isYangSendingMessage) {
    isYangSendingMessage = true;
    const message = yangMessageQueue.shift();
    try {
      message.options.disable_notification = true;
      const sentMessage = await yangBot.sendPhoto(YANG_TELEGRAM_CHAT_ID, message.photo, message.options);
      await yangBot.pinChatMessage(YANG_TELEGRAM_CHAT_ID, sentMessage.message_id, { disable_notification: true });
      console.log(`[${new Date().toISOString()}] YANG burn message sent and pinned successfully.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending or pinning YANG message:`, error);
    }
    setTimeout(() => {
      isYangSendingMessage = false;
      sendYangBurnFromQueue();
    }, 2000);
  }
}

// Flux-Specific Functions
async function getYinPrice() {
  try {
    const response = await axios.get(
      `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/base/token_price/0xeCb36fF12cbe4710E9Be2411de46E6C180a4807f?x_cg_pro_api_key=${COINGECKO_API}`
    );
    const tokenAddress = '0xeCb36fF12cbe4710E9Be2411de46E6C180a4807f'.toLowerCase();
    const yinPrice = response.data.data.attributes.token_prices[tokenAddress];
    return { yinPrice: parseFloat(yinPrice) };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return null;
  }
}

async function getFluxData() {
  const currentTime = Date.now();
  if (cachedYangPrice && (currentTime - lastYangPriceFetchTime < YANG_PRICE_CACHE_DURATION)) {
    console.log('Using cached YANG price');
    return { yangPrice: cachedYangPrice };
  }

  try {
    const response = await axios.get(FLUX_API_ENDPOINT);
    cachedYangPrice = parseFloat(response.data.yangPrice);
    lastYangPriceFetchTime = currentTime;
    console.log(`Updated cached YANG price: ${cachedYangPrice}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Flux data:", error);
    return null;
  }
}

async function getYangBalance(address) {
  try {
    const balance = await yangToken.balanceOf(address);
    return Number(ethers.utils.formatUnits(balance, YANG_TOKEN_DECIMALS));
  } catch (error) {
    console.error("Error fetching YANG balance:", error);
    return 0;
  }
}

// Swap Event Handler
async function handleSwapEvent(event) {
  const txHash = event.transactionHash;

  if (processedTransactions.has(txHash)) {
    console.log(`Already processed transaction: ${txHash}`);
    return;
  }

  markTransactionAsProcessed(txHash);
  console.log(`[${new Date().toISOString()}] Transaction ${txHash} marked as processed.`);

  try {
    console.log('Received Swap event:', JSON.stringify(event, null, 2));

    const txReceipt = await provider.getTransactionReceipt(txHash);
    const fromAddress = txReceipt.from;
    const recipient = event.args.recipient;
    console.log(`Transaction initiator: ${fromAddress}`);
    console.log(`Recipient: ${recipient}`);

    const pool = new ethers.Contract(event.address, UNISWAP_V3_POOL_ABI, provider);

    const amount0 = event.args.amount0;
    const amount1 = event.args.amount1;

    const token0Address = await pool.token0();
    const token1Address = await pool.token1();

    let isYinBuy = false;
    let tokenAmount;
    let tokenDecimals;

    if (event.address.toLowerCase() === YIN_POOL_ADDRESS.toLowerCase()) {
      isYinBuy = true;
      tokenAmount = token0Address.toLowerCase() === YIN_CONTRACT_ADDRESS.toLowerCase() ? amount0 : amount1;
      tokenDecimals = YIN_TOKEN_DECIMALS;
    }

    if (!isYinBuy || tokenAmount.isZero() || tokenAmount.gt(0)) {
      console.log(`Skipping sell, unrelated, or zero-amount transaction`);
      return;
    }

    const formattedAmount = ethers.utils.formatUnits(tokenAmount.abs(), tokenDecimals);
    console.log(`Token amount: ${formattedAmount}`);

    const fluxData = await getFluxData();
  if (!fluxData) return;

  const yangPrice = fluxData.yangPrice;
  const yinAmount = parseFloat(formattedAmount);
  const yangEquivalent = yinAmount / yangPrice;

    const existingYangBalance = await getYangBalance(fromAddress);
    const totalYangBalance = existingYangBalance + yangEquivalent;

    const fluxRank = getFluxRank(totalYangBalance);

    const transactionValueUSD = yinAmount * currentYinUsdPrice;
    const minimumYinUsdValue = 50;

    // Mark the transaction as processed regardless of its value
    markTransactionAsProcessed(txHash);

    if (transactionValueUSD < minimumYinUsdValue) {
      console.log(`Skipping low-value YIN transaction: $${transactionValueUSD.toFixed(2)}, txHash: ${txHash}`);
      return;
    }

    const emojiPairCount = Math.min(Math.floor(transactionValueUSD / 100), 48);
    const emojiString = "☯️🌊".repeat(emojiPairCount);

    const txHashLink = `https://basescan.org/tx/${txHash}`;
    const chartLink = "https://dexscreener.com/base/0xeCb36fF12cbe4710E9Be2411de46E6C180a4807f";

    const message = `${emojiString}
💸 Bought ${yinAmount.toFixed(2)} YIN (${yangEquivalent.toFixed(2)} YANG) ($${transactionValueUSD.toFixed(2)}) (<a href="https://debank.com/profile/${fromAddress}">View Address</a>)
☯️ YIN Price: $${currentYinUsdPrice.toFixed(5)}
💰 Market Cap: $${(fluxData.circulatingSupply * currentYinUsdPrice).toFixed(0)}
🔥 Total Burned: ${fluxData.burnedAmount} YANG
🔥 Percent Burned: ${(parseFloat(fluxData.burnedAmount) / YANG_INITIAL_SUPPLY * 100).toFixed(3)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>
⚖️ Total YANG Balance: ${totalYangBalance.toFixed(2)}
🛡️ FLUX Rank: ${fluxRank}`;

    const messageOptions = {
      caption: message,
      parse_mode: "HTML",
    };

    console.log('Sending FLUX photo message...');
    addToYangMessageQueue({ photo: getFluxRankImageUrl(fluxRank), options: messageOptions });
    sendYangMessageFromQueue();
    console.log('FLUX photo message added to queue.');

    console.log(`FLUX Buy detected: ${yinAmount.toFixed(2)} YIN (${yangEquivalent.toFixed(2)} YANG) ($${transactionValueUSD.toFixed(2)}), From Address: ${fromAddress}`);
  } catch (error) {
    console.error('Error in handleSwapEvent:', error);
  }
}

// WebSocket Initialization Function
function initializeWebSocket() {
  if (listenersAttached) {
    console.log('Event listeners already attached. Skipping re-attachment.');
    return;
  }

  if (wsProvider) {
    wsProvider.removeAllListeners();
    wsProvider.destroy();
    console.log('Existing WebSocket provider destroyed.');
  }

  console.log(`[${new Date().toISOString()}] Initializing new WebSocket provider.`);
  wsProvider = new ethers.providers.WebSocketProvider(WSS_ENDPOINT);

  const yinPool = new ethers.Contract(YIN_POOL_ADDRESS, UNISWAP_V3_POOL_ABI, wsProvider);

  const swapHandler = (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
    handleSwapEvent({
      args: { sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick },
      transactionHash: event.transactionHash,
      address: event.address
    });
  };

  yinPool.on('Swap', swapHandler);

  listenersAttached = true;
  console.log('WebSocket connection established and listening for Swap events.');

  wsProvider.on('error', (error) => {
    console.error('WebSocket encountered an error:', error);
  });

  wsProvider.on('close', (code) => {
    console.error(`WebSocket connection closed with code ${code}. Ethers.js will attempt to reconnect automatically.`);
    listenersAttached = false;
  });
}

// YANG-Specific Functions
async function updateYangTotalBurnedAmount() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const currentSupply = Number(response.data.result) / 10 ** YANG_TOKEN_DECIMALS;
      yangTotalBurnedAmount = YANG_INITIAL_SUPPLY - currentSupply;
      console.log(`Total YANG burned amount updated: ${yangTotalBurnedAmount.toFixed(8)}`);
    }
  } catch (error) {
    console.error("Error updating total YANG burned amount:", error);
  }
}

async function doBurnWithRetry(maxRetries = 5, initialDelay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      console.log('Calling YANG doBurn function...');

      const optimizedGasPrice = await getOptimizedGasPrice();

      const tx = await yangContract.doBurn({ gasPrice: optimizedGasPrice });
      await tx.wait();
      console.log('YANG burn transaction successful:', tx.hash);
      return;
    } catch (error) {
      console.error(`Error calling YANG doBurn (attempt ${retries + 1}):`, error.message);
      if (error.message.includes('network block skew detected')) {
        const delay = initialDelay * Math.pow(2, retries);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached for YANG doBurn');
}

async function getCurrentYangPrice() {
  try {
    const price = await yangContract.getCurrentPrice();
    return (price / 10**YANG_TOKEN_DECIMALS).toFixed(4);
  } catch (error) {
    console.error("Error getting current YANG price:", error);
    return null;
  }
}

async function checkYangTotalSupply() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const newTotalSupply = Number(response.data.result) / 10 ** YANG_TOKEN_DECIMALS;
      const previousTotalSupply = YANG_INITIAL_SUPPLY - yangTotalBurnedAmount;

      if (newTotalSupply < previousTotalSupply) {
        const burnedAmount = previousTotalSupply - newTotalSupply;
        yangTotalBurnedAmount += burnedAmount;
        await reportYangBurn(burnedAmount, previousTotalSupply);
      }
    } else {
      throw new Error("Failed to retrieve YANG total supply");
    }
  } catch (error) {
    console.error("Error checking YANG total supply:", error);
  }
}

async function reportYangBurn(burnedAmount, previousTotalSupply) {
  const percentBurned = ((YANG_INITIAL_SUPPLY - (previousTotalSupply - burnedAmount)) / YANG_INITIAL_SUPPLY) * 100;
  const newlyBurnedPercent = (burnedAmount / YANG_INITIAL_SUPPLY) * 100;
  
  const fluxData = await getFluxData();
  const currentPrice = fluxData ? fluxData.yangPrice : await getCurrentYangPrice();

  const burnMessage = `YANG Burned!\n\n☀️☀️☀️☀️☀️\n🔥 Burned: ${burnedAmount.toFixed(8)} YANG (${newlyBurnedPercent.toFixed(4)}%)\n🔥 Total Burned: ${yangTotalBurnedAmount.toFixed(8)} YANG\n🔥 Percent Burned: ${percentBurned.toFixed(2)}%\n☯️ YANG to YIN ratio: ${currentPrice}`;

  const burnAnimationMessageOptions = {
    caption: burnMessage,
    parse_mode: "HTML",
  };

  addToYangBurnQueue(YANG_BURN_ANIMATION, burnAnimationMessageOptions);
}

// Scheduler Functions
function scheduleNextCall(callback, delay) {
  setTimeout(() => {
    callback().finally(() => {
      scheduleNextCall(callback, delay);
    });
  }, delay);
}

function scheduleHourlyYangBurn() {
  const now = new Date();
  const buffer = 30000; // 30 seconds buffer
  const delay = (60 * 60 * 1000) - (now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds()) + buffer;

  setTimeout(() => {
    doBurnWithRetry().then(() => {
      console.log(`[${new Date().toISOString()}] Hourly YANG burn completed`);
      scheduleHourlyYangBurn(); // Schedule next burn
    }).catch(error => {
      console.error(`[${new Date().toISOString()}] Error during hourly YANG burn:`, error);
      scheduleHourlyYangBurn(); // Reschedule even if there was an error
    });
  }, delay);
}

// Initialization Function
async function initializeAndStart() {
  try {
    console.log("Initializing FLUX bot...");

    loadProcessedTransactions();

    await updateYangTotalBurnedAmount();
    scheduleNextCall(checkYangTotalSupply, 30000);
    scheduleHourlyYangBurn();

    initializeWebSocket();

    setInterval(resetProcessedTransactions, 24 * 60 * 60 * 1000);

    setInterval(async () => {
      const yinPriceInfo = await getYinPrice();
      if (yinPriceInfo !== null) {
        currentYinUsdPrice = yinPriceInfo.yinPrice;
        console.log(`Updated current YIN USD price to: ${currentYinUsdPrice}`);
      }
    }, 60000);

    console.log("FLUX bot started successfully!");
  } catch (error) {
    console.error("Error during initialization:", error);
    setTimeout(initializeAndStart, 60000);
  }
}

// Start the Bot
initializeAndStart();

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  if (wsProvider) {
    wsProvider.removeAllListeners();
    wsProvider.destroy();
  }
  // Reset processed transactions before shutdown
  resetProcessedTransactions();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Gracefully shutting down...');
  if (wsProvider) {
    wsProvider.removeAllListeners();
    wsProvider.destroy();
  }
  // Reset processed transactions before shutdown
  resetProcessedTransactions();
  process.exit();
});



