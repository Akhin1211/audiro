const {
  getUserWalletService,
  creditUserWalletService,
} = require("../services/wallet.service.js");

const getUserWallet = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const wallet = await getUserWalletService(userId);
    res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance,
        transactions: wallet.transactions || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const topupWallet = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive amount is required" });
    }
    const wallet = await creditUserWalletService(
      userId,
      Number(amount),
      `Wallet top-up of ₹${amount}`,
      "wallet_topup"
    );
    res.status(200).json({
      success: true,
      message: `₹${amount} added to wallet successfully`,
      wallet: {
        balance: wallet.balance,
        transactions: wallet.transactions || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserWallet,
  topupWallet,
};
