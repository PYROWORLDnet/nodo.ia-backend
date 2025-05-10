# Subscription API Testing Guide

This guide explains how to use the Postman collection for testing the subscription API endpoints.

## Prerequisites

1. Postman installed on your machine
2. Backend server running locally
3. Valid authentication token
4. Stripe account with test mode enabled
5. Environment variables configured in your backend:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_SMART_PRICE_ID`
   - `STRIPE_PRO_PRICE_ID`
   - `FRONTEND_URL`

## Setup

1. Import the `Subscription_API.postman_collection.json` file into Postman
2. Create a new environment in Postman with the following variables:
   - `baseUrl`: Set to your backend URL (default: `http://localhost:3000`)
   - `authToken`: Set to a valid JWT token from a logged-in business account

## Available Endpoints

### Public Endpoints

1. **Get Available Plans**
   - Method: `GET`
   - Endpoint: `/api/subscription/plans`
   - Description: Returns all available subscription plans and their features

### Protected Endpoints (Require Authentication)

2. **Get Current Subscription**
   - Method: `GET`
   - Endpoint: `/api/subscription/current`
   - Description: Returns the current subscription details for the authenticated business

3. **Get Subscription History**
   - Method: `GET`
   - Endpoint: `/api/subscription/history`
   - Description: Returns the subscription transaction history

4. **Create Subscription Checkout**
   - Method: `POST`
   - Endpoint: `/api/subscription/checkout`
   - Body: `{ "planId": "smart" }` or `{ "planId": "pro" }`
   - Description: Creates a Stripe checkout session for subscription purchase

5. **Cancel Current Subscription**
   - Method: `POST`
   - Endpoint: `/api/subscription/cancel`
   - Description: Cancels the current active subscription

6. **Reactivate Cancelled Subscription**
   - Method: `POST`
   - Endpoint: `/api/subscription/reactivate`
   - Description: Reactivates a previously cancelled subscription

7. **Change Subscription Plan**
   - Method: `POST`
   - Endpoint: `/api/subscription/change-plan`
   - Body: `{ "newPlanId": "pro" }`
   - Description: Changes the current subscription plan

## Testing Flow

1. **Initial Setup**
   - Register a business account and get the authentication token
   - Set the token in your Postman environment

2. **Basic Flow**
   - Get available plans
   - Create a checkout session for the Smart plan
   - Complete the payment in the browser using the returned checkout URL
   - Verify the current subscription
   - Check subscription history

3. **Plan Management**
   - Change to Pro plan
   - Verify the upgrade
   - Cancel subscription
   - Verify cancellation
   - Reactivate subscription
   - Verify reactivation

## Response Examples

### Get Plans Response
```json
{
  "plans": {
    "free": {
      "name": "Free Plan",
      "price": 0,
      "features": ["Basic business profile", "Up to 3 listings", "Basic analytics"],
      "limits": {
        "listings": 3,
        "highlightCredits": 0,
        "patchColor": "grey"
      }
    },
    // ... other plans
  },
  "currentPlan": "free"
}
```

### Current Subscription Response
```json
{
  "subscription": {
    "id": "uuid",
    "tier": "smart",
    "status": "active",
    "features": ["Everything in Free", "Up to 10 listings", "Advanced analytics"],
    "limits": {
      "listings": 10,
      "highlightCredits": 5,
      "patchColor": "blue"
    },
    "stripeDetails": {
      "currentPeriodEnd": "2024-04-20T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes:
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found (subscription not found)
- `500`: Server Error

Error responses include a message explaining the error:
```json
{
  "error": "Invalid plan selected"
}
```

## Notes

1. Use Stripe test cards for payments:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. The free plan is the default and doesn't require checkout

3. Subscription changes are prorated by default

4. Cancellations take effect at the end of the billing period 