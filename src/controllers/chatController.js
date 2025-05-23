const chatService = require('../services/chatService');
const { validateRequest } = require('../middleware/validation');

class ChatController {
  /**
   * Store a new chat interaction
   */
  async storeChat(req, res) {
    try {
      const { query, response, category, metadata } = req.body;
      const userId = req.user.id;

      // Calculate processing time if available
      const processingTime = req._startTime ? Date.now() - req._startTime : null;

      const chat = await chatService.storeChat({
        userId,
        query,
        response,
        category,
        metadata,
        processingTime
      });

      res.status(201).json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('Error in storeChat:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to store chat'
      });
    }
  }

  /**
   * Get user's chat history
   */
  async getUserChats(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        category,
        startDate,
        endDate
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };

      const result = await chatService.getUserChats(userId, options);

      res.json({
        success: true,
        data: result.chats,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getUserChats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history'
      });
    }
  }

  /**
   * Get chat analytics
   */
  async getChatAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };

      const analytics = await chatService.getUserChatAnalytics(userId, options);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error in getChatAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat analytics'
      });
    }
  }

  /**
   * Update chat feedback
   */
  async updateFeedback(req, res) {
    try {
      const { chatId } = req.params;
      const { feedback } = req.body;
      const userId = req.user.id;

      // Validate feedback
      if (!feedback || feedback < 1 || feedback > 5) {
        return res.status(400).json({
          success: false,
          error: 'Invalid feedback rating. Must be between 1 and 5.'
        });
      }

      // Verify chat belongs to user
      const chat = await chatService.getUserChats(userId, {
        chatId
      });

      if (!chat.chats.length) {
        return res.status(404).json({
          success: false,
          error: 'Chat not found'
        });
      }

      const updatedChat = await chatService.updateChatFeedback(chatId, feedback);

      res.json({
        success: true,
        data: updatedChat
      });
    } catch (error) {
      console.error('Error in updateFeedback:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update feedback'
      });
    }
  }
}

module.exports = new ChatController(); 