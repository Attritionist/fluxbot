const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const COINGECKO_API = process.env["COINGECKO_API"];
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18;
const initialSupply = 100000000;
const fs = require("fs");
const burnAnimation = "https://example.com/burn.jpg"; // Replace with actual burn animation for YANG

const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();

let processedUniswapTransactions = new Set();

const POOL_MAPPING = {
  "0x90fbb03389061020eec7ce9a7435966363410b87": "YIN/ETH",
};

const REVERSED_POOLS = [
];

if (fs.existsSync(processedTransactionsFilePath)) {
  const data = fs.readFileSync(processedTransactionsFilePath, "utf-8");
  if (data.trim()) {
    try {
      const parsedData = JSON.parse(data);
      if (Array.isArray(parsedData)) {
        processedTransactions = new Set(parsedData);
      } else {
        throw new Error("Data read from file is not in the expected format");
      }
    } catch (error) {
      console.error("Error parsing processed transactions data:", error);
    }
  }
}

function saveProcessedTransactions() {
  try {
    const data = JSON.stringify(Array.from(processedTransactions));
    fs.writeFileSync(processedTransactionsFilePath, data, "utf-8");
  } catch (error) {
    console.error("Error saving processed transactions to file:", error);
  }
}

async function getYinPrice() {
  try {
    const response = await axios.get(
      `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/base/token_price/0xecb36ff12cbe4710e9be2411de46e6c180a4807f?x_cg_pro_api_key=${COINGECKO_API}`
    );
    const tokenAddress = '0xecb36ff12cbe4710e9be2411de46e6c180a4807f'.toLowerCase();
    const yinPrice = response.data.data.attributes.token_prices[tokenAddress];
    return { yinPrice: parseFloat(yinPrice) };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return null;
  }
}

setInterval(async () => {
  const priceInfo = await getYinPrice();
  if (priceInfo !== null) {
    currentYinUsdPrice = priceInfo.yinPrice;
    console.log(`Updated current YIN USD price to: ${currentYinUsdPrice}`);
  }
}, 45000);

let currentYinUsdPrice = null;

const messageQueue = [];
let isSendingMessage = false;

function addToMessageQueue(message) {
  messageQueue.push(message);
}

function addToBurnQueue(message) {
  messageQueue.push(message);
}

