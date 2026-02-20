import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../utils/api';

const SocketCtx = createContext(null);

export function SocketProvider({ children, user }) {
  const socketRef = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const [cameraFrames, setCameraFrames] = useState({});
  const [sessionEvents, setSessionEvents] = useState(null);

  useEffect(() => {
    if (!user) return;
    const socket = io(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user.role === 'admin')     socket.emit('join_admin');
      if (user.role === 'professor') socket.emit('join_professor', { professor_id: user.id });
      if (user.role === 'student')   socket.emit('join_student', { student_id: user.id });
    });

    socket.on('attendance_alert', data => {
      setAlerts(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
    });

    socket.on('camera_frame', data => {
      setCameraFrames(prev => ({ ...prev, [data.course_id]: data }));
    });

    socket.on('session_complete', data => {
      setSessionEvents(data);
    });

    return () => socket.disconnect();
  }, [user]);

  const dismissAlert = id => setAlerts(prev => prev.filter(a => a.id !== id));

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current, alerts, cameraFrames, sessionEvents, dismissAlert }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
