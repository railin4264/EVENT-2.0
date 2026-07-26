const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const NotificationService = require('./notificationService');
const GamificationService = require('./gamificationService');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> { socketId, lastSeen }
    this.notificationService = null;
    this.gamificationService = null;
    this.cleanupInterval = null;
    // NOTE: the cleanup interval is started in initialize(), not here, so that
    // simply importing/constructing this service does not schedule timers or
    // open background connections (important for the test harness).
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6 // 1MB limit for buffer size
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    // Initialize notification service
    this.notificationService = new NotificationService(this.io);

    // Initialize gamification service
    this.gamificationService = new GamificationService(this.notificationService);

    // Start the stale-connection cleanup timer only now that a real server
    // is running (avoids scheduling timers in the test harness).
    this.startCleanupInterval();

    logger.info('🔌 Socket.IO service initialized');
    return this.io;
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          logger.warn(`Socket authentication failed: Token expired for socket ${socket.id}`);
          return next(new Error('Authentication error: Token expired'));
        } else if (error.name === 'JsonWebTokenError') {
          logger.warn(`Socket authentication failed: Invalid token for socket ${socket.id}`);
          return next(new Error('Authentication error: Invalid token'));
        } else {
          logger.error('Socket authentication error:', error);
          return next(new Error('Authentication error: Invalid token'));
        }
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // Chat events
      socket.on('joinChat', (data) => this.handleJoinChat(socket, data));
      socket.on('leaveChat', (data) => this.handleLeaveChat(socket, data));
      socket.on('sendMessage', (data) => this.handleSendMessage(socket, data));
      socket.on('typing', (data) => this.handleTyping(socket, data));
      socket.on('stopTyping', (data) => this.handleStopTyping(socket, data));
      socket.on('markAsRead', (data) => this.handleMarkAsRead(socket, data));
      
      // User presence
      socket.on('updatePresence', (data) => this.handleUpdatePresence(socket, data));
      
      // Disconnect
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    // Store connected user
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      status: 'online'
    });

    // Update user's online status
    this.updateUserOnlineStatus(userId, true);
    
    // Join user's personal room
    socket.join(`user_${userId}`);
    
    // Notify user's contacts about online status
    this.broadcastUserPresence(userId, 'online');
    
    logger.info(`🟢 User ${userId} connected with socket ${socket.id}`);
  }

  async handleJoinChat(socket, data) {
    try {
      const { chatId } = data;
      
      // Verify user is participant of the chat
      const chat = await Chat.findOne({ chatId });
      if (!chat || !chat.isParticipant(socket.userId)) {
        socket.emit('error', { message: 'No tienes acceso a este chat' });
        return;
      }
      
      // Join chat room
      socket.join(chatId);
      
      // Update last seen in chat
      await chat.updateLastSeen(socket.userId);
      
      // Notify other participants
      socket.to(chatId).emit('userJoinedChat', {
        chatId,
        userId: socket.userId,
        user: socket.user
      });
      
      logger.info(`User ${socket.userId} joined chat ${chatId}`);
    } catch (error) {
      logger.error('Error joining chat:', error);
      socket.emit('error', { message: 'Error al unirse al chat' });
    }
  }

  handleLeaveChat(socket, data) {
    const { chatId } = data;
    
    socket.leave(chatId);
    
    // Notify other participants
    socket.to(chatId).emit('userLeftChat', {
      chatId,
      userId: socket.userId
    });
    
    logger.info(`User ${socket.userId} left chat ${chatId}`);
  }

  async handleSendMessage(socket, data) {
    try {
      const { chatId, content, messageType = 'text', replyTo, media, location } = data;
      
      // Verify user is participant of the chat
      const chat = await Chat.findOne({ chatId });
      if (!chat || !chat.isParticipant(socket.userId)) {
        socket.emit('error', { message: 'No tienes acceso a este chat' });
        return;
      }
      
      // Determine receiver for direct chats
      let receiver = null;
      if (chat.type === 'direct') {
        const otherParticipant = chat.participants.find(
          p => p.user.toString() !== socket.userId
        );
        receiver = otherParticipant ? otherParticipant.user : null;
      }
      
      // Create message
      const message = new Message({
        sender: socket.userId,
        receiver,
        chatId,
        chatType: chat.type,
        content,
        messageType,
        media,
        location,
        replyTo,
      });
      
      await message.save();
      await message.populate('sender', 'firstName lastName username avatar');
      
      if (replyTo) {
        await message.populate('replyTo', 'content messageType sender');
      }
      
      // Update chat's last message
      await chat.updateLastMessage(message);
      
      // Emit to all chat participants
      this.io.to(chatId).emit('newMessage', {
        chatId,
        message: message.toObject()
      });
      
      // Send push notification to offline users
      this.sendPushNotificationToOfflineUsers(chat, message);
      
      logger.info(`Message sent in chat ${chatId} by user ${socket.userId}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  }

  handleTyping(socket, data) {
    const { chatId } = data;
    
    socket.to(chatId).emit('userTyping', {
      chatId,
      userId: socket.userId,
      user: socket.user
    });
  }

  handleStopTyping(socket, data) {
    const { chatId } = data;
    
    socket.to(chatId).emit('userStoppedTyping', {
      chatId,
      userId: socket.userId
    });
  }

  async handleMarkAsRead(socket, data) {
    try {
      const { chatId, messageId } = data;
      
      const message = await Message.findOne({ _id: messageId, chatId });
      if (!message) {
        socket.emit('error', { message: 'Mensaje no encontrado' });
        return;
      }
      
      await message.markAsRead(socket.userId);
      
      // Emit read receipt to chat
      this.io.to(chatId).emit('messageRead', {
        chatId,
        messageId,
        readBy: socket.userId
      });
      
      logger.info(`Message ${messageId} marked as read by user ${socket.userId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error);
      socket.emit('error', { message: 'Error al marcar mensaje como leído' });
    }
  }

  handleUpdatePresence(socket, data) {
    const { status } = data; // 'online', 'away', 'busy', 'invisible'
    
    if (this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, {
        ...this.connectedUsers.get(socket.userId),
        status,
        lastSeen: new Date()
      });
      
      this.broadcastUserPresence(socket.userId, status);
    }
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.delete(userId);
      
      // Update user's offline status
      this.updateUserOnlineStatus(userId, false);
      
      // Notify user's contacts about offline status
      this.broadcastUserPresence(userId, 'offline');
      
      logger.info(`🔴 User ${userId} disconnected`);
    }
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: new Date()
      });
    } catch (error) {
      logger.error('Error updating user online status:', error);
    }
  }

  async broadcastUserPresence(userId, status) {
    try {
      // Get user's chats to notify other participants
      const userChats = await Chat.find({ 'participants.user': userId });
      
      userChats.forEach(chat => {
        this.io.to(chat.chatId).emit('userPresenceUpdate', {
          userId,
          status,
          lastSeen: new Date()
        });
      });
    } catch (error) {
      logger.error('Error broadcasting user presence:', error);
    }
  }

  async sendPushNotificationToOfflineUsers(chat, message) {
    try {
      // Find offline participants
      const offlineParticipants = chat.participants.filter(p => 
        p.user.toString() !== message.sender.toString() && 
        !this.connectedUsers.has(p.user.toString()) &&
        p.notifications !== false
      );
      
      // Here you would integrate with a push notification service like FCM
      // For now, we'll just log it
      if (offlineParticipants.length > 0) {
        logger.info(`Sending push notifications to ${offlineParticipants.length} offline users for message in chat ${chat.chatId}`);
        
        // Send push notifications to offline users
        try {
          const pushNotificationService = require('./pushNotificationService');
          await pushNotificationService.sendToUsers(
            offlineParticipants.map(p => p.user),
            {
              title: `${message.sender.firstName} ${message.sender.lastName}`,
              body: message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content,
              data: {
                type: 'message',
                chatId: chat.chatId,
                messageId: message._id.toString()
              }
            }
          );
        } catch (pushError) {
          logger.error('Failed to send push notifications:', pushError);
        }
      }
    } catch (error) {
      logger.error('Error sending push notifications:', error);
    }
  }

  // Public methods for external use
  sendToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  sendToChat(chatId, event, data) {
    this.io.to(chatId).emit(event, data);
  }

  getUserOnlineStatus(userId) {
    return this.connectedUsers.has(userId);
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getNotificationService() {
    return this.notificationService;
  }

  getGamificationService() {
    return this.gamificationService;
  }

  // Cleanup methods to prevent memory leaks
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000); // 5 minutes
  }

  cleanupStaleConnections() {
    const now = new Date();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userId, userData] of this.connectedUsers.entries()) {
      if (now - userData.lastSeen > staleThreshold) {
        logger.warn(`Cleaning up stale connection for user ${userId}`);
        this.connectedUsers.delete(userId);
        this.updateUserOnlineStatus(userId, false);
      }
    }
  }

  // Shutdown method to cleanup resources
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.io) {
      this.io.close();
    }

    this.connectedUsers.clear();
    logger.info('🔌 Socket.IO service shutdown');
  }
}

module.exports = new SocketService();
