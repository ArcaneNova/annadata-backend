const User = require('../models/user.model');

// Create a new support ticket
const createTicket = async (req, res) => {
  try {
    const { subject, description, priority = 'medium' } = req.body;
    const user = req.user;

    // Generate ticket ID
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

    const ticket = {
      ticketId,
      subject,
      description,
      priority,
      status: 'open',
      messages: [{
        sender: user._id,
        message: description
      }]
    };

    // Add ticket to user's supportTickets array
    await User.findByIdAndUpdate(user._id, {
      $push: { supportTickets: ticket }
    });

    // Notify admin via Socket.IO
    req.app.get('io').to('admin').emit('newTicket', {
      ticketId,
      userId: user._id,
      subject,
      priority
    });

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Error creating support ticket' });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assignedTo } = req.body;
    const admin = req.user;

    const user = await User.findOne({
      'supportTickets.ticketId': ticketId
    });

    if (!user) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = user.supportTickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Update ticket
    ticket.status = status;
    if (assignedTo) {
      ticket.assignedTo = assignedTo;
    }
    ticket.updatedAt = new Date();

    await user.save();

    // Notify user via Socket.IO
    req.app.get('io').to(user._id.toString()).emit('ticketStatusUpdate', {
      ticketId,
      status,
      assignedTo
    });

    res.json({
      message: 'Ticket status updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Error updating ticket status' });
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const sender = req.user;

    const user = await User.findOne({
      'supportTickets.ticketId': ticketId
    });

    if (!user) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = user.supportTickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Add message
    ticket.messages.push({
      sender: sender._id,
      message,
      createdAt: new Date()
    });
    ticket.updatedAt = new Date();

    await user.save();

    // Notify relevant parties via Socket.IO
    const notifyRoom = sender.role === 'admin' ? user._id.toString() : 'admin';
    req.app.get('io').to(notifyRoom).emit('newTicketMessage', {
      ticketId,
      message: {
        sender: {
          _id: sender._id,
          name: sender.name,
          role: sender.role
        },
        message,
        createdAt: new Date()
      }
    });

    res.json({
      message: 'Message added successfully',
      ticketMessage: ticket.messages[ticket.messages.length - 1]
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Error adding message to ticket' });
  }
};

// Get ticket details
const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const user = req.user;

    let query = { 'supportTickets.ticketId': ticketId };
    if (user.role !== 'admin') {
      query._id = user._id;
    }

    const ticketUser = await User.findOne(query)
      .populate('supportTickets.assignedTo', 'name email')
      .populate('supportTickets.messages.sender', 'name role');

    if (!ticketUser) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = ticketUser.supportTickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Error fetching ticket details' });
  }
};

// Get all tickets
const getTickets = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const user = req.user;

    let query = {};
    if (user.role !== 'admin') {
      query._id = user._id;
    }

    const users = await User.find(query)
      .populate('supportTickets.assignedTo', 'name email')
      .select('supportTickets');

    let tickets = users.flatMap(u => u.supportTickets || []);

    // Apply filters
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
    if (priority) {
      tickets = tickets.filter(t => t.priority === priority);
    }

    // Sort by updatedAt
    tickets.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTickets = tickets.slice(startIndex, endIndex);

    res.json({
      tickets: paginatedTickets,
      page: Number(page),
      totalPages: Math.ceil(tickets.length / limit),
      total: tickets.length
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
};

module.exports = {
  createTicket,
  updateTicketStatus,
  addMessage,
  getTicket,
  getTickets
}; 