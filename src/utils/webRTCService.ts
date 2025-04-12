
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
  private connectionAttempts: Map<string, number>;
  private maxConnectionAttempts: number = 3;

  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.roomId = '';
    this.userId = '';
    this.userName = '';
    this.connectionAttempts = new Map();
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
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
    
    // Ignore messages from self except for 'join' messages which we need to respond to
    if (message.type !== 'leave' && message.type !== 'join' && message.senderId === this.userId) {
      console.log('Ignoring message from self');
      return;
    }
    
    switch (message.type) {
      case 'join':
        // Someone joined, send them an offer if it's not us
        if (message.senderId !== this.userId) {
          console.log(`Peer ${message.senderName} joined, creating peer connection`);
          await this.createPeerConnection(message.senderId, message.senderName);
        }
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
        console.log(`Connection already exists for peer ${peerName}, returning existing connection`);
        return existingConnection.connection;
      }
    }
    
    // Track connection attempts
    const attempts = this.connectionAttempts.get(peerId) || 0;
    if (attempts >= this.maxConnectionAttempts) {
      console.error(`Maximum connection attempts reached for peer ${peerName}`);
      throw new Error(`Maximum connection attempts reached for peer ${peerName}`);
    }
    this.connectionAttempts.set(peerId, attempts + 1);
    
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
      console.log(`Adding ${this.localStream.getTracks().length} local tracks to peer connection for ${peerName}`);
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
      });
    } else {
      console.warn('No local stream available to add to peer connection');
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerName}`);
        await this.sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          senderId: this.userId,
          senderName: this.userName
        });
      }
    };
    
    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerName}: ${peerConnection.iceConnectionState}`);
      if (peerConnection.iceConnectionState === 'failed') {
        console.log(`ICE connection failed with ${peerName}, restarting`);
        peerConnection.restartIce();
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
      console.log(`Received track from ${peerName}:`, event.track);
      
      // Create a new MediaStream with all tracks from the remote peer
      const remoteStream = new MediaStream();
      event.streams[0].getTracks().forEach(track => {
        console.log(`Adding track ${track.kind}:${track.id} to remote stream for ${peerName}`);
        remoteStream.addTrack(track);
      });
      
      console.log(`Created remote stream for ${peerName} with ${remoteStream.getTracks().length} tracks`);
      
      const peerInfo = this.peerConnections.get(peerId);
      if (peerInfo) {
        peerInfo.stream = remoteStream;
        this.peerConnections.set(peerId, peerInfo);
      }
      
      // Notify callback with the new stream
      this.callbacks.onRemoteStream(remoteStream, peerId, peerName);
    };
    
    // Create and send offer if we initiated the connection
    try {
      console.log(`Creating offer for ${peerName}`);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log(`Sending offer to ${peerName}`);
      await this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        senderName: this.userName
      });
    } catch (error) {
      console.error(`Error creating offer for ${peerName}:`, error);
      // Clean up on error
      peerConnection.close();
      this.peerConnections.delete(peerId);
      throw error;
    }
    
    return peerConnection;
  }

  // Handle incoming WebRTC offers
  private async handleOffer(message: SignalingOffer): Promise<void> {
    console.log(`Handling offer from: ${message.senderName}`);
    
    let peerConnection: RTCPeerConnection;
    
    // Get or create peer connection
    if (this.peerConnections.has(message.senderId)) {
      console.log(`Using existing connection for ${message.senderName}`);
      peerConnection = this.peerConnections.get(message.senderId)!.connection;
    } else {
      console.log(`Creating new connection for ${message.senderName} from offer`);
      peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      this.peerConnections.set(message.senderId, {
        connection: peerConnection,
        stream: null,
        name: message.senderName
      });
      
      // Add local tracks
      if (this.localStream) {
        console.log(`Adding ${this.localStream.getTracks().length} local tracks to peer connection for ${message.senderName}`);
        this.localStream.getTracks().forEach(track => {
          if (this.localStream) {
            peerConnection.addTrack(track, this.localStream);
          }
        });
      } else {
        console.warn('No local stream available to add to peer connection');
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${message.senderName}`);
          await this.sendSignalingMessage({
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            senderId: this.userId,
            senderName: this.userName
          });
        }
      };
      
      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${message.senderName}: ${peerConnection.iceConnectionState}`);
        if (peerConnection.iceConnectionState === 'failed') {
          console.log(`ICE connection failed with ${message.senderName}, restarting`);
          peerConnection.restartIce();
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
        console.log(`Received track from ${message.senderName}:`, event.track);
        
        // Create a new MediaStream with all tracks from the remote peer
        const remoteStream = new MediaStream();
        event.streams[0].getTracks().forEach(track => {
          console.log(`Adding track ${track.kind}:${track.id} to remote stream for ${message.senderName}`);
          remoteStream.addTrack(track);
        });
        
        console.log(`Created remote stream for ${message.senderName} with ${remoteStream.getTracks().length} tracks`);
        
        const peerInfo = this.peerConnections.get(message.senderId);
        if (peerInfo) {
          peerInfo.stream = remoteStream;
          this.peerConnections.set(message.senderId, peerInfo);
        }
        
        // Notify callback with the new stream
        this.callbacks.onRemoteStream(remoteStream, message.senderId, message.senderName);
      };
    }
    
    try {
      console.log(`Setting remote description for ${message.senderName}`);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      
      console.log(`Creating answer for ${message.senderName}`);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log(`Sending answer to ${message.senderName}`);
      await this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        senderId: this.userId,
        senderName: this.userName
      });
    } catch (error) {
      console.error(`Error handling offer from ${message.senderName}:`, error);
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
      console.log(`Setting remote description from answer for ${message.senderName}`);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
      console.log(`Remote description set successfully for ${message.senderName}`);
    } catch (error) {
      console.error(`Error handling answer from ${message.senderName}:`, error);
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
        console.log(`Adding ICE candidate from ${message.senderName}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log(`ICE candidate added successfully for ${message.senderName}`);
      }
    } catch (error) {
      console.error(`Error handling ICE candidate from ${message.senderName}:`, error);
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
      
      // Reset connection attempts counter
      this.connectionAttempts.delete(peerId);
      
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
    console.log(`Updating local stream${newStream ? ` with ID: ${newStream.id}` : ' (removing stream)'}`);
    
    // Remove old tracks from all connections
    if (this.localStream) {
      const senders = new Map();
      
      this.peerConnections.forEach((peerInfo, peerId) => {
        const connection = peerInfo.connection;
        senders.set(peerId, connection.getSenders());
      });
      
      this.localStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}:${track.id}`);
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
      console.log(`Adding ${this.localStream.getTracks().length} new tracks to all peer connections`);
      
      this.peerConnections.forEach((peerInfo, peerId) => {
        const connection = peerInfo.connection;
        console.log(`Adding tracks to connection for peer: ${peerInfo.name}`);
        
        this.localStream!.getTracks().forEach(track => {
          console.log(`Adding track ${track.kind}:${track.id} to connection for ${peerInfo.name}`);
          connection.addTrack(track, this.localStream!);
        });
      });
    }
  }
}

// Create a singleton instance
export const webRTCService = new WebRTCService();
