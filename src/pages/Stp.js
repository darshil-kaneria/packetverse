import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Stp.css";

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
  const [packets, setPackets] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [hoveredPacket, setHoveredPacket] = useState(null);
  const [webSocket, setWebSocket] = useState(null);

  const usedIds = new Set(nodes.map((node) => node.id));

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket("ws://localhost:8080/ws");
    setWebSocket(ws);

    ws.onmessage = handleWebSocketMessage;

    return () => {
      ws.close(); // Clean up WebSocket on unmount
    };
  }, []);

  const getOrCreatePort = (node, targetId) => {
    const existingLink = node.ports.find((port) => port.targetId === targetId);
    if (existingLink) return existingLink.portNumber;

    const newPortNumber = node.ports.length;
    node.ports.push({ targetId, portNumber: newPortNumber, status: "Blocked" }); // Default to "Blocked"
    return newPortNumber;
  };

  const handleWebSocketMessage = (event) => {
    const message = JSON.parse(event.data);
    // Update nodes, links, packets based on the received message
    if (message.type === "update") {
      setNodes(message.nodes);
      setLinks(message.links);
      setPackets(message.packets);
    }
  };

  const init_stp = async () => {
    if (!webSocket) {
      console.error("WebSocket is not initialized.");
      return;
    }
  
    const topologyData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        rootId: node.rootId,
        hopCount: node.hopCount,
        nextHop: node.nextHop,
        ports: node.ports.map((port) => ({
          targetId: port.targetId,
          portNumber: port.portNumber,
          status: port.status, // Include the status (Blocked/Unblocked)
        })),
      })),
      links: links.map((link) => ({
        sourceId: link.source.id,
        targetId: link.target.id,
      })),
    };
  
    webSocket.send(JSON.stringify({ type: "initSTP", data: topologyData }));
    console.log("Topology data sent to server:", topologyData);
  };

  const handleCanvasClick = (e) => {
    const canvas = e.target.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;

    const clickedNode = nodes.find((node) => Math.hypot(node.x - x, node.y - y) < 30);

    if (clickedNode) {
      if (isLinking) {
        if (selectedNode && selectedNode !== clickedNode) {
          const newLink = { source: selectedNode, target: clickedNode };
          setLinks([...links, newLink]);
          setSelectedNode(null);
          setIsLinking(false);
        }
      } else {
        setSelectedNode((prev) => (prev === clickedNode ? null : clickedNode));
      }
    } else {
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
      } else {
        setIsLinking(false);
        setSelectedNode(null);
      }
    }
  };

  const handleDelete = () => {
    if (selectedNode) {
      setNodes(nodes.filter((node) => node !== selectedNode));
      setLinks(links.filter((link) => link.source !== selectedNode && link.target !== selectedNode));
      usedIds.delete(selectedNode.id);
      setSelectedNode(null);
    }
  };

  const handleLink = () => {
    if (selectedNode) {
      setIsLinking(true);
    }
  };

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
          {/* Render links and nodes */}
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

        {selectedNode && (
          <div className="node-info">
            <h3>Node Information</h3>
            <p>Root ID: {selectedNode.rootId}</p>
            <p>Hop Count to Root: {selectedNode.hopCount}</p>
            <p>Node Address: {selectedNode.id}</p>
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
