const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: 8,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
  type: Date,
  default: null,
},

gender: {
  type: String,
  enum: ["Male", "Female", "Other", ""],
  default: "",
},

country: {
  type: String,
  default: "India",
},

    profileImage: {
      type: String,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      default: "",
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    resetPasswordToken: {
      type: String,
      default: "",
    },

    resetPasswordTokenExpiresAt: {
      type: Date,
      default: null,
    },

    pendingEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    addresses: [
  {
    name: { 
      type: String,
       required: true 
      },
    phone: { 
      type: String, 
      required: true
     },
    addressLine: {
       type: String,
        required: true
       },
    addressLine2: { 
      type: String, 
      default: "" 
    },
    city: {
       type: String,
        required: true 
      },
    state: { 
      type: String,
       required: true
       },
    pincode: { 
      type: String,
       required: true
       },
    
    addressLabel: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },
    isDefault: { type: Boolean, default: false },
  },
],

    profile: {
      firstName: {
        type: String,
        trim: true,
      },

      lastName: {
        type: String,
        trim: true,
      },
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);