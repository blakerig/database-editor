const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Render / EC2 testing
  connectionTimeoutMillis: 5000
});

app.use(bodyParser.urlencoded({ extended: true }));


// CSS styles (reuse for destinations)
const styles = `...`; // keep your existing CSS
const autoExpandScript = `...`; // keep your existing JS for auto-expand


// ---------------- RESTAURANTS ROUTES ---------------- //
// ... keep existing restaurants routes ...


// ---------------- DESTINATIONS ROUTES ---------------- //


// List all destinations
app.get('/destinations', async (req, res) => {
const result = await pool.query('SELECT id, name, capital, category FROM destinations ORDER BY name');
let html = `${styles}<h1>Destinations</h1><table><tr><th>Name</th><th>Capital</th><th>Category</th><th>Edit</th></tr>`;
result.rows.forEach(d => {
html += `<tr><td>${d.name}</td><td>${d.capital || ''}</td><td>${d.category || ''}</td><td><a href="/destination?id=${d.id}">Edit</a></td></tr>`;
});
html += '</table><br><a href="/destination">Add New Destination</a>';
res.send(html);
});


// Add/Edit destination form
app.get('/destination', async (req, res) => {
const id = req.query.id;
let destination = {};


if (id) {
const result = await pool.query('SELECT * FROM destinations WHERE id=$1', [id]);
if (result.rows.length) {
destination = result.rows[0];
}
}


res.send(`${styles}
<form method="POST" action="/destination${id ? '?id=' + id : ''}">
${id ? `<input type="hidden" name="id" value="${destination.id}">` : ''}
<label>Name: <input type="text" name="name" value="${destination.name || ''}" required></label>
<label>Flag ID: <input type="text" name="flag" value="${destination.flag || ''}"></label>
<label>Main Image ID: <input type="text" name="main_image" value="${destination.main_image || ''}"></label>
<label>Currency: <input type="text" name="currency" value="${destination.currency || ''}"></label>
<label>Official Languages: <input type="text" name="official_languages" value="${destination.official_languages || ''}"></label>
<label>Timezone: <input type="text" name="timezone" value="${destination.timezone || ''}"></label>
<label>Capital: <input type="text" name="capital" value="${destination.capital || ''}"></label>
<label>Category: <input type="text" name="category" value="${destination.category || ''}"></label>
<label>Description: <textarea name="description">${destination.description || ''}</textarea></label>
<label>Status: <input type="text" name="status" value="${destination.status || ''}"></label>
<label>Sections: <input type="text" name="sections" value="${destination.sections || ''}"></label>
<button type="submit">${id ? 'Update' : 'Add'} Destination</button>
</form>
<br><a href="/destinations">Back to List</a>
${autoExpandScript}
`);
});


// Handle form submission for destinations
app.post('/destination', async (req, res) => {
let { id, name, flag, main_image, currency, official_languages, timezone, capital, category, description, status, sections } = req.body;


// Generate new ID if adding (use UUID for simplicity) if your table allows integer IDs, you may need a sequence or let DB handle it
//if (!id) {
//id = Math.floor(Math.random() * 1000000); // temporary unique integer ID
//}


if (req.query.id) {
await pool.query(`
UPDATE destinations SET
name=$1, flag=$2, main_image=$3, currency=$4, official_languages=$5, timezone=$6,
capital=$7, category=$8, description=$9, status=$10, sections=$11
WHERE id=$12
`, [name, flag, main_image, currency, official_languages, timezone, capital, category, description, status, sections, id]);
} else {
await pool.query(`
INSERT INTO destinations (name, flag, main_image, currency, official_languages, timezone, capital, category, description, status, sections)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
`, [name, flag, main_image, currency, official_languages, timezone, capital, category, description, status, sections]);
}


res.redirect('/destinations');
});
