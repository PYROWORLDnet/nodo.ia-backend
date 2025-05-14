import React from 'react';
import { Container, Box, Divider } from '@mui/material';
import SubscriptionPlans from '../components/SubscriptionPlans';
import CurrentSubscription from '../components/CurrentSubscription';
import InvoiceHistory from '../components/InvoiceHistory';

const Subscription = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <CurrentSubscription />
        <Box sx={{ my: 4 }}>
          <Divider />
        </Box>
        <SubscriptionPlans />
        <Box sx={{ my: 4 }}>
          <Divider />
        </Box>
        <InvoiceHistory />
      </Box>
    </Container>
  );
};

export default Subscription; 