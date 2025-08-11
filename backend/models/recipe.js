
const mongoose = require('../db');

// Recipe/Post Schema
const recipeSchema = new mongoose.Schema({
    author: {
        type: String,
        required: true,
        trim: true
    },
    recipeName: {
        type: String,
        required: true,
        trim: true
    },
    ingredients: {
        type: [String],
        required: true
    },
    recipeSteps: {
        type: [String],
        required: true
    },
    forumSection: {
        type: String,
        required: true,
        enum: ['main', '5 Ingredients or Less', 'Heirloom Recipes', 'Cultural Wonders'],
        default: 'main'
    },
    comments: [
        {
        text: String,
        author: String
    }
    ],
    replies: {
        type: Number,
        default: 0
    },
    lastPost: {
        type: String,
        default: () => new Date().toISOString()
    },
    duration: {
        type: String,
        default: '30 min'
    },
    tag: [{
        type: [String],
        trim: true
    }],
    imageUrl: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // This adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Recipe', recipeSchema);