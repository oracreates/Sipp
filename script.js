

const { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram, LAMPORTS_PER_SOL } = solanaWeb3;
const connection = new Connection(clusterApiUrl("devnet")); // switch to mainnet-beta for real SOL

// Config
const PLATFORM_WALLET = "FILL_WITH_YOUR_PLATFORM_WALLET_PUBLIC_KEY";
const PLATFORM_FEE_USD = 0.1; // $0.10 platform fee

let creator = null;
let walletPublicKey = null;

// DOM elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const buyCoffeeBtn = document.getElementById("buyCoffeeBtn");
const creatorNameEl = document.getElementById("creator-name");
const creatorBioEl = document.getElementById("creator-bio");
const coffeePriceEl = document.getElementById("coffeePrice");
const platformFeeEl = document.getElementById("platformFee");
const thankYouMsg = document.getElementById("thankYouMsg");

// --- Helper: Get handle from URL ---
function getHandleFromURL() {
  const path = window.location.pathname.split('/');
  return path[path.length - 1]; // last part is handle
}

// --- Fetch SOL price in USD (CoinGecko) ---
async function getSolPriceUSD() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json();
    return data.solana.usd;
  } catch (err) {
    console.error("Error fetching SOL price:", err);
    return 15; // fallback price
  }
}

// --- Load creator profile ---
async function loadCreatorProfile() {
  const handle = getHandleFromURL();
  try {
    const res = await fetch("/creators.json"); // replace with on-chain lookup for real product
    const creators = await res.json();
    creator = creators.find(c => c.handle.toLowerCase() === handle.toLowerCase());
    if (!creator) {
      creatorNameEl.textContent = "Creator Not Found";
      creatorBioEl.textContent = "";
      buyCoffeeBtn.disabled = true;
      return;
    }

    creatorNameEl.textContent = creator.name;
    creatorBioEl.textContent = creator.bio;
    coffeePriceEl.textContent = `Coffee price: ${creator.coffeePriceSOL} SOL`;

    const solPrice = await getSolPriceUSD();
    const platformFeeSOL = (PLATFORM_FEE_USD / solPrice).toFixed(6);
    platformFeeEl.textContent = `Platform fee: ${platformFeeSOL} SOL (~$${PLATFORM_FEE_USD})`;

    buyCoffeeBtn.dataset.platformFeeSOL = platformFeeSOL;
  } catch (err) {
    console.error(err);
    creatorNameEl.textContent = "Error loading profile";
  }
}

// --- Connect Wallet ---
connectWalletBtn.onclick = async () => {
  if (!window.solana) return alert("Phantom wallet not found!");
  try {
    const resp = await window.solana.connect();
    walletPublicKey = resp.publicKey;
    alert("Wallet connected: " + walletPublicKey.toString());
    buyCoffeeBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed");
  }
};

// --- Buy Coffee (multi-recipient transaction) ---
buyCoffeeBtn.onclick = async () => {
  if (!walletPublicKey || !creator) return;

  try {
    const platformFeeSOL = parseFloat(buyCoffeeBtn.dataset.platformFeeSOL);
    const coffeePriceSOL = parseFloat(creator.coffeePriceSOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: new PublicKey(creator.wallet),
        lamports: coffeePriceSOL * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: new PublicKey(PLATFORM_WALLET),
        lamports: platformFeeSOL * LAMPORTS_PER_SOL,
      })
    );

    const { signature } = await window.solana.signAndSendTransaction(transaction);
    console.log("Payment successful! Signature:", signature);
    thankYouMsg.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Transaction failed");
  }
};

// --- Initialize ---
window.addEventListener("load", loadCreatorProfile);