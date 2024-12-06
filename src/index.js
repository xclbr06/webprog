// Import Dependencies
const collection = require("./config"); // Database Config = handling user data
const express = require("express"); // Express framework = building server
const session = require("express-session"); // User Session Middleware
const multer = require("multer"); // File Upload Middleware
const fs = require("fs"); // File System Node.js module
const path = require("path"); // File and Directory paths Node.js module

// Initialize
const app = express(); // instance of express application

// Middleware
app.set("view engine", "ejs"); // Set EJS as the template engine for rendering views.
app.use(express.json()); // Enable JSON parsing for incoming requests.
app.use(express.urlencoded({ extended: false })); // Enable parsing of URL-encoded data.
app.use("/upload", express.static("upload")); // Serve static files from the 'upload' directory.
app.use(express.static("src")); // Serve static files from the 'src' directory.

// Session
app.use(
  session({
    secret: "jk-secret", // Secret key for encrypting the session.
    resave: true, // Save the session even if it wasn't modified.
    saveUninitialized: true, // Save new sessions even if they are uninitialized.
  })
);

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./upload/"); // Define the folder where uploaded files will be saved.
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate a unique filename using the current timestamp and file extension.
  },
});

// Multer File Upload Congfiguration with 5 MB Limit
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Routes

// Render Login Page
app.get("/", (req, res) => {
  res.render("login");  // Ensure this page exists
});

// Render Signup Page
app.get("/signup", (req, res) => {
  res.render("signup"); // Ensure this page exists
});

// Login Logic
app.post("/login", async (req, res) => {
  try {
    const data = await collection.findOne({ userName: req.body.username }); // Find user by username in the database.
    if (!data) {
      return res.render("login", { error: "Username cannot be found." }); 
    }

    const isMatchPassword = data.password === req.body.password
    if(isMatchPassword) {
        req.session.userName = data.userName;
        req.session.user = data; 
        return res.redirect("/home");
    }
      else{
            return res.render("login", {
            error: "Incorrect password. Please try again.",
});
}
    }
    catch{
    res.send("Wrong Details"); 
    }

});

//Sign Up Logic
app.post("/signup", async (req, res) => {
  const data = {
    firstName: req.body.firstName,
    midName: req.body.midName,
    lastName: req.body.lastName,
    userName: req.body.userName,
    password: req.body.password.trim(), 
    email: req.body.email,
    birth: req.body.birth,
    confirmP: req.body.confirmP.trim() 
  };

  const existingUser = await collection.findOne({ userName: data.userName });
  const existingEmail = await collection.findOne({ email: data.email });

  // Regular expression for password validation
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!-_@#$%^&*(),.?":{}|<>])[A-Za-z\d!-_@#$%^&*(),.?":{}|<>]{8,}$/;
  let errors = [];

  // Validate required fields
  if (!data.firstName) {
    errors.firstName = "First Name is Required";
  }
  if (!data.lastName) {
    errors.lastName = "Last Name is Required";
  }

  if (!data.email) {
    errors.email = "Email is required.";
  } else if (existingEmail) {
    errors.email = "Email already in use.";
  }

  if (!data.userName) {
    errors.userName = "Username is required.";
  } else if (existingUser) {
    errors.userName = "Username already taken.";
  }

  // Password validation: ensure password is at least 8 characters long
  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters long.";
  } else if (!regex.test(data.password)) {
    errors.password =
      "Password must include at least one lowercase letter, one uppercase letter, one number, and one symbol.";
  }

  // Confirm Password validation
  if (!data.confirmP) {
    errors.confirmP = "Please confirm your password.";
  } else if (data.password !== data.confirmP) {
    errors.confirmP = "Passwords do not match.";
  }

  if (!data.birth) {
    errors.birth = "Date of Birth is Required";
  }

  if (Object.keys(errors).length > 0) {
    return res.render("signup", { errors, data });  // Pass errors and data back to the view
  }

  try {
    const userdata = await collection.insertMany(data); 
    return res.render("signup", {
      successMessage: "Sign up successful! Redirecting to homepage...",
      data: {},
    });

  } catch (err) {
    console.error(err);
    return res.status(500).render("signup", { errorMessage: "An error occurred. Please try again later." });
  }
});

// Homepage
// Home route
app.get("/home", (req, res) => {
  
  if (!req.session.user) {    //Checks if the user is in session
    return res.redirect("/");
  }
  if (req.session.visited) {  //Checks if the user is in session (For Welcome Back)
    req.session.visited += 1; 
  } else {
    req.session.visited = 1;
  }
  
  const user = req.session.user;
  const returningUser = req.session.visited > 1;
  const welcomeMsg = returningUser  ? "Welcome back, " : "Welcome, "

  let profilePicPath;
if (user.profilePic && user.profilePic.fileName) {
  profilePicPath = path.join("/upload", user.profilePic.fileName); // Path to the uploaded profile picture
} else {
  profilePicPath = "image/default-profile.svg"; 
}

  res.render("home", {          //Gets the info from user Session to use in homepage
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.userName,
    files: user.files,
    welcomeMsg,
    profilePicPath
  });
});

