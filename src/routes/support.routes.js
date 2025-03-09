const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Create ticket (all authenticated users)
router.post('/tickets', supportController.createTicket);

// Update ticket status (admin only)
router.put('/tickets/:ticketId/status', checkRole('admin'), supportController.updateTicketStatus);

// Add message to ticket (all authenticated users)
router.post('/tickets/:ticketId/messages', supportController.addMessage);

// Get ticket details (ticket owner or admin)
router.get('/tickets/:ticketId', supportController.getTicket);

// Get all tickets (filtered by user for non-admin)
router.get('/tickets', supportController.getTickets);

module.exports = router; 