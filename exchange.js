const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// Base de datos en memoria
const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, balance REAL)");
  db.run("CREATE TABLE orders (id INTEGER PRIMARY KEY, user TEXT, type TEXT, amount REAL, price REAL)");
});

// Registro de usuario
app.post("/register", (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO users (name, balance) VALUES (?, ?)", [name, 100], function(err) {
    if (err) return res.json({ error: err.message });
    res.json({ status: "Usuario registrado", id: this.lastID });
  });
});

// Consultar balance
app.get("/balance/:user", (req, res) => {
  db.get("SELECT balance FROM users WHERE name = ?", [req.params.user], (err, row) => {
    if (row) res.json({ balance: row.balance });
    else res.json({ error: "Usuario no encontrado" });
  });
});

// Precios en tiempo real desde CoinGecko
app.get("/price/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: "No se pudo obtener el precio" });
  }
});

// Crear orden
app.post("/order", (req, res) => {
  const { user, type, amount, price } = req.body;
  db.run("INSERT INTO orders (user, type, amount, price) VALUES (?, ?, ?, ?)", 
    [user, type, amount, price], 
    function(err) {
      if (err) return res.json({ error: err.message });
      res.json({ status: "Orden registrada", id: this.lastID });
    });
});

// Libro de órdenes
app.get("/orders", (req, res) => {
  db.all("SELECT * FROM orders", (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// Interfaz principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Exchange corriendo en Render");
});
