require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// --- 1. MIDDLEWARE SETUP ---
app.use(cors());          // Allows your React frontend to talk to this server
app.use(express.json());  // Parses incoming JSON data bodies into req.body

// --- 2. DATABASE CONNECTION ---
mongoose.connect(
    process.env.MONGO_URI
)
.then(() => console.log("MongoDB Connected Successfully!"))
.catch((err) => console.error("Database connection error:", err));

// --- 3. MONGOOSE SCHEMA & MODEL ---
const Expense = mongoose.model(
    "Expense",
    {
        description: String,
        amount: Number,      
        category: String,    
        date: { 
            type: Date, 
            default: Date.now 
        }
    }
);

// --- 4. API ENDPOINT ROUTES ---

// Health Check
app.get("/", (req, res) => {
    res.send("Expense Tracker API Running");
});

// READ (GET ALL): Fetch all records from database sorted by newest first
app.get("/expenses", async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

// CREATE (POST): Add a brand new expense record
app.post("/expenses", async (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        
        const newExpense = await Expense.create({
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

// UPDATE (PUT): Edit an existing expense by its unique ID
app.put("/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, category, date } = req.body;

        const updatedExpense = await Expense.findByIdAndUpdate(
            id,
            {
                description,
                amount: Number(amount),
                category,
                date: date ? new Date(date) : undefined
            },
            { new: true } // Returns the modified document instead of the old one
        );

        if (!updatedExpense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ error: "Failed to update expense" });
    }
});

// DELETE (DELETE): Remove a record permanently by ID
app.delete("/expenses/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Expense.findByIdAndDelete(id);
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