const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const fs = require("fs");

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const COINGECKO_API = process.env["COINGECKO_API"];
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 8;  // Updated to 8 decimals as per the API response
const initialSupply = 100000000;
const burnAnimation = "https://fluxonbase.com/burn.jpg";
const buyAnimation = "https://fluxonbase.com/buy.jpg";  // New constant for buy image
const YIN_CONTRACT_ADDRESS = '0xecb36ff12cbe4710e9be2411de46e6c180a4807f';
const YANG_CONTRACT_ADDRESS = '0x384C9c33737121c4499C85D815eA57D1291875Ab';

const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();

let processedUniswapTransactions = new Set();

const POOL_MAPPING = {
  "0x90fbb03389061020eec7ce9a7435966363410b87": "YIN/ETH",
};

const REVERSED_POOLS = [];

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
      `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/base/token_price/${YIN_CONTRACT_ADDRESS}?x_cg_pro_api_key=${COINGECKO_API}`
    );
    const tokenAddress = YIN_CONTRACT_ADDRESS.toLowerCase();
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

        const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${YIN_CONTRACT_ADDRESS}&address=${fromAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

          const config = {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.0; x64) AppleWebKit/603.37 (KHTML, like Gecko) Chrome/53.0.2093.181 Safari/534.4 Edge/12.40330'
            },
            withCredentials: true
          };

          const balanceDetailResponse = await axios.get(balanceDetailsUrl, config);

          if (balanceDetailResponse.data.status === "1") {
            const yinBalance = balanceDetailResponse.data.result / 10 ** tokenDecimals;

            if (isBuy && Number(transaction.attributes.volume_in_usd) > 50) {
              const emojiCount = Math.min(Math.ceil(transaction.attributes.volume_in_usd / 50), 96);
              let emojiString = "";

              for (let i = 0; i < emojiCount; i++) {
                emojiString += "☯️🔥";
              }

              const message = `${emojiString}
💸 Bought ${amountTransferred.toFixed(2)} YIN ($${transactionvalue}) (<a href="${addressLink}">View Address</a>)
☯️ YIN Price: $${yinPrice.toFixed(5)}
💰 Market Cap: $${marketCap.toFixed(0)}
🔥 Percent Burned: ${percentBurned.toFixed(3)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>`;

              const yinMessageOptions = {
                caption: message,
                parse_mode: "HTML",
              };

              sendPhotoMessage(buyAnimation, yinMessageOptions);  // Use buyAnimation for buy transactions
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

let currentTotalSupply = BigInt(0);

async function checkTotalSupply() {
  try {
const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const newTotalSupply = BigInt(response.data.result);
      
      if (currentTotalSupply === BigInt(0)) {
        // First run, just set the initial supply
        currentTotalSupply = newTotalSupply;
        console.log(`Initial total supply set to: ${currentTotalSupply}`);
      } else if (newTotalSupply < currentTotalSupply) {
        // A burn has occurred
        const burnedAmount = currentTotalSupply - newTotalSupply;
        const burnedAmountFormatted = Number(burnedAmount) / 10**tokenDecimals;
        
        await reportBurn(burnedAmountFormatted);
        
        currentTotalSupply = newTotalSupply;
      }
    } else {
      throw new Error("Failed to retrieve total supply");
    }
  } catch (error) {
    console.error("Error checking total supply:", error);
  }
}

async function reportBurn(burnedAmount) {
  const chartLink = "https://dexscreener.com/base/0x384C9c33737121c4499C85D815eA57D1291875Ab";
  const percentBurned = ((initialSupply - Number(currentTotalSupply) / 10**tokenDecimals) / initialSupply) * 100;
  
  const burnMessage = `YANG Burned!\n\n💀💀💀💀💀\n🔥 Burned: ${burnedAmount.toFixed(3)} YANG\nPercent Burned: ${percentBurned.toFixed(2)}%\n🔎 <a href="${chartLink}">Chart</a>`;

  const burnAnimationMessageOptions = {
    caption: burnMessage,
    parse_mode: "HTML",
  };
  
  sendAnimationMessage(burnAnimation, burnAnimationMessageOptions);
}

async function detectYangBurnEvent() {
  await checkTotalSupply();
}

function scheduleNextCall(callback, delay) {
  setTimeout(() => {
    callback().finally(() => {
      scheduleNextCall(callback, delay);
    });
  }, delay);
}

let totalBurnedAmount = 0;

async function updateTotalBurnedAmount() {
  try {
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.4; WOW64; en-US) AppleWebKit/537.20 (KHTML, like Gecko) Chrome/53.0.3086.259 Safari/602.4 Edge/12.29796'
      },
      withCredentials: true
    };

const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl, config);

    if (response.data.status === "1") {
      const currentSupply = BigInt(response.data.result);
      totalBurnedAmount = Number(BigInt(initialSupply * 10**tokenDecimals) - currentSupply) / 10**tokenDecimals;
      console.log(`Total burned amount updated: ${totalBurnedAmount}`);
    }
  } catch (error) {
    console.error("Error updating total burned amount:", error);
  }
}

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

// Initialize and start the bot
updateTotalBurnedAmount()
  .then(() => {
    console.log("Total burned amount initialized.");
    scheduleNextCall(detectYangBurnEvent, 20000); // Check for burns every 20 seconds
    return fetchInitialUniswapTransactions();
  })
  .then(() => {
    console.log("Initial Uniswap transactions fetched.");
    scheduleNextCall(detectUniswapLatestTransaction, 5000); // Check for new Uniswap transactions every 5 seconds
  })
  .catch((error) => {
    console.error("Error during initialization:", error);
  });
