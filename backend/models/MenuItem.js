const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    outletId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
    name:        { type: String, required: true },
    description: { type: String, default: 'Freshly prepared with quality ingredients.' },
    price:       { type: Number, required: true },
    imageUrl:    { type: String, default: 'https://placehold.co/400x300/1a1a1a/2ecc71?text=Food' },
    category:    { type: String, enum: ['Veg', 'Non-Veg', 'Other'], required: true },
    subCategory: { type: String, default: 'Other' }  // category section heading e.g. "Pizza (Veg)", "Frankies"
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
