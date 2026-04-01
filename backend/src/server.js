import express from 'express'
import pool from './config/db.js';
const app = express();
const port = 3005;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('U lidh me databazen me sukses!');
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Lidhja deshtoi:', err.message);
    process.exit(1);
  }
}

testConnection();