//Upload Route
app.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    const defaultProfilePic = "image/default-profile.svg";
    const user = req.session.user;

    // Validate session user
    if (!user) {
      return res.status(500).send("User session not initialized.");
    }

    const welcomeMsg = req.session.visited > 1 ? "Welcome back, " : "Welcome, ";

    // Handle Multer errors
    if (err instanceof multer.MulterError) {
      let errorMessage =
        err.code === "LIMIT_FILE_SIZE"
          ? "File size exceeds 5MB limit. Please try again."
          : "A Multer error occurred. Please try again.";

      return res.render("home", {
        error: errorMessage,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.userName,
        files: user.files || [],
        welcomeMsg,
        profilePicPath: user.profilePic && user.profilePic.filename
          ? path.join("/upload", user.profilePic.filename)
          : defaultProfilePic,
      });
    }

    // Handle unknown errors during file upload
    if (err) {
      console.error("Unknown error during upload:", err);
      return res.render("home", {
        error: "An unknown error occurred during file upload. Please try again.",
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.userName,
        files: user.files || [],
        welcomeMsg,
        profilePicPath: user.profilePic && user.profilePic.filename
          ? path.join("/upload", user.profilePic.filename)
          : defaultProfilePic,
      });
    }

    // Proceed with file processing if no errors
    try {
      if (!req.file) {
        return res.render("home", {
          error: "No file uploaded. Please try again.",
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.userName,
          files: user.files || [],
          welcomeMsg,
          profilePicPath: user.profilePic && user.profilePic.filename
            ? path.join("/upload", user.profilePic.filename)
            : defaultProfilePic,
        });
      }

      const fileData = {
        fileName: req.file.filename,
        origName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      const dbUser = await collection.findOne({ userName: user.userName });

      if (!dbUser) {
        return res.status(404).send("User not found.");
      }

      // Update user files
      dbUser.files.push(fileData);
      await dbUser.save();
      req.session.user.files = dbUser.files;

      console.log("File uploaded and user document updated:", dbUser);

      // Redirect to home after successful upload
      return res.redirect("/home");
    } catch (error) {
      console.error("Error during file processing or database operation:", error);
      return res.render("home", {
        error: "An error occurred while processing your file. Please try again.",
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.userName,
        files: user.files || [],
        welcomeMsg,
        profilePicPath: user.profilePic && user.profilePic.filename
          ? path.join("/upload", user.profilePic.filename)
          : defaultProfilePic,
      });
    }
  });
});

//Download route
app.get("/download/:fileName", async (req, res) => {
  const { fileName  } = req.params;
  const filePath = path.join(__dirname, "../upload", fileName);
  console.log("pspdas" + fileName)
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error(err); // Log the error for debugging
      res.status(404).send("File not found.");
      console.log(filePath);
    }
  });
});

app.post("/delete/:filename", async (req, res) => {
  const fileName = req.params.filename;

  try {
    //Assuming user is stored in session
    const user = await collection.findOne({
      userName: req.session.user.userName,
    });

    //Check if the user exists
    if (!user) {
      return res.status(404).send("User  not found.");
    }

    //Check for matching index
    const fileIndex = user.files.findIndex(
      (file) => file.fileName === fileName
    );

    //If file doesn't exist in the user's files array
    if (fileIndex === -1) {
      console.log(fileIndex)
      return res.status(404).send("File not found in user's files.");
    }

    //Remove the file from the user's files array
    user.files.splice(fileIndex, 1);

    //Saves
    await user.save();
    console.log(`User  files updated successfully. Removed file: ${fileName}`); //Logging
    req.session.user.files = user.files;

    const filePath = path.join(__dirname, "../upload", fileName);
    console.log(`Attempting to delete file: ${filePath}`); //Logging

    //Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file at ${filePath}:`, err);
          return res.status(500).send("Error deleting file.");
        }
        res.redirect("/home");
      });
    } else {
      console.error(`File does not exist at ${filePath}`);
      return res.status(404).send("File not found.");
    }
  } catch (err) {
    console.error(err); 
    res.status(500).send("Server error.");
  }
});

// Profile route
app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/"); // Redirect to home if user is not logged in
  }

  const user = req.session.user; // Get the user from the session
  let profilePicPath;

  //Check if the user has uploaded a profile picture
  if (user.profilePic && user.profilePic.fileName) {
    profilePicPath = path.join("/upload", user.profilePic.fileName); // Use the correct path for the uploaded picture
  } else {
    profilePicPath = "image/default-profile.svg"; // Default profile picture if none is uploaded
  }

  res.render("profile", { user: { ...user, profilePicPath } });
});

//upload profile pic
app.post(
  "/upload-profile-picture",
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const userId = req.session.user._id;
      const fileData = {
        fileName: req.file.filename,
        origName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      //Update the user's profile picture in the database
      await collection.updateOne(
        { _id: userId },
        { $set: { profilePic: fileData } }
      );

      //Update the session data
      req.session.user.profilePic = fileData;
      return res.redirect("/profile"); // Redirect back to profile after upload
    } catch (error) {
      console.error(error);
      return res.status(500).send("Error uploading profile picture.");
    }
  }
);

//update profile
app.post("/update-profile", async (req, res) => {
  if (!req.session.user || !req.session.user._id) {
    return res.status(401).send("User is not logged in or session expired.");
  }

  try {
    const { userName, email, sex } = req.body;
    const userId = req.session.user._id;

    await collection.updateOne(
      { _id: userId },
      { $set: { userName, email, sex } }
    );

    req.session.user.userName = userName;
    req.session.user.email = email;
    req.session.user.sex = sex;

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating profile");
  }
});

// Run Server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on Port: ${port}`);
});