async function sendBurnFromQueue() {
  if (messageQueue.length > 0 && !isSendingMessage) {
    isSendingMessage = true;
    const message = messageQueue.shift();
    try {
      await bot.sendPhoto(
        TELEGRAM_CHAT_ID,
        message.photo,
        message.options
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setTimeout(() => {
      isSendingMessage = false;
      sendAnimationMessage();
    }, 500);
  }
}

async function sendMessageFromQueue() {
  if (messageQueue.length > 0 && !isSendingMessage) {
    isSendingMessage = true;
    const message = messageQueue.shift();
    try {
      await bot.sendPhoto(
        TELEGRAM_CHAT_ID,
        message.photo,
        message.options
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setTimeout(() => {
      isSendingMessage = false;
      sendMessageFromQueue();
    }, 500);
  }
}

async function sendPhotoMessage(photo, options) {
  addToMessageQueue({ photo, options });
  sendMessageFromQueue();
}

async function sendAnimationMessage(photo, options) {
  addToBurnQueue({ photo, options });
  sendBurnFromQueue();
}

function getYangRank(yangBalance) {
  const YANG_RANKS = {
    "YANG Ultimate": 2000000,
    "YANG Omega": 1500000,
    "YANG Absolute": 1000000,
    "YANG Singularity": 900000,
    "YANG Omnipotence": 850000,
    "YANG Eternity": 800000,
    "YANG Apotheosis": 750000,
    "YANG Cosmic Blazer": 696969,
    "YANG Divine": 650000,
    "YANG Celestial": 600000,
    "YANG Exalted": 550000,
    "YANG Transcendent": 500000,
    "YANG Majesty": 450000,
    "YANG Sovereign": 400000,
    "YANG Monarch": 350000,
    "YANG Admiral": 275000,
    "YANG Warden": 250000,
    "YANG Harbinger": 225000,
    "YANG Evoker": 200000,
    "YANG Emperor": 175000,
    "YANG Assassin": 162500,
    "YANG Overlord": 150000,
    "YANG Creature": 140000,
    "YANG Hierophant": 130000,
    "YANG Juggernaut": 120000,
    "YANG Grandmaster": 110000,
    "YANG Lord": 100000,
    "YANG Alchemist": 92500,
    "YANG Clairvoyant": 85000,
    "YANG Conjurer": 80000,
    "YANG Archdruid": 75000,
    "YANG Dank Mystic": 69420,
    "YANG Archmage": 65000,
    "YANG Warlock": 60000,
    "YANG Sorcerer": 55000,
    "YANG Knight": 50000,
    "YANG Shaman": 45000,
    "YANG Sage": 40000,
    "YANG Warrior": 35000,
    "YANG Enchanter": 30000,
    "YANG Seer": 27500,
    "YANG Necromancer": 25000,
    "YANG Summoner": 22500,
    "YANG Master": 20000,
    "YANG Disciple": 15000,
    "YANG Acolyte": 12500,
    "YANG Expert": 10000,
    "YANG Apprentice": 7500,
    "YANG Rookie": 5000,
    "YANG Learner": 2500,
    "YANG Initiate": 1000,
    "YANG Peasant": 1
  };

  let yangRank = "YANG Peasant";
  for (const [rank, threshold] of Object.entries(YANG_RANKS)) {
    if (yangBalance >= threshold) {
      yangRank = rank;
      break;
    }
  }

  return yangRank;
}

function getRankImageUrl(yangRank) {
  // Replace these URLs with actual image URLs for YANG ranks
  const rankToImageUrlMap = {
    "YANG Peasant": "https://example.com/rank1.png",
    "YANG Initiate": "https://example.com/rank2.png",
    // ... (continue for all YANG ranks)
    "YANG Ultimate": "https://example.com/rank54.png"
  };

  return rankToImageUrlMap[yangRank] || "https://example.com/rank1.png";
}

async function detectUniswapLatestTransaction() {
  const poolAddresses = Object.keys(POOL_MAPPING);

  poolAddresses.forEach(async (poolAddress) => {
    try {
      const yinPrice = currentYinUsdPrice;
      const apiUrl = `https://pro-api.coingecko.com/api/v3/onchain/networks/base/pools/${poolAddress}/trades`;
      const response = await axios.get(apiUrl, {
        headers: {
          "X-Cg-Pro-Api-Key": COINGECKO_API,
        }
      });

      if (response.status !== 200) {
        throw new Error("Failed to retrieve latest Uniswap transactions");
      }

      console.log(`Checking for new transactions on ${POOL_MAPPING[poolAddress]} pool...`);

      const transactionsToProcess = response.data.data.filter(
        (transaction) =>
          !processedUniswapTransactions.has(transaction.id)
      );

      console.log("Transactions to process:", transactionsToProcess)

      if (transactionsToProcess.length === 0) {
        console.warn("No new transactions detected.");
        return;
      } else {
        transactionsToProcess.forEach(async (transaction) => {
          const isBuy = transaction.attributes.kind == 'buy';
          const fromAddress = transaction.attributes.tx_from_address;
          const addressLink = `https://debank.com/profile/${fromAddress}`;
          const txHashLink = `https://basescan.org/tx/${transaction.attributes.tx_hash}`;
          const chartLink = "https://dexscreener.com/base/0xecb36ff12cbe4710e9be2411de46e6c180a4807f";
          const amountTransferred = REVERSED_POOLS.includes(poolAddress)
            ? isBuy ? Number(transaction.attributes.from_token_amount) : Number(transaction.attributes.to_token_amount)
            : isBuy ? Number(transaction.attributes.to_token_amount) : Number(transaction.attributes.from_token_amount);

          const totalSupply = initialSupply - totalBurnedAmount;
          const percentBurned = totalBurnedAmount / initialSupply * 100;
          const transactionvalue = transaction.attributes.volume_in_usd;
          const marketCap = yinPrice * totalSupply;

          const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0xecb36ff12cbe4710e9be2411de46e6c180a4807f&address=${fromAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

          const config = {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.0; x64) AppleWebKit/603.37 (KHTML, like Gecko) Chrome/53.0.2093.181 Safari/534.4 Edge/12.40330'
            },
            withCredentials: true
          };

          const balanceDetailResponse = await axios.get(balanceDetailsUrl, config);

          if (balanceDetailResponse.data.status === "1") {
            const yinBalance = balanceDetailResponse.data.result / 10 ** tokenDecimals;

            if (isBuy && yinBalance > 1501 && Number(transaction.attributes.volume_in_usd) > 50) {
              // Handle normal buy transaction
              const emojiCount = Math.min(Math.ceil(transaction.attributes.volume_in_usd / 100), 96);
              let emojiString = "";

              for (let i = 0; i < emojiCount; i++) {
                emojiString += "☯️🔥";
              }

              const yangRank = getYangRank(yinBalance);
              const imageUrl = getRankImageUrl(yangRank);

              const message = `${emojiString}
💸 Bought ${amountTransferred.toFixed(2)} YIN ($${transactionvalue}) (<a href="${addressLink}">View Address</a>)
☯️ YIN Price: $${yinPrice.toFixed(5)}
💰 Market Cap: $${marketCap.toFixed(0)}
🔥 Percent Burned: ${percentBurned.toFixed(3)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>
⚖️ Remaining YIN Balance: ${yinBalance.toFixed(2)}
🛡️ YANG Rank: ${yangRank}
🚰 Pool: ${POOL_MAPPING[poolAddress]}`;

              const yinMessageOptions = {
                caption: message,
                parse_mode: "HTML",
              };

              sendPhotoMessage(imageUrl, yinMessageOptions);
              processedUniswapTransactions.add(transaction.id);
            } else {
              processedUniswapTransactions.add(transaction.id);
              console.error("Transaction amount too low to process, tx hash:", transaction.attributes.tx_hash + " skipping...");
            }
          }
        })
      }
    } catch (error) {
      console.error("Error in detectUniswapLatestTransaction:", error);
    }
  });
}
async function detectYangBurnEvent() {
  try {
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.4; WOW64; en-US) AppleWebKit/537.20 (KHTML, like Gecko) Chrome/53.0.3086.259 Safari/602.4 Edge/12.29796'
      },
      withCredentials: true
    };

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=0x384C9c33737121c4499C85D815eA57D1291875Ab&address=0x0000000000000000000000000000000000000000&page=1&offset=1&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl, config);

    if (response.data.status !== "1") {
      throw new Error("Failed to retrieve token transactions");
    }

    await updateTotalBurnedAmount();

    const newBurnEvents = response.data.result.filter(
      (transaction) =>
        transaction.to.toLowerCase() ===
        "0x0000000000000000000000000000000000000000" &&
        !processedTransactions.has(transaction.hash)
    );

    if (newBurnEvents.length === 0) {
      console.log("No new burn events detected.");
      return;
    }

    newBurnEvents.forEach((transaction) => {
      processedTransactions.add(transaction.hash);
      const amountBurned =
        Number(transaction.value) / 10 ** tokenDecimals;
      const txHash = transaction.hash;
      const txHashLink = `https://basescan.org/tx/${txHash}`;
      const chartLink = "https://dexscreener.com/base/0x384C9c33737121c4499C85D815eA57D1291875Ab";
      const percentBurned =
        ((initialSupply - totalBurnedAmountt) / initialSupply) * 100;
      totalBurnedAmountt += amountBurned;
      const burnMessage = `YANG Burned!\n\n💀💀💀💀💀\n🔥 Burned: ${amountBurned.toFixed(
        3
      )} YANG\nPercent Burned: ${percentBurned.toFixed(
        2
      )}%\n🔎 <a href="${chartLink}">Chart</a> | <a href="${txHashLink}">TX Hash</a>`;

      const burnanimationMessageOptions = {
        caption: burnMessage,
        parse_mode: "HTML",
      };
      sendAnimationMessage(burnAnimation, burnanimationMessageOptions);

      saveProcessedTransactions();
    });
  } catch (error) {
    console.error("Error detecting token burn event:", error);
  }
}

