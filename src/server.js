require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs"); // 👈 Added for encryption
const jwt = require("jsonwebtoken");   // 👈 Added for secure tokens

const app = express();

// --- 1. MIDDLEWARE SETUP ---
app.use(cors());          
app.use(express.json());  

// --- 2. DATABASE CONNECTION ---
mongoose.connect(
    process.env.MONGO_URI
)
.then(() => console.log("MongoDB Connected Successfully!"))
.catch((err) => console.error("Database connection error:", err));

// --- 3. MONGOOSE SCHEMAS & MODELS ---

// Updated User Schema & Model assignment (No module.exports)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Updated Expense Model: Now includes user reference ID mapping
const Expense = mongoose.model(
    "Expense",
    {
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        }, // 👈 Links expenses to specific accounts
        description: String,
        amount: Number,      
        category: String,    
        date: { 
            type: Date, 
            default: Date.now 
        }
    }
);

// ==========================================
// AUTHENTICATION MIDDLEWARE GATEKEEPER
// ==========================================
const authMiddleware = (req, res, next) => {
  // 1. Grab the token from the HTTP Authorization header
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Format is usually: "Bearer TOKEN_STRING"
  
  // 2. If there is no token, deny entry instantly
  if (!token) {
    return res.status(401).json({ error: "Access denied. No authentication token provided." });
  }

  try {
    // 3. Verify the token using your secret key signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Attach the decoded user payload ({ userId: "..." }) directly to the request object
    req.user = decoded; 
    
    // 5. Pass control to the actual route handler down below
    next(); 
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token. Authorization denied." });
  }
};


// --- 4. API ENDPOINT ROUTES ---

// Health Check
app.get("/", (req, res) => {
    res.send("Expense Tracker API Running");
});

// ==========================================
// NEW AUTHENTICATION PORTALS
// ==========================================

// SIGNUP ROUTE: Encrpyts password and registers user account
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Please provide both username and password" });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

// LOGIN ROUTE: Validates credentials and passes back signed JWT
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Sign the token with user ID (Expires in 1 day)
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful!",
      token: token,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// ==========================================
// CORE EXPENSE CRUD OPERATIONS
// ==========================================

// READ (GET ALL): Fetch all records from database sorted by newest first
// app.get("/expenses", async (req, res) => {
//     try {
//         const expenses = await Expense.find().sort({ date: -1 });
//         res.json(expenses);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch expenses" });
//     }
// });

// // CREATE (POST): Add a brand new expense record
// app.post("/expenses", async (req, res) => {
//     try {
//         const { description, amount, category, date } = req.body;
        
//         const newExpense = await Expense.create({
//             description: description,
//             amount: Number(amount), 
//             category: category,
//             date: date ? new Date(date) : undefined
//         });
        
//         res.status(201).json(newExpense);
//     } catch (err) {
//         res.status(400).json({ error: "Failed to add expense" });
//     }
// });

// // UPDATE (PUT): Edit an existing expense by its unique ID
// app.put("/expenses/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { description, amount, category, date } = req.body;

//         const updatedExpense = await Expense.findByIdAndUpdate(
//             id,
//             {
//                 description,
//                 amount: Number(amount),
//                 category,
//                 date: date ? new Date(date) : undefined
//             },
//             { new: true } 
//         );

//         if (!updatedExpense) {
//             return res.status(404).json({ error: "Expense not found" });
//         }
        
//         res.json(updatedExpense);
//     } catch (err) {
//         res.status(400).json({ error: "Failed to update expense" });
//     }
// });

// // DELETE (DELETE): Remove a record permanently by ID
// app.delete("/expenses/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await Expense.findByIdAndDelete(id);
//         res.json({ message: "Expense deleted successfully" });
//     } catch (err) {
//         res.status(500).json({ error: "Failed to delete expense" });
//     }
// });

// ==========================================
// CORE EXPENSE CRUD OPERATIONS (PROTECTED)
// ==========================================

// READ (GET ALL): Fetch records belonging ONLY to the logged-in user
app.get("/expenses", authMiddleware, async (req, res) => {
    try {
        // req.user.userId comes straight out of the verified token!
        const expenses = await Expense.find({ user: req.user.userId }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

// CREATE (POST): Add a brand new expense record tied to this user account
app.post("/expenses", authMiddleware, async (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        
        const newExpense = await Expense.create({
            user: req.user.userId, // 👈 Explicitly stamp this expense with the creator's ID
            description: description,
            amount: Number(amount), 
            category: category,
            date: date ? new Date(date) : undefined
        });
        
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(400).json({ error: "Failed to add expense" });
    }
});

// UPDATE (PUT): Edit an existing expense, ensuring it belongs to this user
app.put("/expenses/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, category, date } = req.body;

        // Find the expense AND make sure it belongs to the logged-in user before updating
        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: id, user: req.user.userId }, 
            {
                description,
                amount: Number(amount),
                category,
                date: date ? new Date(date) : undefined
            },
            { new: true } 
        );

        if (!updatedExpense) {
            return res.status(404).json({ error: "Expense not found or unauthorized" });
        }
        
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ error: "Failed to update expense" });
    }
});

// DELETE (DELETE): Remove a record permanently, ensuring ownership
app.delete("/expenses/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure the expense belongs to the user before wiping it
        const deletedExpense = await Expense.findOneAndDelete({ _id: id, user: req.user.userId });
        
        if (!deletedExpense) {
            return res.status(404).json({ error: "Expense not found or unauthorized" });
        }

        res.json({ message: "Expense deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete expense" });
    }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});