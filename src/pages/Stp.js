import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Stp.css";
import StpPacketWorker from "./stpPacketWorker.js"; // Import the worker script


// Helper function to get the smallest available ID greater than 1
const getNextAvailableId = (usedIds) => {
  let id = 2; // Start checking from ID 2
  while (usedIds.has(id)) {
    id++;
  }
  return id;
};

const Stp = () => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [packets, setPackets] = useState([]); // Store packets being transferred
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [hoveredPacket, setHoveredPacket] = useState(null); // Track hovered packet
  const [workers, setWorkers] = useState({}); // Store Web Workers for each node

  const usedIds = new Set(nodes.map((node) => node.id));

  useEffect(() => {
    // Clean up workers on component unmount
    return () => {
      Object.values(workers).forEach((worker) => {
        if (worker && typeof worker.terminate === "function") {
          worker.terminate();
        }
      });
    };
  }, [workers]);

  const init_stp = async () => {
    console.log("STP Initiated");
    console.log('workers:', workers);

    // For each node, send out a message to all nodes except itself
    nodes.forEach((node) => {
      for (const key in workers) {
        if (workers.hasOwnProperty(key) && key !== node.id.toString()) {
        const worker = workers[key];
        console.log(`Sending message to worker: ${key} from node: ${node.id}`);
        var stp_packet = {
          id: Math.random(), // Unique packet ID
          source: node,
          target: key,
          progress: 0, // Initial progress from source to target (0 to 1)
          rootId: node.id,
          hopCount: 0,
          nextHop: node.id,
          speed_factor: 100
        };
        worker.postMessage({ type: "receivePacket", data: stp_packet });
        }
      }
    });
  };

  const createWorkerForNode = (nodeId) => {
    try {
      const worker = new Worker(new URL('./stpPacketWorker.js', import.meta.url));
      worker.postMessage({ type: "init", data: { nodeId: nodeId, rootId: nodeId, hopCount: 0, speed_factor: 100, nextHop: nodeId } });
      console.log("Worker created for Node:", nodeId);
      worker.onmessage = (e) => {
        console.log(`Main thread received message from worker for Node ${nodeId}:`, e.data);
        const { recv_type, nid, recv_packet } = e.data;
        switch (recv_type) {
          case "packetReceived":
            nodes.forEach((node) => {
              if (node.id === nodeId) {
                node.rootId = recv_packet.rootId;
                node.hopCount = recv_packet.hopCount + 1;
                node.nextHop = recv_packet.nextHop;
              }
            });
            break;
          default:
            console.error("Unknown message type:", recv_type);
        }
      };
      return worker;
    } catch (error) {
      console.error("Error creating worker for node:", error);
    }
  };

  // Helper function to find or create a port for a node
  const getOrCreatePort = (node, targetId) => {
    const existingLink = node.ports.find((port) => port.targetId === targetId);
    if (existingLink) return existingLink.portNumber;

    const newPortNumber = node.ports.length;
    node.ports.push({ targetId, portNumber: newPortNumber, status: "Blocked" }); // Default to "Blocked"
    return newPortNumber;
  };

  // Add a new node
  const handleCanvasClick = async (e) => {
    const canvas = e.target.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;

    const clickedNode = nodes.find((node) => Math.hypot(node.x - x, node.y - y) < 30);

    if (clickedNode) {
      // If a node is clicked, select/deselect it
      if (isLinking) {
        if (selectedNode && selectedNode !== clickedNode) {
          // Create a link if linking is in progress and nodes are different
          const newLink = { source: selectedNode, target: clickedNode };
          setLinks([...links, newLink]);
          setSelectedNode(null);
          setIsLinking(false);

          // Update ports for both nodes
          setNodes((prevNodes) =>
            prevNodes.map((node) => {
              if (node === selectedNode) {
                return {
                  ...node,
                  ports: [...node.ports, { portNumber: node.ports.length, targetId: clickedNode.id, status: "Blocked" }],
                };
              } else if (node === clickedNode) {
                return {
                  ...node,
                  ports: [...node.ports, { portNumber: node.ports.length, targetId: selectedNode.id, status: "Blocked" }],
                };
              }
              return node;
            })
          );
        }
      } else {
        // Select or deselect node
        setSelectedNode((prev) => (prev === clickedNode ? null : clickedNode));
      }
    } else {
      // Add new node if not clicking on an existing one
      if (!isLinking) {
        const newId = getNextAvailableId(usedIds);
        const newNode = {
          id: newId,
          x,
          y,
          ports: [],
          rootId: newId,
          hopCount: 0,
          nextHop: newId,
        };
        setNodes([...nodes, newNode]);
  
        // Create a worker for the new node
        const worker = createWorkerForNode(newNode.id);
        if (worker) {
            workers[newNode.id] = worker;
        }
      } else {
        setIsLinking(false);
        setSelectedNode(null);
      }
    }
  };

  // Delete a node
  const handleDelete = () => {
    if (selectedNode) {
      setNodes(nodes.filter((node) => node !== selectedNode));
      // Remove the worker associated with the selected node
      for (const key in workers) {
        if (workers.hasOwnProperty(key)) {
          if (key == selectedNode.id) {
            delete workers[key];
          }
        }
      }
      setLinks(links.filter((link) => link.source !== selectedNode && link.target !== selectedNode));
      usedIds.delete(selectedNode.id);
      setSelectedNode(null);
    }
  };

  // Start linking mode
  const handleLink = () => {
    if (selectedNode) {
      setIsLinking(true);
    }
  };

  // Function to send a packet
  const sendPacket = (sourceNode, targetNodeId) => {
    const targetNode = nodes.find((node) => node.id === targetNodeId);
    if (targetNode) {
      // Create a packet object
      const packet = {
        id: Math.random(), // Unique packet ID
        source: sourceNode,
        target: targetNode,
        progress: 0, // Initial progress from source to target (0 to 1)
        rootId: sourceNode.rootId,
        hopCount: sourceNode.hopCount + 1,
        nextHop: targetNode.id,
      };
      setPackets([...packets, packet]);
    }
  };

  // Update packet movement over time
  const updatePackets = () => {
    setPackets((prevPackets) =>
      prevPackets
        .map((packet) => {
          if (packet.progress < 1) {
            return { ...packet, progress: packet.progress + 0.02 }; // Increment progress
          } else {
            // Detect packet arrival at the target node and port
            const targetPort = packet.target.ports.find(
              (port) => port.targetId === packet.source.id
            );
            if (targetPort) {
              console.log(
                `Packet arrived at Node ${packet.target.id} on Port ${targetPort.portNumber}`
              );
            }
            return null; // Remove packet once it's reached its destination
          }
        })
        .filter((packet) => packet !== null)
    );
  };

  // Start packet updates
  React.useEffect(() => {
    const interval = setInterval(updatePackets, 50); // Update packets every 50ms
    return () => clearInterval(interval);
  }, [packets]);

  // Calculate the packet position along a link
  const calculatePacketPosition = (packet) => {
    const { source, target, progress } = packet;
    const x = source.x + (target.x - source.x) * progress;
    const y = source.y + (target.y - source.y) * progress;
    return { x, y };
  };

  return (
    <div className="canvas-container">
      <div className="canvas">
        <motion.div className="canvas-element" onClick={handleCanvasClick}>
          {/* Render links between nodes */}
          <svg className="link-line">
            {links.map((link, index) => (
              <line
                key={index}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke="gray"
                strokeWidth="2"
              />
            ))}
          </svg>

          {/* Render nodes using Framer Motion */}
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3 }}
                className={`node ${node === selectedNode ? "selected" : "default"}`}
                style={{
                  top: node.y - 30,
                  left: node.x - 30,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLinking) {
                    if (selectedNode && selectedNode !== node) {
                      const sourcePort = getOrCreatePort(selectedNode, node.id);
                      const targetPort = getOrCreatePort(node, selectedNode.id);
                      setLinks([...links, { source: selectedNode, sourcePort, target: node, targetPort }]);
                      setIsLinking(false);
                      setSelectedNode(null);
                    }
                  } else {
                    setSelectedNode((prev) => (prev === node ? null : node));
                  }
                }}
              >
                {node.id}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Render packets moving over links */}
          {packets.map((packet) => {
            const { x, y } = calculatePacketPosition(packet);
            return (
              <motion.div
                key={packet.id}
                className="packet"
                style={{
                  top: y - 5,
                  left: x - 5,
                }}
                onMouseEnter={() => setHoveredPacket(packet)}
                onMouseLeave={() => setHoveredPacket(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {hoveredPacket && hoveredPacket.id === packet.id && (
                  <div className="packet-info">
                    <p>Root ID: {packet.rootId}</p>
                    <p>Hop Count: {packet.hopCount}</p>
                    <p>Next Hop: {packet.nextHop}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Node Information Table */}
        {selectedNode && (
          <div className="node-info">
            <h3>Node Information</h3>
            <p>Root ID: {selectedNode.rootId}</p>
            <p>Hop Count to Root: {selectedNode.hopCount}</p>
            <p>Node Address: {selectedNode.id}</p>

            {/* Connections Table */}
            <h3>Connections</h3>
            <table>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Connected Node</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedNode.ports.map((port, index) => (
                  <tr key={index}>
                    <td>{port.portNumber}</td>
                    <td>{port.targetId}</td>
                    <td>{port.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Control Panel */}
        <div className="control-buttons">
          <button onClick={handleLink} disabled={!selectedNode || isLinking}>
            {isLinking ? "Click to Link" : "Link Nodes"}
          </button>
          <button onClick={handleDelete} disabled={!selectedNode}>
            Delete Node
          </button>
          <button onClick={init_stp} disabled={!selectedNode}>
            Start STP
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stp;
