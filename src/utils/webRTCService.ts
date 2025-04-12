
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for signaling data
interface SignalingOffer {
  type: 'offer';
  offer: RTCSessionDescriptionInit;
  senderName: string;
  senderId: string;
}

interface SignalingAnswer {
  type: 'answer';
  answer: RTCSessionDescriptionInit;
  senderName: string;
  senderId: string;
}

interface SignalingCandidate {
  type: 'candidate';
  candidate: RTCIceCandidateInit | null;
  senderName: string;
  senderId: string;
}

interface SignalingJoin {
  type: 'join';
  senderName: string;
  senderId: string;
}

interface SignalingLeave {
  type: 'leave';
  senderId: string;
}

export type SignalingMessage = 
  | SignalingOffer 
  | SignalingAnswer 
  | SignalingCandidate 
  | SignalingJoin
  | SignalingLeave;

// Interface for peer connection info
interface PeerConnection {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  name: string;
}

// Interface for event callbacks
interface WebRTCCallbacks {
  onRemoteStream: (stream: MediaStream, peerId: string, peerName: string) => void;
  onPeerDisconnected: (peerId: string) => void;
}

export class WebRTCService {
  private peerConnections: Map<string, PeerConnection>;
  private localStream: MediaStream | null;
  private roomId: string;
  private userId: string;
  private userName: string;
  private iceServers: RTCIceServer[];
  private callbacks: WebRTCCallbacks;
  private supabaseChannel: any;

  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.roomId = '';
    this.userId = '';
    this.userName = '';
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
    this.callbacks = {
      onRemoteStream: () => {},
      onPeerDisconnected: () => {}
    };
    this.supabaseChannel = null;
  }

  // Initialize WebRTC service with local stream and room ID
  public async initialize(
    localStream: MediaStream | null, 
    roomId: string, 
    userId: string, 
    userName: string,
    callbacks: WebRTCCallbacks
  ): Promise<void> {
    console.log(`Initializing WebRTC service for room ${roomId}`);
    
    this.localStream = localStream;
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.callbacks = callbacks;

    await this.setupSignalingChannel();
    
    // Announce joining the room
    await this.sendSignalingMessage({
      type: 'join',
      senderId: this.userId,
      senderName: this.userName
    });
  }

  // Set up the signaling channel using Supabase Realtime
  private async setupSignalingChannel(): Promise<void> {
    console.log(`Setting up signaling channel for room: ${this.roomId}`);
    
    const channel = supabase.channel(`meeting:${this.roomId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'signaling' }, async (payload) => {
        try {
          const message: SignalingMessage = payload.payload as SignalingMessage;
          await this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Error handling signaling message:', error);
        }
      })
      .subscribe((status) => {
        console.log(`Signaling channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to signaling channel');
        }
      });
    
    this.supabaseChannel = channel;
  }

  // Send a signaling message through the channel
  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.supabaseChannel) {
      console.error('Signaling channel not initialized');
      return;
    }
    
    try {
      await this.supabaseChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message,
      });
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    console.log(`Received signaling message of type: ${message.type}`, message);
    
    // Ignore messages from self
    if (message.type !== 'leave' && message.senderId === this.userId) {
      return;
    }
    
    switch (message.type) {
      case 'join':
        // Someone joined, send them an offer
        await this.createPeerConnection(message.senderId, message.senderName);
        break;
        
      case 'offer':
        // Received an offer, create answer
        await this.handleOffer(message);
        break;
        
      case 'answer':
        // Received an answer to our offer
        await this.handleAnswer(message);
        break;
        
      case 'candidate':
        // Received ICE candidate
        await this.handleCandidate(message);
        break;
        
      case 'leave':
        // Peer left the meeting
        this.handlePeerLeave(message.senderId);
        break;
    }
  }

  // Create a new peer connection for a remote peer
  private async createPeerConnection(peerId: string, peerName: string): Promise<RTCPeerConnection> {
    console.log(`Creating peer connection for: ${peerName} (${peerId})`);
    
    // Check if connection already exists
    if (this.peerConnections.has(peerId)) {
      const existingConnection = this.peerConnections.get(peerId);
      if (existingConnection) {
        return existingConnection.connection;
      }
    }
    
    // Create new RTCPeerConnection
    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    
    // Store the connection
    this.peerConnections.set(peerId, {
      connection: peerConnection,
      stream: null,
      name: peerName
    });
    
    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
      });
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          senderId: this.userId,
          senderName: this.userName
        });
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerName}: ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.handlePeerLeave(peerId);
      }
    };
    
    // Handle incoming streams
    peerConnection.ontrack = (event) => {
      console.log(`Received track from ${peerName}`);
      const remoteStream = new MediaStream();
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      
      const peerInfo = this.peerConnections.get(peerId);
      if (peerInfo) {
        peerInfo.stream = remoteStream;
        this.peerConnections.set(peerId, peerInfo);
      }
      
      this.callbacks.onRemoteStream(remoteStream, peerId, peerName);
    };
    
    // Create and send offer if we initiated the connection
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      await this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        senderName: this.userName
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
    
    return peerConnection;
  }

  // Handle incoming WebRTC offers
  private async handleOffer(message: SignalingOffer): Promise<void> {
    console.log(`Handling offer from: ${message.senderName}`);
    
    let peerConnection: RTCPeerConnection;
    
    // Get or create peer connection
    if (this.peerConnections.has(message.senderId)) {
      peerConnection = this.peerConnections.get(message.senderId)!.connection;
    } else {
      peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      this.peerConnections.set(message.senderId, {
        connection: peerConnection,
        stream: null,
        name: message.senderName
      });
      
      // Add local tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.localStream) {
            peerConnection.addTrack(track, this.localStream);
          }
        });
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await this.sendSignalingMessage({
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            senderId: this.userId,
            senderName: this.userName
          });
        }
      };
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${message.senderName}: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
          this.handlePeerLeave(message.senderId);
        }
      };
      
      // Handle incoming streams
      peerConnection.ontrack = (event) => {
        console.log(`Received track from ${message.senderName}`);
        const remoteStream = new MediaStream();
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        
        const peerInfo = this.peerConnections.get(message.senderId);
        if (peerInfo) {
          peerInfo.stream = remoteStream;
          this.peerConnections.set(message.senderId, peerInfo);
        }
        
        this.callbacks.onRemoteStream(remoteStream, message.senderId, message.senderName);
      };
    }
    
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      await this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        senderId: this.userId,
        senderName: this.userName
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle incoming WebRTC answers
  private async handleAnswer(message: SignalingAnswer): Promise<void> {
    console.log(`Handling answer from: ${message.senderName}`);
    
    const peerConnection = this.peerConnections.get(message.senderId)?.connection;
    
    if (!peerConnection) {
      console.error(`No peer connection found for: ${message.senderId}`);
      return;
    }
    
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle incoming ICE candidates
  private async handleCandidate(message: SignalingCandidate): Promise<void> {
    console.log(`Handling ICE candidate from: ${message.senderName}`);
    
    const peerConnection = this.peerConnections.get(message.senderId)?.connection;
    
    if (!peerConnection) {
      console.error(`No peer connection found for: ${message.senderId}`);
      return;
    }
    
    try {
      if (message.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Handle peer leaving
  private handlePeerLeave(peerId: string): void {
    console.log(`Peer disconnected: ${peerId}`);
    
    const peerInfo = this.peerConnections.get(peerId);
    if (peerInfo) {
      // Close the connection
      peerInfo.connection.close();
      
      // Remove the peer
      this.peerConnections.delete(peerId);
      
      // Notify callback
      this.callbacks.onPeerDisconnected(peerId);
    }
  }

  // Clean up when leaving the meeting
  public async leaveRoom(): Promise<void> {
    console.log('Leaving WebRTC room');
    
    // Notify others that we're leaving
    if (this.supabaseChannel) {
      await this.sendSignalingMessage({
        type: 'leave',
        senderId: this.userId
      });
      
      // Unsubscribe from the channel
      await this.supabaseChannel.unsubscribe();
    }
    
    // Close all peer connections
    this.peerConnections.forEach((peerInfo, peerId) => {
      peerInfo.connection.close();
    });
    
    // Clear the map
    this.peerConnections.clear();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Get all active remote streams
  public getRemoteStreams(): Map<string, { stream: MediaStream, name: string }> {
    const result = new Map();
    
    this.peerConnections.forEach((peerInfo, peerId) => {
      if (peerInfo.stream) {
        result.set(peerId, {
          stream: peerInfo.stream,
          name: peerInfo.name
        });
      }
    });
    
    return result;
  }

  // Update the local stream
  public updateLocalStream(newStream: MediaStream | null): void {
    // Remove old tracks from all connections
    if (this.localStream) {
      const senders = new Map();
      
      this.peerConnections.forEach((peerInfo, peerId) => {
        const connection = peerInfo.connection;
        senders.set(peerId, connection.getSenders());
      });
      
      this.localStream.getTracks().forEach(track => {
        track.stop();
        
        // Remove track from all connections
        senders.forEach((connectionSenders) => {
          const sender = connectionSenders.find((s: RTCRtpSender) => s.track === track);
          if (sender) {
            sender.replaceTrack(null);
          }
        });
      });
    }
    
    // Set new stream
    this.localStream = newStream;
    
    // Add new tracks to all connections
    if (this.localStream) {
      this.peerConnections.forEach((peerInfo, peerId) => {
        const connection = peerInfo.connection;
        
        this.localStream!.getTracks().forEach(track => {
          connection.addTrack(track, this.localStream!);
        });
      });
    }
  }
}

// Create a singleton instance
export const webRTCService = new WebRTCService();
