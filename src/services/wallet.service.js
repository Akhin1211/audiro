const {
  getOrCreateWallet,
  creditBalance,
  deductBalance,
} = require("../repositories/wallet.repository.js");

const getUserWalletService = async (userId) => {
  return await getOrCreateWallet(userId);
};

const creditUserWalletService = async (userId, amount, description, source, orderId) => {
  return await creditBalance(userId, amount, description, source, orderId);
};

const debitUserWalletService = async (userId, amount, description, orderId) => {
  return await deductBalance(userId, amount, description, orderId);
};

module.exports = {
  getUserWalletService,
  creditUserWalletService,
  debitUserWalletService,
};
