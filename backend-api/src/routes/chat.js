const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, param, query, validationResult } = require('express-validator');
const { protect: authMiddleware } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/chat');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images, documents, and audio files
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|m4a|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes, documentos, audio y video.'));
    }
  }
});

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
    });
  }
  next();
};

// @route   GET /api/chat/chats
// @desc    Get user's chats
// @access  Private
router.get('/chats', 
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const chats = await Chat.getUserChats(req.user.id, page, limit);
      
      // Get unread message counts for each chat
      const chatsWithUnreadCounts = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await Message.getUnreadCount(req.user.id, chat.chatId);
          return {
            ...chat.toObject(),
            unreadCount,
          };
        })
      );
      
      logger.info(`API Success: GET /api/chat/chats - User: ${req.user.id}`);
      res.json({
        success: true,
        data: chatsWithUnreadCounts,
        pagination: {
          page,
          limit,
          hasMore: chats.length === limit,
        },
      });
    } catch (error) {
      logger.error(`API Error: GET /api/chat/chats - User: ${req.user.id} - ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los chats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/chat/direct
// @desc    Create or get direct chat
// @access  Private
router.post('/direct',
  authMiddleware,
  [
    body('userId').isMongoId().withMessage('ID de usuario inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes crear un chat contigo mismo',
        });
      }
      
      const chat = await Chat.createDirectChat(req.user.id, userId);
      await chat.populate('participants.user', 'firstName lastName username avatar lastSeen');
      
      logger.info('POST', '/api/chat/direct', req.user.id);
      res.status(201).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      logger.error('POST', '/api/chat/direct', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al crear el chat directo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/chat/group
// @desc    Create group chat
// @access  Private
router.post('/group',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('El nombre debe tener entre 1 y 50 caracteres'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres'),
    body('participantIds').isArray({ min: 1 }).withMessage('Debe incluir al menos un participante'),
    body('participantIds.*').isMongoId().withMessage('ID de participante inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, description, participantIds } = req.body;
      
      // Remove duplicates and creator from participants
      const uniqueParticipants = [...new Set(participantIds)].filter(id => id !== req.user.id);
      
      const chat = await Chat.createGroupChat(name, description, req.user.id, uniqueParticipants);
      await chat.populate('participants.user', 'firstName lastName username avatar lastSeen');
      
      logger.info('POST', '/api/chat/group', req.user.id);
      res.status(201).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      logger.error('POST', '/api/chat/group', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al crear el chat grupal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/chat/:chatId/messages
// @desc    Get chat messages
// @access  Private
router.get('/:chatId/messages',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      
      // Check if user is participant of the chat
      const chat = await Chat.findOne({ chatId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado',
        });
      }
      
      if (!chat.isParticipant(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este chat',
        });
      }
      
      const messages = await Message.getChatMessages(chatId, page, limit);
      
      // Update last seen for the user
      await chat.updateLastSeen(req.user.id);
      
      logger.info('GET', `/api/chat/${chatId}/messages`, req.user.id);
      res.json({
        success: true,
        data: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      });
    } catch (error) {
      logger.error('GET', `/api/chat/${req.params.chatId}/messages`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los mensajes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/chat/:chatId/messages
// @desc    Send message
// @access  Private
router.post('/:chatId/messages',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
    body('messageType').optional().isIn(['text', 'image', 'file', 'location', 'event', 'tribe']).withMessage('Tipo de mensaje inválido'),
    body('replyTo').optional().isMongoId().withMessage('ID de mensaje de respuesta inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { content, messageType = 'text', media, location, reference, referenceModel, replyTo } = req.body;
      
      // Check if user is participant of the chat
      const chat = await Chat.findOne({ chatId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado',
        });
      }
      
      if (!chat.isParticipant(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este chat',
        });
      }
      
      // Determine receiver for direct chats
      let receiver = null;
      if (chat.type === 'direct') {
        const otherParticipant = chat.participants.find(
          p => p.user.toString() !== req.user.id
        );
        receiver = otherParticipant ? otherParticipant.user : null;
      }
      
      const message = new Message({
        sender: req.user.id,
        receiver,
        chatId,
        chatType: chat.type,
        content,
        messageType,
        media,
        location,
        reference,
        referenceModel,
        replyTo,
      });
      
      await message.save();
      await message.populate('sender', 'firstName lastName username avatar');
      
      if (replyTo) {
        await message.populate('replyTo', 'content messageType sender');
      }
      
      // Update chat's last message
      await chat.updateLastMessage(message);
      
      // Emit socket event (will be handled by socket service)
      req.app.get('io').to(chatId).emit('newMessage', {
        chatId,
        message: message.toObject(),
      });
      
      logger.info('POST', `/api/chat/${chatId}/messages`, req.user.id);
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('POST', `/api/chat/${req.params.chatId}/messages`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   PUT /api/chat/:chatId/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:chatId/messages/:messageId/read',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    param('messageId').isMongoId().withMessage('ID de mensaje inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId, messageId } = req.params;
      
      const message = await Message.findOne({ _id: messageId, chatId });
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado',
        });
      }
      
      await message.markAsRead(req.user.id);
      
      // Emit socket event for read receipt
      req.app.get('io').to(chatId).emit('messageRead', {
        chatId,
        messageId,
        readBy: req.user.id,
      });
      
      logger.info('PUT', `/api/chat/${chatId}/messages/${messageId}/read`, req.user.id);
      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('PUT', `/api/chat/${req.params.chatId}/messages/${req.params.messageId}/read`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al marcar mensaje como leído',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/chat/:chatId/messages/:messageId/react
// @desc    Add reaction to message
// @access  Private
router.post('/:chatId/messages/:messageId/react',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    param('messageId').isMongoId().withMessage('ID de mensaje inválido'),
    body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji requerido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId, messageId } = req.params;
      const { emoji } = req.body;
      
      const message = await Message.findOne({ _id: messageId, chatId });
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado',
        });
      }
      
      await message.addReaction(req.user.id, emoji);
      
      // Emit socket event
      req.app.get('io').to(chatId).emit('messageReaction', {
        chatId,
        messageId,
        userId: req.user.id,
        emoji,
      });
      
      logger.info('POST', `/api/chat/${chatId}/messages/${messageId}/react`, req.user.id);
      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('POST', `/api/chat/${req.params.chatId}/messages/${req.params.messageId}/react`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al agregar reacción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   PUT /api/chat/:chatId/join
// @desc    Join chat (for groups, tribes, events)
// @access  Private
router.put('/:chatId/join',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      
      const chat = await Chat.findOne({ chatId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado',
        });
      }
      
      if (chat.type === 'direct') {
        return res.status(400).json({
          success: false,
          message: 'No puedes unirte a un chat directo',
        });
      }
      
      if (chat.isParticipant(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: 'Ya eres participante de este chat',
        });
      }
      
      await chat.addParticipant(req.user.id);
      
      // Emit socket event
      req.app.get('io').to(chatId).emit('userJoined', {
        chatId,
        user: req.user,
      });
      
      logger.info('PUT', `/api/chat/${chatId}/join`, req.user.id);
      res.json({
        success: true,
        data: chat,
      });
    } catch (error) {
      logger.error('PUT', `/api/chat/${req.params.chatId}/join`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al unirse al chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   PUT /api/chat/:chatId/leave
// @desc    Leave chat
// @access  Private
router.put('/:chatId/leave',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      
      const chat = await Chat.findOne({ chatId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado',
        });
      }
      
      if (!chat.isParticipant(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: 'No eres participante de este chat',
        });
      }
      
      await chat.removeParticipant(req.user.id);
      
      // Emit socket event
      req.app.get('io').to(chatId).emit('userLeft', {
        chatId,
        userId: req.user.id,
      });
      
      logger.info('PUT', `/api/chat/${chatId}/leave`, req.user.id);
      res.json({
        success: true,
        message: 'Has salido del chat exitosamente',
      });
    } catch (error) {
      logger.error('PUT', `/api/chat/${req.params.chatId}/leave`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al salir del chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/chat/:chatId/upload
// @desc    Upload files to chat
// @access  Private
router.post('/:chatId/upload',
  authMiddleware,
  upload.array('files', 5),
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    body('content').optional().trim().isLength({ max: 500 }).withMessage('El contenido no puede exceder 500 caracteres'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { content = '' } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un archivo',
        });
      }

      // Check if user is participant of the chat
      const chat = await Chat.findOne({ chatId });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado',
        });
      }

      if (!chat.isParticipant(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este chat',
        });
      }

      // Process files
      const images = [];
      const fileAttachments = [];

      files.forEach(file => {
        const fileUrl = `/api/chat/files/${file.filename}`;
        const fileData = {
          url: fileUrl,
          originalName: file.originalname,
          size: file.size
        };

        if (file.mimetype.startsWith('image/')) {
          images.push({
            ...fileData,
            thumbnail: fileUrl
          });
        } else {
          fileAttachments.push({
            ...fileData,
            fileName: file.originalname,
            fileType: file.mimetype
          });
        }
      });

      // Determine receiver for direct chats
      let receiver = null;
      if (chat.type === 'direct') {
        const otherParticipant = chat.participants.find(
          p => p.user.toString() !== req.user.id
        );
        receiver = otherParticipant ? otherParticipant.user : null;
      }

      // Determine message type
      let messageType = 'file';
      if (images.length > 0 && fileAttachments.length === 0) {
        messageType = 'image';
      } else if (images.length === 0 && fileAttachments.length > 0) {
        const firstFile = fileAttachments[0];
        if (firstFile.fileType.startsWith('audio/')) {
          messageType = 'audio';
        } else if (firstFile.fileType.startsWith('video/')) {
          messageType = 'video';
        }
      }

      const message = new Message({
        sender: req.user.id,
        receiver,
        chatId,
        chatType: chat.type,
        content: content || `Archivo${files.length > 1 ? 's' : ''} compartido${files.length > 1 ? 's' : ''}`,
        messageType,
        media: {
          images,
          files: fileAttachments
        }
      });

      await message.save();
      await message.populate('sender', 'firstName lastName username avatar');

      // Update chat's last message
      await chat.updateLastMessage(message);

      // Emit socket event
      req.app.get('io').to(chatId).emit('newMessage', {
        chatId,
        message: message.toObject(),
      });

      logger.info('POST', `/api/chat/${chatId}/upload`, req.user.id);
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('POST', `/api/chat/${req.params.chatId}/upload`, error, req.user.id);

      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) logger.error('Error deleting file:', err);
          });
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al subir archivos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/chat/files/:filename
// @desc    Serve uploaded files
// @access  Public
router.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../../uploads/chat', filename);
  
  if (fs.existsSync(filepath)) {
    res.sendFile(path.resolve(filepath));
  } else {
    res.status(404).json({
      success: false,
      message: 'Archivo no encontrado'
    });
  }
});

// @route   PUT /api/chat/:chatId/participants/:userId
// @desc    Update participant role in group chat
// @access  Private
router.put('/:chatId/participants/:userId',
  authMiddleware,
  [
    param('chatId').notEmpty().withMessage('ID de chat requerido'),
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    body('role').isIn(['admin', 'moderator', 'member']).withMessage('Rol inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      const { role } = req.body;

      const chat = await Chat.findOne({ 
        chatId,
        type: 'group'
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat grupal no encontrado',
        });
      }

      // Check if current user is admin
      const userRole = chat.getParticipantRole(req.user.id);
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden cambiar roles',
        });
      }

      // Find participant and update role
      const participant = chat.participants.find(p => p.user.toString() === userId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'Participante no encontrado',
        });
      }

      participant.role = role;
      await chat.save();

      // Emit socket event
      req.app.get('io').to(chatId).emit('participantRoleUpdated', {
        chatId,
        userId,
        role,
        updatedBy: req.user.id
      });

      logger.info('PUT', `/api/chat/${chatId}/participants/${userId}`, req.user.id);
      res.json({
        success: true,
        message: 'Rol actualizado exitosamente',
        data: { userId, role }
      });
    } catch (error) {
      logger.error('PUT', `/api/chat/${req.params.chatId}/participants/${req.params.userId}`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar rol del participante',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;

