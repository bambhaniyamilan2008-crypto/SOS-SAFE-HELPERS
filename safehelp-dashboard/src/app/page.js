// src/app/page.js
"use client";
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, MapPin, Phone, ShieldAlert, Users, Clock } from 'lucide-react';

// ASLI FIREBASE IMPORTS
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. LIVE FIREBASE LISTENER (Real-time data aayega)
  useEffect(() => {
    // 'sos_alerts' naam ke folder (collection) par nazar rakhega
    const q = query(collection(db, "sos_alerts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alertsData = [];
      querySnapshot.forEach((doc) => {
        alertsData.push({ id: doc.id, ...doc.data() });
      });
      setAlerts(alertsData);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // 2. ACTION BUTTON: Asli Resolve Function (Database update karega)
  const markAsResolved = async (alertId) => {
    try {
      const alertRef = doc(db, "sos_alerts", alertId);
      await updateDoc(alertRef, {
        status: "resolved",
        resolvedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      alert("Oops! Database update nahi hua.");
    }
  };

  // Active emergencies count
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
          <ShieldAlert className="text-red-500 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-wider">SafeHelp</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center gap-3 p-3 bg-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/30">
            <AlertCircle className="w-5 h-5" /> Active Alerts
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition">
            <Users className="w-5 h-5" /> Campus Volunteers
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition">
            <MapPin className="w-5 h-5" /> Campus Map
          </a>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Caregiver Command Center</h2>
            <p className="text-gray-500 mt-1">Live SOS monitoring from Firebase Database</p>
          </div>
          
          {activeCount > 0 ? (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              {activeCount} Active Emergency
            </div>
          ) : (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              All Clear & Safe
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500 text-xl font-bold animate-pulse">
            Connecting to Rescue Server...
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700">No Active Alerts!</h3>
            <p className="text-gray-500">The campus is completely safe right now.</p>
          </div>
        ) : (
          /* ALERTS GRID */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-6 rounded-2xl border-2 transition-all ${alert.status === 'active' ? 'bg-white border-red-500 shadow-xl shadow-red-100' : 'bg-gray-100 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-full ${alert.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {alert.status === 'active' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1">{alert.userName || "Unknown User"}</h3>
                <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded mb-4">
                  {alert.disabilityType || "General Public"}
                </span>
                
                <div className="space-y-2 mb-6">
                  <p className="text-gray-600 flex items-center gap-2 font-medium">
                    <MapPin className="w-5 h-5 text-gray-400" /> {alert.locationName || "GPS Location Sent"}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2 font-medium">
                    <Phone className="w-5 h-5 text-gray-400" /> {alert.phone || "No Phone Registered"}
                  </p>
                </div>

                {alert.status === 'active' ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => markAsResolved(alert.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition">
                      Mark as Resolved
                    </button>
                    <button className="px-4 bg-gray-900 hover:bg-black text-white rounded-xl transition" onClick={() => window.open(`https://maps.google.com/?q=${alert.lat},${alert.lng}`, '_blank')}>
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button disabled className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-bold">
                    Resolved & Safe
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}