function scheduleNextCall(callback, delay) {
  setTimeout(() => {
    callback().finally(() => {
      scheduleNextCall(callback, delay);
    });
  }, delay);
}

let totalBurnedAmount = 0;
let totalBurnedAmountt = 0;

async function updateTotalBurnedAmount() {
  try {
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.4; WOW64; en-US) AppleWebKit/537.20 (KHTML, like Gecko) Chrome/53.0.3086.259 Safari/602.4 Edge/12.29796'
      },
      withCredentials: true
    };

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x384C9c33737121c4499C85D815eA57D1291875Ab&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl, config);

    if (response.data.status === "1") {
      const balance = Number(response.data.result) / 10 ** tokenDecimals;
      totalBurnedAmount = balance;
      totalBurnedAmountt = initialSupply - balance;
    }
  } catch (error) {
    console.error("Error updating total burned amount:", error);
  }
}

scheduleNextCall(detectYangBurnEvent, 60000);

// Add initial 300 transactions to processed transactions set to avoid spamming the group on initial startup
const fetchInitialUniswapTransactions = async () => {
  const poolAddresses = Object.keys(POOL_MAPPING);

  for (const poolAddress of poolAddresses) {
    const apiUrl = `https://pro-api.coingecko.com/api/v3/onchain/networks/base/pools/${[poolAddress]}/trades`;
    const response = await axios.get(apiUrl, {
      headers: {
        "X-Cg-Pro-Api-Key": COINGECKO_API,
      }
    });

    if (response.status !== 200) {
      throw new Error("Failed to retrieve latest Uniswap transactions");
    }

    const transactions = response.data.data;
    for (const transaction of transactions) {
      processedUniswapTransactions.add(transaction.id);
    }
  }
}

fetchInitialUniswapTransactions().catch((error) => {
  console.error("Error fetching initial Uniswap transactions:", error);
}).then(() => {
  scheduleNextCall(detectUniswapLatestTransaction, 10000);
});
