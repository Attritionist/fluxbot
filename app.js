const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 8;
const initialSupply = 100000000;
const burnAnimation = "https://fluxonbase.com/burn.jpg";
const YANG_CONTRACT_ADDRESS = '0x384C9c33737121c4499C85D815eA57D1291875Ab';

let currentTotalSupply = BigInt(0);
let totalBurnedAmount = 0;

const messageQueue = [];
let isSendingMessage = false;

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
      sendBurnFromQueue();
    }, 500);
  }
}

async function sendAnimationMessage(photo, options) {
  addToBurnQueue({ photo, options });
  sendBurnFromQueue();
}

async function checkTotalSupply() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const newTotalSupply = BigInt(response.data.result);
      
      if (currentTotalSupply === BigInt(0)) {
        currentTotalSupply = newTotalSupply;
        console.log(`Initial total supply set to: ${currentTotalSupply}`);
      } else if (newTotalSupply < currentTotalSupply) {
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

// Initialize and start the bot
updateTotalBurnedAmount()
  .then(() => {
    console.log("Total burned amount initialized.");
    scheduleNextCall(detectYangBurnEvent, 20000); // Check for burns every 20 seconds
  })
  .catch((error) => {
    console.error("Error during initialization:", error);
  });
