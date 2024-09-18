import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Network Playground</h2>
      <ul>
        {/* <li><Link to="/">Spanning Tree Protocol</Link></li> */}
        <li><Link to="/stp">Spanning Tree Protocol</Link></li>
        <li><Link to="/dv">Distance Vector Protocol</Link></li>
        <li><Link to="/bgp">Border Gateway Protocol</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
