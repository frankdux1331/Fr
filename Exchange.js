const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());

// Base de datos en memoria
const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, balance REAL)");
  db.run("CREATE TABLE orders (id INTEGER PRIMARY KEY, user TEXT, type TEXT, amount REAL, price REAL)");
});

// Funciones
function registerUser(name) {
  db.run("INSERT INTO users (name, balance) VALUES (?, ?)", [name, 100]);
}

function placeOrder(user, type, amount, price) {
  db.run("INSERT INTO orders (user, type, amount, price) VALUES (?, ?, ?, ?)", [user, type, amount, price]);
  matchOrders();
}

function matchOrders() {
  db.all("SELECT * FROM orders ORDER BY price ASC", (err, orders) => {
    if (orders.length > 1) {
      const buy = orders.find(o => o.type === "buy");
      const sell = orders.find(o => o.type === "sell");
      if (buy && sell && buy.price >= sell.price) {
        const amount = Math.min(buy.amount, sell.amount);
        console.log(`Match: ${buy.user} compra ${amount} de ${sell.user} a ${sell.price}`);
        db.run("UPDATE users SET balance = balance - ? WHERE name = ?", [amount * sell.price, buy.user]);
        db.run("UPDATE users SET balance = balance + ? WHERE name = ?", [amount * sell.price, sell.user]);
        db.run("DELETE FROM orders WHERE id = ?", [buy.id]);
        db.run("DELETE FROM orders WHERE id = ?", [sell.id]);
      }
    }
  });
}

// Rutas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/balance/:user", (req, res) => {
  db.get("SELECT balance FROM users WHERE name = ?", [req.params.user], (err, row) => {
    if (row) res.json({ balance: row.balance });
    else res.json({ error: "Usuario no encontrado" });
  });
});

app.post("/order", (req, res) => {
  const { user, type, amount, price } = req.body;
  placeOrder(user, type, amount, price);
  res.json({ status: "Orden registrada" });
});

// Puerto dinámico para Render
app.listen(process.env.PORT || 3000, () => {
  console.log("Exchange corriendo en Render");
});
