/* eslint-disable no-restricted-globals */
// stpPacketWorker.js

self.hello_interval = 10000 * self.speed_factor;
self.reelection_interval = 100000 * self.speed_factor;

function broadcastSelfAsRoot() {
    console.log(`Node ${self.nodeId} broadcasting itself as root`);
    self.postMessage({
        type: "packetToSend",
        nodeId: self.nodeId,
        packet: {
            rootId: self.nodeId,
            hopCount: 0,
            nextHop: self.nodeId
        }
    });

    // if (self.intervalId !== null) {
    //     clearInterval(self.intervalId);
    // }
    // self.intervalId = setInterval(broadcastSelfAsRoot, self.hello_interval);
}

self.onmessage = function (e) {
    console.log("Worker received message:", e.data); // Debug statement
    const { type, data } = e.data;
  
    switch (type) {
        case "init":
            self.nodeId = data.nodeId;
            self.rootId = data.rootId
            self.hopCount = data.hopCount;
            self.nextHop = data.nextHop;
            self.speed_factor = data.speed_factor;
            console.log(`Node ${self.nodeId} sending packet with rootId ${self.rootId}, hopCount ${self.hopCount}, nextHop ${self.nextHop}`);
            self.postMessage({
                type: "packetReceived",
                nodeId: self.nodeId,
                packet: {
                    rootId: self.rootId,
                    hopCount: self.hopCount,
                    nextHop: self.nextHop
                }
            });
            // self.intervalId = setInterval(broadcastSelfAsRoot, self.hello_interval);
            console.log(`Worker for Node ${self.nodeId} initialized`);
            break;  
        case "sendPacket":
            sendPacket(data.targetNodeId, data.packet);
            break;
        case "receivePacket":
            receivePacket(data);
            break;
        default:
            console.error("Unknown message type:", type);
    }
  };
  
  function sendPacket(targetNodeId, packet) {
    console.log(`Node ${self.nodeId} sending packet to Node ${targetNodeId}`);
    // Add logic to send packet
  }
  
function receivePacket(packet) {
    console.log(`Node ${self.nodeId} received packet:`, packet);
    // Add logic to handle packet reception
    if (packet.rootId < self.rootId) {
        self.rootId = packet.rootId;
        self.hopCount = packet.hopCount + 1;
        self.nextHop = packet.nextHop;
    } else if (packet.rootId === self.rootId && packet.hopCount + 1 < self.hopCount) {
        self.hopCount = packet.hopCount + 1;
        self.nextHop = packet.nextHop;
    } else if (packet.rootId === self.rootId && packet.hopCount + 1 === self.hopCount && packet.nextHop < self.nextHop) {
        self.nextHop = packet.nextHop;
    } else if (packet.rootId === self.rootId && packet.hopCount + 1 === self.hopCount && packet.nextHop === self.nextHop) {
        // Reset reelection timer
        if (self.intervalId !== null) {
            clearInterval(self.intervalId);
        }
        self.intervalId = setInterval(broadcastSelfAsRoot, self.reelection_interval);
    }

    // Example of sending a message back to the main thread
    console.log(`Node ${self.nodeId} sending packet with rootId ${self.rootId}, hopCount ${self.hopCount}, nextHop ${self.nextHop}`);
    self.postMessage({
        type: "packetReceived",
        nodeId: self.nodeId,
        packet: {
            rootId: self.rootId,
            hopCount: self.hopCount,
            nextHop: self.nextHop
        }
    });
}