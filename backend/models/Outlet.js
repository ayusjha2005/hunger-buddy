const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, default: 'https://placehold.co/600x400/1a1a1a/2ecc71?text=Store' },
    rating: { type: Number, default: 4.5 }
});

module.exports = mongoose.model('Outlet', outletSchema);
