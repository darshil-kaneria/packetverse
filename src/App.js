import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.js';
import Stp from './pages/Stp.js';
import Dv from './pages/Dv.js';
import Bgp from './pages/Bgp.js';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Sidebar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Stp />} />
            <Route path="/stp" element={<Stp />} />
            <Route path="/dv" element={<Dv />} />
            <Route path="/bgp" element={<Bgp />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
