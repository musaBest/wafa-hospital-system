import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppLayout({ children, activeModule = 'patients', onSelectModule }) {
  return (
    <div className="app-container">
      {/* Hospital Navigation Sidebar */}
      <Sidebar activeModule={activeModule} onSelectModule={onSelectModule} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header />
        <main className="main-body">{children}</main>
      </div>
    </div>
  );
}
