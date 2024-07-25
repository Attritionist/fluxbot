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
const burnAnimation = "https://voidonbase.com/burn.jpg";

const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();

let processedUniswapTransactions = new Set();

const POOL_MAPPING = {
  "0xb14e941d34d61ae251ccc08ac15b8455ae9f60a5": "VOID/ETH",
  "0x53a1d9ad828d2ac5f67007738cc5688a753241ba": "VOID/YIN"
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
async function getVoidPrice() {
  try {
    const response = await axios.get(
      `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/base/token_price/0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc?x_cg_pro_api_key=${COINGECKO_API}`
    );
    const tokenAddress = '0x21eceaf3bf88ef0797e3927d855ca5bb569a47fc'.toLowerCase();
    const voidPrice = response.data.data.attributes.token_prices[tokenAddress];
    return { voidPrice: parseFloat(voidPrice) };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return null;
  }
}

setInterval(async () => {
  const priceInfo = await getVoidPrice();
  if (priceInfo !== null) {
    currentVoidUsdPrice = priceInfo.voidPrice;
    console.log(`Updated current VOID USD price to: ${currentVoidUsdPrice}`);
  }
}, 45000);

let currentVoidUsdPrice = null;

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
function getVoidRank(voidBalance) {
  const VOID_RANKS = {
    "VOID Ultimate": 2000000,
    "VOID Omega": 1500000,
    "VOID Absolute": 1000000,
    "VOID Singularity": 900000,
    "VOID Omnipotence": 850000,
    "VOID Eternity": 800000,
    "VOID Apotheosis": 750000,
    "VOID Cosmic Blazer": 696969,
    "VOID Divine": 650000,
    "VOID Celestial": 600000,
    "VOID Exalted": 550000,
    "VOID Transcendent": 500000,
    "VOID Majesty": 450000,
    "VOID Sovereign": 400000,
    "VOID Monarch": 350000,
    "VOID Admiral": 275000,
    "VOID Warden": 250000,
    "VOID Harbinger": 225000,
    "VOID Evoker": 200000,
    "VOID Emperor": 175000,
    "VOID Assassin": 162500,
    "VOID Overlord": 150000,
    "VOID Creature": 140000,
    "VOID Hierophant": 130000,
    "VOID Juggernaut": 120000,
    "VOID Grandmaster": 110000,
    "VOID Lord": 100000,
    "VOID Alchemist": 92500,
    "VOID Clairvoyant": 85000,
    "VOID Conjurer": 80000,
    "VOID Archdruid": 75000,
    "VOID Dank Mystic": 69420,
    "VOID Archmage": 65000,
    "VOID Warlock": 60000,
    "VOID Sorcerer": 55000,
    "VOID Knight": 50000,
    "VOID Shaman": 45000,
    "VOID Sage": 40000,
    "VOID Warrior": 35000,
    "VOID Enchanter": 30000,
    "VOID Seer": 27500,
    "VOID Necromancer": 25000,
    "VOID Summoner": 22500,
    "VOID Master": 20000,
    "VOID Disciple": 15000,
    "VOID Acolyte": 12500,
    "VOID Expert": 10000,
    "VOID Apprentice": 7500,
    "VOID Rookie": 5000,
    "VOID Learner": 2500,
    "VOID Initiate": 1000,
    "VOID Peasant": 1
  };

  let voidRank = "Void Peasant";
  for (const [rank, threshold] of Object.entries(VOID_RANKS)) {
    if (voidBalance >= threshold) {
      voidRank = rank;
      break;
    }
  }

  return voidRank;
}

function getRankImageUrl(voidRank) {
  const rankToImageUrlMap = {
    "VOID Peasant": "https://voidonbase.com/rank1.png",
    "VOID Initiate": "https://voidonbase.com/rank2.png",
    "VOID Learner": "https://voidonbase.com/rank3.png",
    "VOID Rookie": "https://voidonbase.com/rank4.png",
    "VOID Apprentice": "https://voidonbase.com/rank5.png",
    "VOID Expert": "https://voidonbase.com/rank6.png",
    "VOID Acolyte": "https://voidonbase.com/rank10.png",
    "VOID Disciple": "https://voidonbase.com/rank11.png",
    "VOID Master": "https://voidonbase.com/rank12.png",
    "VOID Summoner": "https://voidonbase.com/rank14.png",
    "VOID Necromancer": "https://voidonbase.com/rank15.png",
    "VOID Seer": "https://voidonbase.com/rank16.png",
    "VOID Enchanter": "https://voidonbase.com/rank17.png",
    "VOID Warrior": "https://voidonbase.com/rankwar.png",
    "VOID Sage": "https://voidonbase.com/rank18.png",
    "VOID Shaman": "https://voidonbase.com/rank19.png",
    "VOID Knight": "https://voidonbase.com/rank20.png",
    "VOID Sorcerer": "https://voidonbase.com/rank21.png",
    "VOID Warlock": "https://voidonbase.com/rank22.png",
    "VOID Archmage": "https://voidonbase.com/rank24.png",
    "VOID Dank Mystic": "https://voidonbase.com/420.png",
    "VOID Archdruid": "https://voidonbase.com/rank25.png",
    "VOID Conjurer": "https://voidonbase.com/rank26.png",
    "VOID Clairvoyant": "https://voidonbase.com/rank27.png",
    "VOID Alchemist": "https://voidonbase.com/rank28.png",
    "VOID Lord": "https://voidonbase.com/rank29.png",
    "VOID Grandmaster": "https://voidonbase.com/rankgm.png",
    "VOID Juggernaut": "https://voidonbase.com/rankjug.png",
    "VOID Hierophant": "https://voidonbase.com/rank30.png",
    "VOID Creature": "https://voidonbase.com/rank32.png",
    "VOID Overlord": "https://voidonbase.com/rank33.png",
    "VOID Assassin": "https://voidonbase.com/assassin.png",
    "VOID Emperor": "https://voidonbase.com/rank34.png",
    "VOID Evoker": "https://voidonbase.com/rank35.png",
    "VOID Harbinger": "https://voidonbase.com/rank36.png",
    "VOID Warden": "https://voidonbase.com/rank39.png",
    "VOID Admiral": "https://voidonbase.com/rank40.png",
    "VOID Monarch": "https://voidonbase.com/rank41.png",
    "VOID Sovereign": "https://voidonbase.com/rank42.png",
    "VOID Majesty": "https://voidonbase.com/rank43.png",
    "VOID Transcendent": "https://voidonbase.com/rank44.png",
    "VOID Exalted": "https://voidonbase.com/rank45.png",
    "VOID Celestial": "https://voidonbase.com/rank46.png",
    "VOID Divine": "https://voidonbase.com/rank47.png",
    "VOID Cosmic Blazer": "https://voidonbase.com/696969.png",
    "VOID Apotheosis": "https://voidonbase.com/rank48.png",
    "VOID Eternity": "https://voidonbase.com/rank49.png",
    "VOID Omnipotence": "https://voidonbase.com/rank50.png",
    "VOID Singularity": "https://voidonbase.com/rank51.png",
    "VOID Absolute": "https://voidonbase.com/rank52.png",
    "VOID Omega": "https://voidonbase.com/rank53.png",
    "VOID Ultimate": "https://voidonbase.com/rank54.png"
  };

  return rankToImageUrlMap[voidRank] || "https://voidonbase.com/rank1.png";
}

async function detectUniswapLatestTransaction() {
  const poolAddresses = Object.keys(POOL_MAPPING);

  poolAddresses.forEach(async (poolAddress) => {
    try {
      const voidPrice = currentVoidUsdPrice;
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
          const chartLink = "https://dexscreener.com/base/0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc";
          const amountTransferred = REVERSED_POOLS.includes(poolAddress)
            ? isBuy ? Number(transaction.attributes.from_token_amount) : Number(transaction.attributes.to_token_amount)
            : isBuy ? Number(transaction.attributes.to_token_amount) : Number(transaction.attributes.from_token_amount);

          const totalSupply = initialSupply - totalBurnedAmount;
          const percentBurned = totalBurnedAmount / initialSupply * 100;
          const transactionvalue = transaction.attributes.volume_in_usd;
          const marketCap = voidPrice * totalSupply;

          const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc&address=${fromAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

          const config = {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.0; x64) AppleWebKit/603.37 (KHTML, like Gecko) Chrome/53.0.2093.181 Safari/534.4 Edge/12.40330'
            },
            withCredentials: true
          };

          const balanceDetailResponse = await axios.get(balanceDetailsUrl, config);

          if (balanceDetailResponse.data.status === "1") {
            const voidBalance = balanceDetailResponse.data.result / 10 ** tokenDecimals;

            if (isBuy && voidBalance > 1501 && Number(transaction.attributes.volume_in_usd) > 100) {
              // Handle normal buy transaction
              const emojiCount = Math.min(Math.ceil(transaction.attributes.volume_in_usd / 100), 96);
              let emojiString = "";

              for (let i = 0; i < emojiCount; i++) {
                emojiString += "🟣🔥";
              }

              const voidRank = getVoidRank(voidBalance);
              const imageUrl = getRankImageUrl(voidRank);

              const message = `${emojiString}
💸 Bought ${amountTransferred.toFixed(2)} VOID ($${transactionvalue}) (<a href="${addressLink}">View Address</a>)
🟣 VOID Price: $${voidPrice.toFixed(5)}
💰 Market Cap: $${marketCap.toFixed(0)}
🔥 Percent Burned: ${percentBurned.toFixed(3)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>
⚖️ Remaining VOID Balance: ${voidBalance.toFixed(2)}
🛡️ VOID Rank: ${voidRank}
🚰 Pool: ${POOL_MAPPING[poolAddress]}`;

              const voidMessageOptions = {
                caption: message,
                parse_mode: "HTML",
              };

              sendPhotoMessage(imageUrl, voidMessageOptions);
              processedUniswapTransactions.add(transaction.id);
            } else if (isBuy && voidBalance < 1501 && Number(transaction.attributes.volume_in_usd) > 1000) {
              // Handle arbitrage buy transaction
              const emojiCount = Math.floor(Math.min(Math.ceil(transaction.attributes.volume_in_usd / 100), 96));
              let emojiString = "";

              for (let i = 0; i < emojiCount; i++) {
                emojiString += "🤖🔩";
              }

              const imageUrl = "https://voidonbase.com/arbitrage.jpg";

              const message = `${emojiString}
💸 Bought ${amountTransferred.toFixed(2)} VOID ($${transactionvalue}) (<a href="${addressLink}">View Address</a>)
🟣 VOID Price: $${voidPrice.toFixed(5)}
💰 Market Cap: $${marketCap.toFixed(0)}
🔥 Percent Burned: ${percentBurned.toFixed(3)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>
⚠️ Arbitrage Transaction
🚰 Pool: ${POOL_MAPPING[poolAddress]}`;

              const voidMessageOptions = {
                caption: message,
                parse_mode: "HTML",
              };

              sendPhotoMessage(imageUrl, voidMessageOptions);
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
async function detectVoidBurnEvent() {
  try {
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 10.4; WOW64; en-US) AppleWebKit/537.20 (KHTML, like Gecko) Chrome/53.0.3086.259 Safari/602.4 Edge/12.29796'
      },
      withCredentials: true
    };

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc&address=0x0000000000000000000000000000000000000000&page=1&offset=1&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
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
              const chartLink = "https://dexscreener.com/base/0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc";
              const percentBurned =
                ((initialSupply - totalBurnedAmountt) / initialSupply) * 100;
              totalBurnedAmountt += amountBurned;
              const burnMessage = `VOID Burned!\n\n💀💀💀💀💀\n🔥 Burned: ${amountBurned.toFixed(
                3
              )} VOID\nPercent Burned: ${percentBurned.toFixed(
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
        
            const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
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
scheduleNextCall(detectVoidBurnEvent, 20000);


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
  scheduleNextCall(detectUniswapLatestTransaction, 7500);
});
