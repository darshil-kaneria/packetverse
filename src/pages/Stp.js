import React, { useState } from "react";
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

// Helper function to get a random port status
const getRandomPortStatus = () => Math.random() > 0.5 ? "Blocked" : "Unblocked";

const Stp = () => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLinking, setIsLinking] = useState(false);

  // Track used IDs
  const usedIds = new Set(nodes.map((node) => node.id));

  // Helper function to find or create a port for a node
  const getOrCreatePort = (node, targetId) => {
    const existingLink = node.ports.find((port) => port.targetId === targetId);
    if (existingLink) return existingLink.portNumber;

    const newPortNumber = node.ports.length;
    node.ports.push({ targetId, portNumber: newPortNumber, status: "Blocked" }); // Default to "Blocked"
    return newPortNumber;
  };

  // Add a new node
  const handleCanvasClick = (e) => {
    const canvas = e.target.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;

    const clickedNode = nodes.find(
      (node) => Math.hypot(node.x - x, node.y - y) < 30
    );

    if (clickedNode) {
      if (isLinking) {
        if (selectedNode && selectedNode !== clickedNode) {
          const sourcePort = getOrCreatePort(selectedNode, clickedNode.id);
          const targetPort = getOrCreatePort(clickedNode, selectedNode.id);
          setLinks([...links, { source: selectedNode, sourcePort, target: clickedNode, targetPort }]);
          setIsLinking(false);
          setSelectedNode(null);
        }
      } else {
        setSelectedNode((prev) => (prev === clickedNode ? null : clickedNode));
      }
    } else {
      if (!isLinking) {
        // Assign smallest available ID
        const newId = getNextAvailableId(usedIds);
        setNodes([...nodes, { 
          id: newId, 
          x, 
          y, 
          ports: [], 
          rootId: newId, // Initialize rootId to its own ID
          hopCount: 0 // Initialize hop count to 0
        }]);
        usedIds.add(newId); // Add the new ID to the set of used IDs
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
      setLinks(
        links.filter(
          (link) =>
            link.source !== selectedNode && link.target !== selectedNode
        )
      );
      usedIds.delete(selectedNode.id); // Remove ID from used IDs
      setSelectedNode(null);
    }
  };

  // Start linking mode
  const handleLink = () => {
    if (selectedNode) {
      setIsLinking(true);
    }
  };

  return (
    <div className="canvas-container">
      <div className="canvas">
        <motion.div
          className="canvas-element"
          onClick={handleCanvasClick}
        >
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
                {node.id} {/* Display the node ID */}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Node Information Table */}
        {selectedNode && (
          <div className="node-info">
            <h3>Node Information</h3>
            <table>
              <tbody>
                <tr>
                  <td>Root ID:</td>
                  <td>{selectedNode.rootId}</td> {/* Node's root ID */}
                </tr>
                <tr>
                  <td>Hop Count to Root:</td>
                  <td>{selectedNode.hopCount}</td> {/* Node's hop count */}
                </tr>
                <tr>
                  <td>Node Address:</td>
                  <td>{selectedNode.id}</td> {/* Node ID as address */}
                </tr>
              </tbody>
            </table>

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
                {selectedNode.ports.map((port) => {
                  const targetNode = nodes.find((node) => node.id === port.targetId);
                  return (
                    <tr key={port.portNumber}>
                      <td>{port.portNumber}</td>
                      <td>{targetNode ? targetNode.id : "Unknown"}</td>
                      <td>{port.status}</td> {/* Display port status */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Control Buttons */}
        <div className="control-buttons">
          <button onClick={handleLink} disabled={!selectedNode || isLinking}>
            {isLinking ? "Click a Node to Link" : "Link Node"}
          </button>
          <button onClick={handleDelete} disabled={!selectedNode}>
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stp;
