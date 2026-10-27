const dotenv = require("dotenv");

dotenv.config();

// Validate critical backend environment variables at startup
const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `[Startup Error] Missing required environment variable(s): ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

const app = require("./app.js");
const connectDB = require("./config/database.js");

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });