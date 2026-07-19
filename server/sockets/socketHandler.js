import { Server } from 'socket.io';
import { verifyToken } from '../services/tokenService.js';
import User from '../models/userModel.js';

// Map to track active connections: userId (String) -> Set of Socket IDs (Strings)
const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.IO Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      const deviceId = socket.handshake.auth?.deviceId || socket.handshake.query?.deviceId || null;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Token invalid or expired'));
      }

      // Check if user still exists and is active in MongoDB
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      if (user.status !== 'active') {
        return next(new Error('Authentication error: Account status is suspended or inactive'));
      }

      // Enforce Trusted Device Rule:
      // Only users who have completed mobile verification on the current device (matching trustedDeviceId) are allowed to connect.
      if (user.mobileVerified) {
        if (!deviceId) {
          return next(new Error('Authentication error: Device ID missing'));
        }
        const TrustedDevice = (await import('../models/trustedDeviceModel.js')).default;
        const trusted = await TrustedDevice.findOne({ userId: user._id, trustedDeviceId: deviceId });
        if (!trusted) {
          return next(new Error('Authentication error: Untrusted device detected. Re-verify mobile number on this device.'));
        }
      } else {
        // Unverified users are allowed to authenticate via HTTP, but cannot connect to the socket room until they verify their device.
        return next(new Error('Authentication error: Mobile verification required to connect'));
      }

      // Attach user details to socket object
      socket.user = {
        id: user._id.toString(),
        userId: user._id.toString(),
        phoneNumber: user.phoneNumber || null,
        ddsId: user.ddsId || null,
        mobileVerified: user.mobileVerified || false,
        deviceId,
        platform: socket.handshake.auth?.platform || socket.handshake.query?.platform || null,
        name: user.displayName || user.email.split('@')[0],
        role: user.role
      };

      next();
    } catch (error) {
      console.error('[Socket Auth] Authentication failed:', error.message);
      return next(new Error('Authentication error: Verification failed'));
    }
  });

  // Connection Event
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`[Socket] Connected: ${socket.id} (User: ${userId}, Phone: ${socket.user.phoneNumber || 'unverified'})`);

    // Register active socket connection
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());

      // User is officially online since this is their first connection
      io.emit('user-online', {
        userId,
        phone: socket.user.phoneNumber || null,
        phoneNumber: socket.user.phoneNumber || null,
        ddsId: socket.user.ddsId || null,
        mobileVerified: socket.user.mobileVerified,
        name: socket.user.name,
        timestamp: new Date()
      });
      console.log(`[Socket] User [${userId}] is now ONLINE`);
    }
    onlineUsers.get(userId).add(socket.id);

    // Join named rooms for phoneNumber and ddsId so we can emit by any identity.
    // The primary room key is MongoDB _id (userId). These are secondary aliases.
    if (socket.user.phoneNumber) {
      socket.join(socket.user.phoneNumber);
    }
    if (socket.user.ddsId) {
      socket.join(socket.user.ddsId);
    }

    // Deliver any PENDING verification requests that arrived while user was offline
    try {
      const VerificationRequest = (await import('../models/requestModel.js')).default;
      const pending = await VerificationRequest.find({
        ddsId: socket.user.ddsId || null,
        status: 'PENDING',
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 }).limit(5);

      for (const req of pending) {
        socket.emit('verification-request', {
          verificationRequestId: req.verificationId,
          clientName: req.clientName,
          expiresAt: req.expiresAt,
          device: req.device,
          location: req.location
        });
        console.log(`[Socket] Delivered pending request ${req.verificationId} to reconnecting user ${userId}`);
      }
    } catch (err) {
      console.error('[Socket] Failed to deliver pending requests:', err.message);
    }

    // Emit confirmation event to client
    socket.emit('authenticated', {
      success: true,
      message: 'Secure WebSocket session initialized.',
      user: socket.user,
      onlineCount: onlineUsers.size
    });

    // Broadcast current online count to everyone
    io.emit('online-users-count', onlineUsers.size);

    // Heartbeat listener
    socket.on('heartbeat', (data) => {
      socket.emit('heartbeat', {
        status: 'ack',
        serverTime: new Date(),
        clientTime: data?.timestamp
      });
    });

    // Disconnection event
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      
      const userConnections = onlineUsers.get(userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        
        // If user has closed all tabs/connections, mark them as offline
        if (userConnections.size === 0) {
          onlineUsers.delete(userId);

          // Save last active status in MongoDB
          try {
            await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
          } catch (err) {
            console.error('[Socket] Mongoose status update error:', err.message);
          }

          // Broadcast offline notification
          io.emit('user-offline', {
            userId,
            phone: socket.user.phoneNumber || null,
            phoneNumber: socket.user.phoneNumber || null,
            ddsId: socket.user.ddsId || null,
            mobileVerified: socket.user.mobileVerified,
            timestamp: new Date()
          });
          console.log(`[Socket] User [${userId}] is now OFFLINE`);
        }
      }

      // Broadcast updated online count
      io.emit('online-users-count', onlineUsers.size);
    });
  });

  // Create Socket helpers for other services (REST endpoints, admin actions, cron etc)
  const socketHelpers = {
    // Emit custom socket event to a specific user
    emitToUser: (userId, eventName, eventData) => {
      const socketIds = onlineUsers.get(userId.toString());
      if (socketIds) {
        socketIds.forEach(socketId => {
          io.to(socketId).emit(eventName, eventData);
        });
        return true;
      }
      return false;
    },

    // Send notifications to specific user
    sendNotificationToUser: (userId, notificationData) => {
      const socketIds = onlineUsers.get(userId.toString());
      if (socketIds) {
        socketIds.forEach(socketId => {
          io.to(socketId).emit('notification', notificationData);
        });
        return true;
      }
      return false;
    },

    // Force log out a user (disconnect their sockets)
    forceLogoutUser: (userId, reason = 'Terminated by administrator') => {
      const socketIds = onlineUsers.get(userId.toString());
      if (socketIds) {
        socketIds.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('force-logout', { reason });
            socket.disconnect(true);
          }
        });
        return true;
      }
      return false;
    },

    // Trigger session expired
    expireSessionUser: (userId) => {
      const socketIds = onlineUsers.get(userId.toString());
      if (socketIds) {
        socketIds.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('session-expired', { message: 'Your login session has expired.' });
            socket.disconnect(true);
          }
        });
        return true;
      }
      return false;
    },

    // Get list of currently online user ids
    getOnlineUserIds: () => {
      return Array.from(onlineUsers.keys());
    }
  };

  return { io, socketHelpers };
};
