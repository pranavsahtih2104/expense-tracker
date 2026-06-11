import React, { useState, useEffect } from "react";

export default function ExpenseTracker() {
  const BASE_URL = "https://expense-tracker-bhth.onrender.com";

  // --- 1. CORE COMPONENT STATE HOOKS ---
  const [allExpenses, setAllExpenses] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All");
  // --- AUTH STATES ---
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("username") || "");

  // Controlled input hooks for tracking form interactions mid-flight
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Food");
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);

  // --- 2. ASYNC NETWORK CALL PIPELINES ---

  // Trigger initial lifecycle query to sync state array on component bootup
  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

// Handle User Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Registration successful! Please log in.");
        setIsRegistering(false);
        setPasswordInput("");
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  // Handle User Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        setToken(data.token);
        setCurrentUser(data.username);
        setUsernameInput("");
        setPasswordInput("");
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken("");
    setCurrentUser("");
    setAllExpenses([]);
  };

  // GET: Fetch user-specific expenses
  const fetchExpenses = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/expenses`, {
        headers: { "Authorization": `Bearer ${token}` } // 👈 Hand over token
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllExpenses(data);
      }
    } catch (err) {
      console.error("Error syncing data with backend:", err);
    }
  };

  // POST: Add new entry element
  const addExpense = async () => {
    if (!nameInput.trim() || !amountInput) {
      alert("Please enter a name and amount!");
      return;
    }

    try {
      await fetch(`${BASE_URL}/expenses`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // 👈 Hand over token
        },
        body: JSON.stringify({
          description: nameInput,
          amount: parseFloat(amountInput),
          category: categoryInput,
          date: dateInput,
        }),
      });

      setNameInput("");
      setAmountInput("");
      fetchExpenses();
    } catch (err) {
      console.error("Failed to add record:", err);
    }
  };

  // PUT: Modify values on targeted index row object
  const editExpense = async (id) => {
    const item = allExpenses.find((e) => e._id === id);
    if (!item) return;

    const newDesc = prompt("Edit Expense Name:", item.description);
    if (newDesc === null) return;

    const newAmount = prompt("Edit Amount:", item.amount);
    if (newAmount === null) return;

    const newCategory = prompt("Edit Category (Food, Transport, Entertainment, Rent):", item.category);
    if (newCategory === null) return;

    try {
      await fetch(`${BASE_URL}/expenses/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // 👈 Added Token Entry
        },
        body: JSON.stringify({
          description: newDesc,
          amount: parseFloat(newAmount) || item.amount,
          category: newCategory || item.category,
        }),
      });

      fetchExpenses();
    } catch (err) {
      console.error("Failed to edit entry:", err);
    }
  };

  // DELETE: Erase document record
  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    try {
      await fetch(`${BASE_URL}/expenses/${id}`, { 
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}` // 👈 Added Token Entry
        }
      });
      fetchExpenses();
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  // --- 3. DYNAMIC UI ARRANGEMENT MATRICES ---
  
  // Sift entries locally based on selected filter state dropdown option
  const displayedExpenses = filterCategory === "All"
    ? allExpenses
    : allExpenses.filter((item) => item.category === filterCategory);

  // Accumulate financial expenditures on the currently filtered slice
  const grandTotal = displayedExpenses.reduce((sum, item) => sum + item.amount, 0);


  // --- 4. COMPONENT VISUAL JSX LAYOUT ---
  // --- 4. COMPONENT VISUAL JSX LAYOUT ---
  
  // Conditionally render the Auth Gate if the user is not logged in
  if (!token) {
    return (
      <div className="container mt-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
        <div className="card p-4 text-white" style={{ width: "400px", backgroundColor: "#111", borderRadius: "8px", border: "1px solid #333" }}>
          <h2 className="text-center mb-4 fw-bold">{isRegistering ? "Create Account" : "Sign In"}</h2>
          
          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            <div className="mb-3">
              <label className="form-label text-secondary">Username</label>
              <input 
                type="text" 
                className="form-control bg-dark text-white border-secondary" 
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)} 
                required 
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label text-secondary">Password</label>
              <input 
                type="password" 
                className="form-control bg-dark text-white border-secondary" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-success w-100 fw-bold">
              {isRegistering ? "Register Account" : "Login"}
            </button>
          </form>
          
          <div className="text-center mt-3">
            <button className="btn btn-link btn-sm text-decoration-none text-success" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the core dashboard once authorized
  return (
    <div className="container mt-5" style={{ maxWidth: "950px", backgroundColor: "black", minHeight: "100vh", padding: "30px", borderRadius: "8px" }}>
      
      {/* Top Welcome Bar & Logout Action */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary">
        <h1 className="fw-bold text-white mb-0" style={{ fontSize: "36px" }}>
          Expense Tracker
        </h1>
        <div className="text-white d-flex align-items-center gap-3">
          <span>Welcome, <strong className="text-success">{currentUser}</strong></span>
          <button className="btn btn-outline-danger btn-sm fw-medium" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Entry Generation Header Control Grid */}
      <div className="row g-2 mb-4 align-items-center">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Expense Name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            placeholder="Amount"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </div>

        <div className="col-md-2">
          <select
            className="form-select"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
          >
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Rent">Rent</option>
          </select>
        </div>

        <div className="col-md-2">
          <input
            type="date"
            className="form-control"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>

        <div className="col-md-2">
          <button 
            className="btn btn-success w-100 fw-medium" 
            style={{ backgroundColor: "#198754" }}
            onClick={addExpense}
          >
            Add Expense
          </button>
        </div>
      </div>

      {/* Structural Data Table Component */}
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead>
            <tr>
              <th style={{ width: "25%", backgroundColor: "#f8f9fa", color: "black", fontWeight: 600 }}>Expense Name</th>
              <th style={{ width: "15%", backgroundColor: "#f8f9fa", color: "black", fontWeight: 600 }}>Amount</th>
              <th style={{ width: "20%", backgroundColor: "#f8f9fa", color: "black", fontWeight: 600 }}>Category</th>
              <th style={{ width: "20%", backgroundColor: "#f8f9fa", color: "black", fontWeight: 600 }}>Date</th>
              <th style={{ width: "20%", backgroundColor: "#f8f9fa", color: "black", fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedExpenses.map((item) => {
              // Format ISO date structure safely for table rows
              const cleanDate = item.date ? item.date.split("T")[0] : "N/A";
              
              return (
                <tr key={item._id} className="text-white">
                  <td>{item.description}</td>
                  <td className="fw-medium">${item.amount.toFixed(2)}</td>
                  <td>{item.category}</td>
                  <td>{cleanDate}</td>
                  <td>
                    <button 
                      className="btn-action me-1" 
                      style={{ border: "1px solid #767676", backgroundColor: "#efefef", color: "black", padding: "1px 8px", fontSize: "14px", borderRadius: "3px" }}
                      onClick={() => editExpense(item._id)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-action" 
                      style={{ border: "1px solid #767676", backgroundColor: "#efefef", color: "black", padding: "1px 8px", fontSize: "14px", borderRadius: "3px" }}
                      onClick={() => deleteExpense(item._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Tally and Selection Control Box */}
      <div className="d-flex flex-column align-items-end mt-3 text-white">
        <h4 className="fw-bold mb-2" style={{ fontSize: "22px" }}>
          Total: ${grandTotal.toFixed(2)}
        </h4>
        
        <div className="d-flex align-items-center gap-2">
          <label className="text-nowrap fw-medium" style={{ fontSize: "16px", color: "#e5e5e5" }}>
            Filter by Category:
          </label>
          <select 
            className="form-select" 
            style={{ width: "150px" }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Rent">Rent</option>
          </select>
        </div>
      </div>

    </div>
  );
}