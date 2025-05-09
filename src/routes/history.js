const express = require('express');
const { User, SearchHistory } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all history routes
router.use(authMiddleware);

/**
 * Get user's search history
 * GET /history
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, favorite = false } = req.query;
    
    // Build the where clause
    const where = { userId: req.user.id };
    
    // Filter by favorites if requested
    if (favorite === 'true') {
      where.isFavorite = true;
    }
    
    // Get search history with pagination
    const history = await SearchHistory.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });
    
    res.json({
      total: history.count,
      offset: parseInt(offset),
      limit: parseInt(limit),
      results: history.rows,
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: `Failed to fetch search history: ${error.message}` });
  }
});

/**
 * Save a new search query and response
 * POST /history
 */
router.post('/', async (req, res) => {
  try {
    const { query, response, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Create new search history entry
    const searchEntry = await SearchHistory.create({
      userId: req.user.id,
      query,
      response,
      context,
      isFavorite: false,
    });
    
    res.status(201).json(searchEntry);
  } catch (error) {
    console.error('Error saving search history:', error);
    res.status(500).json({ error: `Failed to save search history: ${error.message}` });
  }
});

/**
 * Toggle favorite status of a search
 * PATCH /history/:id/favorite
 */
router.patch('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the search entry
    const searchEntry = await SearchHistory.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });
    
    if (!searchEntry) {
      return res.status(404).json({ error: 'Search history entry not found' });
    }
    
    // Toggle favorite status
    const isFavorite = !searchEntry.isFavorite;
    
    // Update the entry
    await searchEntry.update({ isFavorite });
    
    res.json({
      id: searchEntry.id,
      isFavorite,
    });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ error: `Failed to update favorite status: ${error.message}` });
  }
});

/**
 * Delete a search history entry
 * DELETE /history/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the entry ensuring it belongs to the current user
    const deleted = await SearchHistory.destroy({
      where: {
        id,
        userId: req.user.id,
      },
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Search history entry not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting search history:', error);
    res.status(500).json({ error: `Failed to delete search history: ${error.message}` });
  }
});

/**
 * Clear all search history for the current user
 * DELETE /history
 */
router.delete('/', async (req, res) => {
  try {
    // Delete all entries for the current user
    const deleted = await SearchHistory.destroy({
      where: {
        userId: req.user.id,
      },
    });
    
    res.json({ 
      success: true,
      count: deleted 
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ error: `Failed to clear search history: ${error.message}` });
  }
});

module.exports = { router }; 