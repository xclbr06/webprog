const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb://localhost:27017/login");

//Initialize Database
connect
  .then(() => {
    console.log("Database connected successfully");
  })git add .
  .catch(() => {
    console.log("Database cannot be connected");
  });
  const LoginSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    midName: {
        type: String,
        required: false,
    },
    lastName: {
            type: String,
            required: true,
    },
    userName: {
        type: String,
        required: true,
        unique: true,
    }, 
        password: {
        type: String,
        required: true,
    },
        email: {
        type: String,
        required: true,
    },
        birth: {
            type: Date,
            required: true,
        },
        files: [
            {
                fileName: String,
                origName: String,
                mimeType: String,
                size: Number,
            },
        ],
        profilePic: {
            fileName: String,
            origName: String,
            mimeType: String,
            size: Number,
        },
        sex: {
            type: String,
            required: false,
        }
  })

  const collection = new mongoose.model("users", LoginSchema);
  module.exports = collection;
