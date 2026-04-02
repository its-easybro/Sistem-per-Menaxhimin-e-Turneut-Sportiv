import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import sportRoutes from "./routes/sportRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";

const app = express();
const port = 3005;
app.use(cors());
app.use(express.json());

app.use("/sports", sportRoutes);
app.use("/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("U lidh me databazen me sukses!");
    client.release();
  } catch (err) {
    console.error("Lidhja deshtoi:", err.message);
  }
}

testConnection();
