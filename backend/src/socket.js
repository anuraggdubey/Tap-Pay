/**
 * Socket.io setup for real-time session status updates
 *
 * Clients join a room keyed by their wallet address.
 * When a session status changes, we emit to both sender and receiver rooms.
 */

let io = null;

/**
 * Initialize Socket.io on the given HTTP server
 */
function initSocket(httpServer, corsOrigins) {
  const { Server } = require("socket.io");
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Client sends their wallet address to join their room
    socket.on("join", (walletAddress) => {
      if (walletAddress && typeof walletAddress === "string") {
        socket.join(walletAddress.toLowerCase());
      }
    });

    socket.on("disconnect", () => {
      // Cleanup handled by Socket.io
    });
  });

  return io;
}

/**
 * Emit a session_update event to both sender and receiver
 */
function emitSessionUpdate(session) {
  if (!io) return;

  const payload = {
    sessionId: session.id,
    status: session.status,
    txHash: session.tx_hash || null,
    amountWei: session.amount_wei,
    senderAddress: session.sender_address,
    receiverAddress: session.receiver_address || null,
  };

  // Emit to sender's room
  io.to(session.sender_address.toLowerCase()).emit("session_update", payload);

  // Emit to receiver's room if we have their address
  if (session.receiver_address) {
    io.to(session.receiver_address.toLowerCase()).emit("session_update", payload);
  }
}

module.exports = { initSocket, emitSessionUpdate };
