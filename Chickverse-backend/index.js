const express = require('express');
const cors = require('cors');
const { Alchemy, Network } = require('alchemy-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage for simplicity
const userData = {};

// XP values per quest
const questXP = {
  discord: 10,
  pixelX: 10,
  chickverseX: 10,
  pixelNFT: 20,
  chickverseNFT: 20,
  referral: 50,
};

// Alchemy setup
const config = {
  apiKey: 'rGawAB-Ti4jh0nvf1Gk7a',
  network: Network.MATIC_MAINNET
};

const alchemy = new Alchemy(config);

// Register wallet
app.post('/connect', (req, res) => {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  if (!userData[wallet]) {
    userData[wallet] = {
      xp: 0,
      questsCompleted: {},
      referredBy: null,
      referrals: []
    };
  }

  res.json({ success: true });
});

// Return user data
app.get('/user-data', (req, res) => {
  const { wallet } = req.query;

  if (!wallet || !userData[wallet]) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(userData[wallet]);
});

// Complete simple social quest
app.post('/complete-quest', (req, res) => {
  const { wallet, questKey } = req.body;

  if (!wallet || !questKey) {
    return res.status(400).json({ error: 'Wallet and questKey are required' });
  }

  const user = userData[wallet];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.questsCompleted[questKey]) {
    user.questsCompleted[questKey] = true;
    user.xp += questXP[questKey] || 0;
  }

  res.json({ success: true, xp: user.xp });
});

// ✅ FIXED: Verify NFT ownership quest
app.post('/verify-nft', async (req, res) => {
  const { wallet, questKey } = req.body;

  if (!wallet || !questKey) {
    return res.status(400).json({ success: false, message: 'Missing wallet or questKey' });
  }

  const user = userData[wallet];
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const contracts = {
    pixelNFT: '0x254acc869b7025612381c36ebcbebc2df36475eb',
    chickverseNFT: '0xffb315884c322e2f0eab1d474b2fa0eebc2cce57',
  };

  const contractAddress = contracts[questKey];
  if (!contractAddress) return res.status(400).json({ success: false, message: 'Invalid questKey' });

  try {
    const nfts = await alchemy.nft.getNftsForOwner(wallet, {
      contractAddresses: [contractAddress]
    });

    const owns = nfts.ownedNfts.some(nft =>
      nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );

    if (!owns) {
      return res.json({ success: false, message: 'NFT not found in wallet' });
    }

    if (!user.questsCompleted[questKey]) {
      user.questsCompleted[questKey] = true;
      user.xp += questXP[questKey] || 0;
    }

    return res.json({ success: true, xp: user.xp });
  } catch (err) {
    console.error('NFT verification error:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// 🔁 Referral submission
app.post('/api/refer', (req, res) => {
  const { referrer, referee } = req.body;

  if (!referrer || !referee || referrer === referee) {
    return res.status(400).json({ success: false, message: 'Invalid referral data' });
  }

  const referrerUser = userData[referrer];
  const refereeUser = userData[referee];

  if (!referrerUser || !refereeUser) {
    return res.status(404).json({ success: false, message: 'Referrer or referee not registered' });
  }

  if (refereeUser.referredBy) {
    return res.status(400).json({ success: false, message: 'User already referred' });
  }

  refereeUser.referredBy = referrer;
  referrerUser.referrals.push(referee);
  referrerUser.xp += questXP['referral'];

  return res.json({ success: true });
});

// 🧮 Referral stats endpoint
app.get('/api/referral-stats', (req, res) => {
  const { wallet } = req.query;

  const user = userData[wallet];
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const totalReferred = user.referrals.length;
  const referralXP = totalReferred * questXP['referral'];
  const rankBoost = totalReferred * 2; // Optional boost metric

  res.json({ totalReferred, referralXP, rankBoost });
});

// Debug route
app.get('/all-users', (req, res) => {
  res.json(userData);
});

app.get('/', (req, res) => {
  res.send('Backend is working!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
