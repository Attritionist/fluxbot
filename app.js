const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const ethers = require('ethers');
require("dotenv").config();

// Environment variables
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;

// Constants
const tokenDecimals = 8;
const initialSupply = 2500000;
const burnAnimation = "https://fluxonbase.com/burn.jpg";
const YANG_CONTRACT_ADDRESS = '0x384C9c33737121c4499C85D815eA57D1291875Ab';

// ABI for the doBurn function
const ABI = [
 {
		"inputs": [],
		"name": "doBurn",
		"outputs": [
			{
				"internalType": "bool",
				"name": "_success",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let currentTotalSupply = 0;
let totalBurnedAmount = 0;
const messageQueue = [];
let isSendingMessage = false;

// Hourly burn function
async function doBurn() {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log('Calling doBurn function...');
    const tx = await contract.doBurn();
    await tx.wait();
    console.log('Transaction successful:', tx.hash);
  } catch (error) {
    console.error('Error calling doBurn:', error);
  }
}

function addToBurnQueue(message) {
  messageQueue.push(message);
}

async function sendBurnFromQueue() {
  if (messageQueue.length > 0 && !isSendingMessage) {
    isSendingMessage = true;
    const message = messageQueue.shift();
    try {
      const sentMessage = await bot.sendPhoto(
        TELEGRAM_CHAT_ID,
        message.photo,
        message.options
      );
      // Pin the message without notification
      await bot.pinChatMessage(TELEGRAM_CHAT_ID, sentMessage.message_id, {
        disable_notification: true
      });
    } catch (error) {
      console.error("Error sending or pinning message:", error);
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

function formatSupply(supply) {
  return Number(supply) / 10**tokenDecimals;
}

async function checkTotalSupply() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${YANG_CONTRACT_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const newTotalSupply = formatSupply(response.data.result);
      
      if (currentTotalSupply === 0) {
        currentTotalSupply = newTotalSupply;
        console.log(`Initial total supply set to: ${currentTotalSupply.toFixed(8)}`);
      } else if (newTotalSupply < currentTotalSupply) {
        const burnedAmount = currentTotalSupply - newTotalSupply;
        const previousTotalSupply = currentTotalSupply;
        currentTotalSupply = newTotalSupply;
        await reportBurn(burnedAmount, previousTotalSupply);
      }
    } else {
      throw new Error("Failed to retrieve total supply");
    }
  } catch (error) {
    console.error("Error checking total supply:", error);
  }
}

async function reportBurn(burnedAmount, previousTotalSupply) {
  const percentBurned = ((initialSupply - currentTotalSupply) / initialSupply) * 100;
  const newlyBurnedPercent = (burnedAmount / initialSupply) * 100;
  
  const burnMessage = `YANG Burned!\n\n☯️☯️☯️☯️☯️\n🔥 Burned: ${burnedAmount.toFixed(8)} YANG (${newlyBurnedPercent.toFixed(4)}%)\n🔥 Total Burned: ${(initialSupply - currentTotalSupply).toFixed(8)} YANG\n🔥 Total Percent Burned: ${percentBurned.toFixed(2)}%\n`;

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
      const currentSupply = formatSupply(response.data.result);
      totalBurnedAmount = initialSupply - currentSupply;
      console.log(`Total burned amount updated: ${totalBurnedAmount.toFixed(8)}`);
    }
  } catch (error) {
    console.error("Error updating total burned amount:", error);
  }
}

// Initialize and start the combined script
updateTotalBurnedAmount()
  .then(() => {
    console.log("Total burned amount initialized.");
    scheduleNextCall(detectYangBurnEvent, 30000); // Check for burns every 30 seconds
    
    // Schedule hourly burn
    const scheduleHourlyBurn = () => {
      const now = new Date();
      const delay = 60 * 60 * 1000 - (now.getMinutes() * 60 + now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(() => {
        doBurn().then(() => {
          console.log("Hourly burn completed");
          scheduleHourlyBurn(); // Schedule next burn
        }).catch(error => {
          console.error("Error during hourly burn:", error);
          scheduleHourlyBurn(); // Reschedule even if there was an error
        });
      }, delay);
    };
    
    scheduleHourlyBurn(); // Start the hourly burn schedule
  })
  .catch((error) => {
    console.error("Error during initialization:", error);
  });
