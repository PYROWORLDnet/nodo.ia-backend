const { Business, PromotionCredit, Transaction } = require('../db');
const { 
  createCheckoutSession, 
  getPromoCreditPricing 
} = require('../utils/stripeService');
const { Op } = require('sequelize');

/**
 * Get credit pricing
 */
async function getCreditPricing(req, res) {
  try {
    const pricing = getPromoCreditPricing();
    return res.status(200).json({ pricing });
  } catch (error) {
    console.error('Get credit pricing error:', error);
    return res.status(500).json({ error: 'Failed to get credit pricing' });
  }
}

/**
 * Get business credit balance
 */
async function getCreditBalance(req, res) {
  try {
    const { business } = req;
    
    // Return current credit balance
    return res.status(200).json({
      balance: business.promotionCreditBalance || 0
    });
  } catch (error) {
    console.error('Get credit balance error:', error);
    return res.status(500).json({ error: 'Failed to get credit balance' });
  }
}

/**
 * Create checkout session for purchasing credits
 */
async function createCreditCheckout(req, res) {
  try {
    const { business } = req;
    const { creditPackage, quantity = 1, successUrl, cancelUrl } = req.body;

    if (!creditPackage || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Credit package, success URL, and cancel URL are required' });
    }

    // Validate credit package
    const pricing = getPromoCreditPricing();
    const packagePrice = pricing.find(p => p.id === creditPackage);
    
    if (!packagePrice) {
      return res.status(400).json({ error: 'Invalid credit package' });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customer: business.stripeCustomerId,
      creditPackage,
      quantity,
      businessId: business.id,
      successUrl,
      cancelUrl,
      type: 'promotion_credit'
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create credit checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * Get credit transaction history
 */
async function getCreditHistory(req, res) {
  try {
    const { business } = req;
    
    // Get all credit transactions
    const transactions = await PromotionCredit.findAll({
      where: {
        businessId: business.id
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get credit history error:', error);
    return res.status(500).json({ error: 'Failed to get credit history' });
  }
}

/**
 * Apply credit to a listing
 */
async function applyCredit(req, res) {
  try {
    const { business } = req;
    const { listingId, days } = req.body;

    if (!listingId || !days || days <= 0) {
      return res.status(400).json({ error: 'Listing ID and days (positive number) are required' });
    }

    // Check if business has enough credits
    if (business.promotionCreditBalance < days) {
      return res.status(400).json({ 
        error: 'Insufficient credit balance',
        balance: business.promotionCreditBalance,
        required: days
      });
    }

    // Start a transaction
    const result = await Business.sequelize.transaction(async (t) => {
      // Deduct credits from business
      await business.update({
        promotionCreditBalance: business.promotionCreditBalance - days
      }, { transaction: t });

      // Record credit usage
      const creditTransaction = await PromotionCredit.create({
        businessId: business.id,
        type: 'used',
        amount: days,
        listingId,
        status: 'completed',
        metadata: {
          previousBalance: business.promotionCreditBalance,
          newBalance: business.promotionCreditBalance - days
        }
      }, { transaction: t });

      // TODO: Update listing promotion status (code to be added in listing management)

      return creditTransaction;
    });

    return res.status(200).json({
      message: 'Credits applied successfully',
      transaction: {
        id: result.id,
        type: result.type,
        amount: result.amount,
        listingId: result.listingId,
        createdAt: result.createdAt
      },
      newBalance: business.promotionCreditBalance - days
    });
  } catch (error) {
    console.error('Apply credit error:', error);
    return res.status(500).json({ error: 'Failed to apply credits' });
  }
}

/**
 * Add free credits (admin only)
 */
async function addFreeCredits(req, res) {
  try {
    const { business } = req;
    const { businessId, amount, reason } = req.body;

    if (!businessId || !amount || amount <= 0 || !reason) {
      return res.status(400).json({ error: 'Business ID, amount (positive number), and reason are required' });
    }

    // Only admins can access this endpoint (middleware check should be applied in routes)

    // Find target business
    const targetBusiness = await Business.findByPk(businessId);
    if (!targetBusiness) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Start a transaction
    const result = await Business.sequelize.transaction(async (t) => {
      // Update business balance
      const currentBalance = targetBusiness.promotionCreditBalance || 0;
      await targetBusiness.update({
        promotionCreditBalance: currentBalance + amount
      }, { transaction: t });

      // Record credit addition
      const creditTransaction = await PromotionCredit.create({
        businessId: targetBusiness.id,
        type: 'free',
        amount,
        status: 'completed',
        metadata: {
          reason,
          adminUser: business ? business.id : 'system',
          previousBalance: currentBalance,
          newBalance: currentBalance + amount
        }
      }, { transaction: t });

      return creditTransaction;
    });

    return res.status(200).json({
      message: 'Free credits added successfully',
      transaction: {
        id: result.id,
        businessId: targetBusiness.id,
        type: result.type,
        amount: result.amount,
        createdAt: result.createdAt
      },
      newBalance: targetBusiness.promotionCreditBalance
    });
  } catch (error) {
    console.error('Add free credits error:', error);
    return res.status(500).json({ error: 'Failed to add free credits' });
  }
}

module.exports = {
  getCreditPricing,
  getCreditBalance,
  createCreditCheckout,
  getCreditHistory,
  applyCredit,
  addFreeCredits
}; 