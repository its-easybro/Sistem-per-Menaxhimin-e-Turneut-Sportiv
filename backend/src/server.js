import express from 'express'
import pool from './config/db.js';
const app = express();
const port = 3005;

app.use(express.json());

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
  } catch (err) {
    console.error('Lidhja deshtoi:', err.message);
  }
};

app.get('/sports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sports ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/sports', async (req, res) => {
  const { emertimi, pershkrimi, numri_lojtareve, lloji } = req.body;
  try{
    const result = await pool.query(
      `INSERT INTO sports (emertimi, pershkrimi, numri_lojtareve, lloji)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
       [emertimi, pershkrimi, numri_lojtareve, lloji]
    );
    res.status(201).json(result.rows[0]);
  }catch(err){
    res.status(500).json({ error: err.message });
  }

});

app.put('/sports/:id', async (req,res) => {
  const { id } = req.params;
  const { emertimi, pershkrimi, numri_lojatareve, lloji } = req.body;

  try{
    const result = await pool.query(
      `UPDATE sports
       SET emertimi = $1, pershkrimi = $2, numri_lojtareve = $3, lloji = $4
       WHERE id = $5
       RETURNING *`,
       [emertimi, pershkrimi, numri_lojatareve, lloji, id]
    );
    if(result.rows.length === 0){
      res.status(404).json({ error: 'Sporti nuk u gjet' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/sports/:id', async (req,res) => {
  const { id } = req.params;
  
  try{
    const result = await pool.query(
      `DELETE FROM sports
       WHERE id = $1
       RETURNING *`,
       [id]
    );
    if(result.rows.length === 0){
      res.status(404).json({error: 'Sporti nuk u gjet' });
    }
    res.json({message: 'Sporti u fshi me sukses', deleted: result.rows[0] });
  }catch(err){
    res.status(500).json({ error: err.message });
  }
});

testConnection();