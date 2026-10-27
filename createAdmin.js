const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./src/models/admin.model.js");
require("dotenv").config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await Admin.findOne({
      email: "admin@audiro.com",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("Admin@12345", 10);

    await Admin.create({
      username: "admin",
      email: "admin@audiro.com",
      password: hashedPassword,
    });

    console.log("Admin created successfully");

    process.exit();
  } catch (error) {
    console.log("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();