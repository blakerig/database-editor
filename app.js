const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: '13.36.39.66',
  port: 5432,
  database: 'travelfoxdb',
  user: 'postgres',
  password: 'pw'
});

app.use(bodyParser.urlencoded({ extended: true }));

// CSS styles for the pages
const styles = `
<style>
body { font-family: Arial, sans-serif; margin: 40px; background-color: #f9f9f9; }
h1 { color: #333; }
form { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 600px; }
label { display: block; margin-bottom: 10px; }
input[type=text], input[type=email], textarea, select { width: 100%; padding: 8px; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box; }
textarea { resize: vertical; min-height: 80px; }
textarea[name=description] { height: 150px; }
textarea[name=notes] { height: 120px; }
button { background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
button:hover { background-color: #218838; }
table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
th { background-color: #007bff; color: white; }
tr:nth-child(even) { background-color: #f2f2f2; }
a { color: #007bff; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
`;

// JavaScript to auto-expand textareas as you type
const autoExpandScript = `
<script>
function autoExpand(field) {
    field.style.height = 'auto';
    field.style.height = field.scrollHeight + 'px';
}
window.addEventListener('input', function(e) {
    if(e.target.tagName.toLowerCase() !== 'textarea') return;
    autoExpand(e.target);
});
</script>
`;

// List all restaurants with edit links
app.get('/restaurants', async (req, res) => {
    const result = await pool.query('SELECT id, name, address FROM restaurants ORDER BY name');
    let html = `${styles}<h1>Restaurants</h1><table><tr><th>Name</th><th>Address</th><th>Edit</th></tr>`;
    result.rows.forEach(r => {
        html += `<tr><td>${r.name}</td><td>${r.address}</td><td><a href="/restaurant?id=${r.id}">Edit</a></td></tr>`;
    });
    html += '</table><br><a href="/restaurant">Add New Restaurant</a>';
    res.send(html);
});

// Serve form for adding/editing
app.get('/restaurant', async (req, res) => {
    const id = req.query.id;
    let restaurant = {};

    // Fetch destinations for dropdown
    const destResult = await pool.query('SELECT id, name FROM destinations ORDER BY name');
    const destinations = destResult.rows;

    if (id) {
        // Fetch existing data for editing
        const result = await pool.query('SELECT *, ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude FROM restaurants WHERE id=$1', [id]);
        if (result.rows.length) {
            restaurant = result.rows[0];
        }
    }

    let destinationOptions = '<option value="">--Select--</option>';
    destinations.forEach(d => {
        const selected = restaurant.destination_id === d.id ? 'selected' : '';
        destinationOptions += `<option value="${d.id}" ${selected}>${d.name}</option>`;
    });

    res.send(`${styles}
        <form method="POST" action="/restaurant${id ? '?id=' + id : ''}">
            ${id ? `<input type="hidden" name="id" value="${restaurant.id}">` : ''}
            <label>Destination: <select name="destination_id">${destinationOptions}</select></label>
            <label>Name: <input type="text" name="name" value="${restaurant.name || ''}"></label>
            <label>Address: <textarea name="address">${restaurant.address || ''}</textarea></label>
            <label>Description: <textarea name="description">${restaurant.description || ''}</textarea></label>
            <label>Cost: <input type="text" name="cost" value="${restaurant.cost || ''}"></label>
            <label>Email: <input type="email" name="email" value="${restaurant.email || ''}"></label>
            <label>Cuisine: <input type="text" name="cuisine" value="${restaurant.cuisine || ''}"></label>
            <label>Price Range: <input type="text" name="price_range" value="${restaurant.price_range || ''}"></label>
            <label>Website: <input type="text" name="website" value="${restaurant.website || ''}"></label>
            <label>Telephone: <input type="text" name="telephone" value="${restaurant.telephone || ''}"></label>
            <label>Opening Hours: <input type="text" name="opening_hours" value="${restaurant.opening_hours || ''}"></label>
            <label>Latitude: <input type="text" name="latitude" value="${restaurant.latitude || ''}"></label>
            <label>Longitude: <input type="text" name="longitude" value="${restaurant.longitude || ''}"></label>
            <label>Must See: <input type="checkbox" name="must_see" ${restaurant.must_see ? 'checked' : ''}></label>
            <label>Proof Read: <input type="checkbox" name="proof_read" ${restaurant.proof_read ? 'checked' : ''}></label>
            <label>Notes: <textarea name="notes">${restaurant.notes || ''}</textarea></label>
            <label>Closed Down: <input type="checkbox" name="closeddown" ${restaurant.closeddown ? 'checked' : ''}></label>
            <button type="submit">${id ? 'Update' : 'Add'} Restaurant</button>
        </form>
        <br><a href="/restaurants">Back to List</a>
        ${autoExpandScript}
    `);
});

// Handle form submission
app.post('/restaurant', async (req, res) => {
    let { id, destination_id, name, address, description, cost, email, cuisine, price_range, website, telephone, opening_hours, latitude, longitude, must_see, proof_read, notes, closeddown } = req.body;

    // Generate a unique ID if adding a new restaurant
    if (!id) {
        id = uuidv4();
    }

    const mustSeeBool = must_see === 'on';
    const proofReadBool = proof_read === 'on';
    const closedDownBool = closeddown === 'on';

    const location = `POINT(${longitude} ${latitude})`;

    if (req.query.id) {
        await pool.query(`
            UPDATE restaurants SET
                destination_id=$1, name=$2, address=$3, description=$4, cost=$5, email=$6,
                cuisine=$7, price_range=$8, website=$9, telephone=$10, opening_hours=$11,
                location=ST_GeogFromText($12), must_see=$13, proof_read=$14, notes=$15, closeddown=$16
            WHERE id=$17
        `, [destination_id, name, address, description, cost, email, cuisine, price_range, website, telephone, opening_hours, location, mustSeeBool, proofReadBool, notes, closedDownBool, id]);
    } else {
        await pool.query(`
            INSERT INTO restaurants (id, destination_id, name, address, description, cost, email, cuisine, price_range, website, telephone, opening_hours, location, must_see, proof_read, notes, closeddown)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,ST_GeogFromText($13),$14,$15,$16,$17)
        `, [id, destination_id, name, address, description, cost, email, cuisine, price_range, website, telephone, opening_hours, location, mustSeeBool, proofReadBool, notes, closedDownBool]);
    }

    res.redirect('/restaurants');
});

app.listen(port, () => console.log(`App running on http://localhost:${port}`));