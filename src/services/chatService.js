const { models } = require('../db');
const { Op } = require('sequelize');

class ChatService {
  /**
   * Store a new chat interaction
   * @param {Object} data - Chat data
   * @param {string} data.userId - User ID
   * @param {string} data.query - User's query
   * @param {string} data.response - System's response
   * @param {string} [data.category] - Category of the query
   * @param {Object} [data.metadata] - Additional metadata
   * @param {number} [data.tokensUsed] - Number of tokens used
   * @param {number} [data.processingTime] - Processing time in ms
   */
  async storeChat(data) {
    try {
      const chat = await models.Chat.create({
        user_id: data.userId,
        query: data.query,
        response: data.response,
        category: data.category,
        metadata: data.metadata || {},
        tokens_used: data.tokensUsed,
        processing_time: data.processingTime,
        status: 'completed'
      });

      return chat;
    } catch (error) {
      console.error('Error storing chat:', error);
      throw error;
    }
  }

  /**
   * Get user's chat history with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {string} [options.category] - Filter by category
   * @param {Date} [options.startDate] - Filter by start date
   * @param {Date} [options.endDate] - Filter by end date
   */
  async getUserChats(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      startDate,
      endDate
    } = options;

    const where = { user_id: userId };
    
    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }

    try {
      const { count, rows } = await models.Chat.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit,
        include: [{
          model: models.User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        }]
      });

      return {
        chats: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a user's chat history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date for analytics
   * @param {Date} [options.endDate] - End date for analytics
   */
  async getUserChatAnalytics(userId, options = {}) {
    const { startDate, endDate } = options;
    const where = { user_id: userId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }

    try {
      const [
        totalChats,
        categoryStats,
        averageTokens,
        averageProcessingTime,
        dailyStats
      ] = await Promise.all([
        // Total chats
        models.Chat.count({ where }),
        
        // Category distribution
        models.Chat.findAll({
          attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where,
          group: ['category'],
          raw: true
        }),

        // Average tokens used
        models.Chat.findOne({
          attributes: [
            [sequelize.fn('AVG', sequelize.col('tokens_used')), 'average']
          ],
          where,
          raw: true
        }),

        // Average processing time
        models.Chat.findOne({
          attributes: [
            [sequelize.fn('AVG', sequelize.col('processing_time')), 'average']
          ],
          where,
          raw: true
        }),

        // Daily chat counts
        models.Chat.findAll({
          attributes: [
            [sequelize.fn('date_trunc', 'day', sequelize.col('created_at')), 'date'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where,
          group: [sequelize.fn('date_trunc', 'day', sequelize.col('created_at'))],
          order: [[sequelize.fn('date_trunc', 'day', sequelize.col('created_at')), 'ASC']],
          raw: true
        })
      ]);

      return {
        totalChats,
        categoryDistribution: categoryStats,
        averageTokensUsed: Math.round(averageTokens?.average || 0),
        averageProcessingTime: Math.round(averageProcessingTime?.average || 0),
        dailyStats: dailyStats.map(stat => ({
          date: stat.date,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
      throw error;
    }
  }

  /**
   * Update chat feedback
   * @param {string} chatId - Chat ID
   * @param {number} feedback - Feedback rating (1-5)
   */
  async updateChatFeedback(chatId, feedback) {
    try {
      const chat = await models.Chat.findByPk(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      await chat.update({ feedback });
      return chat;
    } catch (error) {
      console.error('Error updating chat feedback:', error);
      throw error;
    }
  }
}

module.exports = new ChatService(); 