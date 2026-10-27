const Wallet = require("../models/wallet.model.js");

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0, transactions: [] });
  }
  return wallet;
};

const creditBalance = async (userId, amount, description, source = "admin_adjustment", orderId = "") => {
  const numericAmount = Math.max(0, Number(amount));
  let wallet = await getOrCreateWallet(userId);

  wallet.balance += numericAmount;
  wallet.transactions.unshift({
    type: "credit",
    amount: numericAmount,
    description: description || `Credited ₹${numericAmount} to wallet`,
    source,
    orderId,
  });

  await wallet.save();
  return wallet;
};

const deductBalance = async (userId, amount, description, orderId = "") => {
  const numericAmount = Math.max(0, Number(amount));
  let wallet = await getOrCreateWallet(userId);

  if (wallet.balance < numericAmount) {
    throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}, Required: ₹${numericAmount}`);
  }

  wallet.balance -= numericAmount;
  wallet.transactions.unshift({
    type: "debit",
    amount: numericAmount,
    description: description || `Debited ₹${numericAmount} from wallet`,
    source: "order_payment",
    orderId,
  });

  await wallet.save();
  return wallet;
};

module.exports = {
  getOrCreateWallet,
  creditBalance,
  deductBalance,
};
