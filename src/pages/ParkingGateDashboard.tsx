"use client";

import React, { useState, useEffect, useRef } from "react";
import ParkingGate from "@/components/ParkingGate";
import UltrasonicSensor from "@/components/UltrasonicSensor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useMqtt } from "@/hooks/useMqtt";
import { format } from "date-fns";
import { Car, XCircle, CheckCircle, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MQTT_BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";
const MQTT_TOPICS = ["parking/distance", "parking/exitDistance"]; // Tambahkan topik untuk sensor keluar

const MAX_PARKING_CAPACITY = 20;
const LOCAL_STORAGE_KEY_COUNT = "parking_vehicle_entry_count";
const LOCAL_STORAGE_KEY_LAST_ENTRY = "parking_last_entry_time";

const ParkingGateDashboard: React.FC = () => {
  const {
    distance: mqttEntryDistance, // Ganti nama untuk kejelasan
    exitDistance: mqttExitDistance, // Ambil jarak sensor keluar
    isConnected,
  } = useMqtt({
    brokerUrl: MQTT_BROKER_URL,
    topics: MQTT_TOPICS,
  });

  const [entryDistance, setEntryDistance] = useState<number>(50); // Jarak sensor masuk
  const [exitDistance, setExitDistance] = useState<number>(50); // Jarak sensor keluar
  const [isEntryGateOpen, setIsEntryGateOpen] = useState<boolean>(false); // Gerbang masuk
  const [isExitGateOpen, setIsExitGateOpen] = useState<boolean>(false); // Gerbang keluar
  
  const [vehicleEntryCount, setVehicleEntryCount] = useState<number>(() => {
    const storedCount = localStorage.getItem(LOCAL_STORAGE_KEY_COUNT);
    return storedCount ? parseInt(storedCount, 10) : 0;
  });
  const [lastEntryTime, setLastEntryTime] = useState<Date | null>(() => {
    const storedTime = localStorage.getItem(LOCAL_STORAGE_KEY_LAST_ENTRY);
    return storedTime ? new Date(storedTime) : null;
  });

  const [isParkingFull, setIsParkingFull] = useState<boolean>(false);

  const prevIsEntryGateOpenRef = useRef(false);
  const prevIsExitGateOpenRef = useRef(false); // Ref untuk gerbang keluar
  const navigate = useNavigate();

  // Update jarak sensor masuk
  useEffect(() => {
    if (mqttEntryDistance !== null) {
      setEntryDistance(mqttEntryDistance);
    }
  }, [mqttEntryDistance]);

  // Update jarak sensor keluar
  useEffect(() => {
    if (mqttExitDistance !== null) {
      setExitDistance(mqttExitDistance);
    }
  }, [mqttExitDistance]);

  // Logika untuk menentukan apakah parkir penuh
  useEffect(() => {
    setIsParkingFull(vehicleEntryCount >= MAX_PARKING_CAPACITY);
    localStorage.setItem(LOCAL_STORAGE_KEY_COUNT, vehicleEntryCount.toString());
  }, [vehicleEntryCount]);

  // Logika untuk membuka/menutup gerbang masuk berdasarkan jarak DAN status parkir
  useEffect(() => {
    if (entryDistance < 20 && !isParkingFull) {
      setIsEntryGateOpen(true);
    } else {
      setIsEntryGateOpen(false);
    }
  }, [entryDistance, isParkingFull]);

  // Logika untuk membuka/menutup gerbang keluar berdasarkan jarak
  useEffect(() => {
    if (exitDistance < 20) {
      setIsExitGateOpen(true);
    } else {
      setIsExitGateOpen(false);
    }
  }, [exitDistance]);

  // Logika untuk menambah jumlah kendaraan saat gerbang masuk terbuka
  useEffect(() => {
    const prevIsEntryGateOpen = prevIsEntryGateOpenRef.current;
    if (isEntryGateOpen && !prevIsEntryGateOpen) {
      const newCount = vehicleEntryCount + 1;
      setVehicleEntryCount(newCount);
      const newTime = new Date();
      setLastEntryTime(newTime);
      localStorage.setItem(LOCAL_STORAGE_KEY_LAST_ENTRY, newTime.toISOString());
      toast.success("Kendaraan masuk!");
    }
    prevIsEntryGateOpenRef.current = isEntryGateOpen;
  }, [isEntryGateOpen, vehicleEntryCount]);

  // Logika untuk mengurangi jumlah kendaraan saat gerbang keluar terbuka
  useEffect(() => {
    const prevIsExitGateOpen = prevIsExitGateOpenRef.current;
    if (isExitGateOpen && !prevIsExitGateOpen) {
      const newCount = Math.max(0, vehicleEntryCount - 1); // Pastikan tidak kurang dari 0
      setVehicleEntryCount(newCount);
      localStorage.setItem(LOCAL_STORAGE_KEY_COUNT, newCount.toString());
      toast.info("Kendaraan keluar!");
    }
    prevIsExitGateOpenRef.current = isExitGateOpen;
  }, [isExitGateOpen, vehicleEntryCount]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast.info("Anda telah logout.");
    navigate("/login");
  };

  const handleReset = () => {
    setVehicleEntryCount(0);
    setLastEntryTime(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY_COUNT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_LAST_ENTRY);
    toast.success("Data parkir telah direset!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Dashboard Gerbang Parkir</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 w-full max-w-6xl">
        {/* Jalur Masuk */}
        <Card className="flex flex-col items-center gap-4 p-6">
          <CardHeader className="w-full text-center">
            <CardTitle className="text-2xl">Jalur Masuk</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <UltrasonicSensor distance={entryDistance} />
            <ParkingGate isOpen={isEntryGateOpen} />
          </CardContent>
        </Card>

        {/* Jalur Keluar */}
        <Card className="flex flex-col items-center gap-4 p-6">
          <CardHeader className="w-full text-center">
            <CardTitle className="text-2xl">Jalur Keluar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <UltrasonicSensor distance={exitDistance} />
            <ParkingGate isOpen={isExitGateOpen} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 w-full max-w-6xl">
        {/* Card untuk Jumlah Kendaraan Masuk */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Car className="text-gray-600" />
              Kendaraan di Parkir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold">
              {vehicleEntryCount} / {MAX_PARKING_CAPACITY}
            </p>
            {lastEntryTime && (
              <Badge variant="secondary" className="mt-4">
                Terakhir Masuk: {format(lastEntryTime, "HH:mm:ss")}
              </Badge>
            )}
            {vehicleEntryCount === 0 && !lastEntryTime && (
              <p className="text-sm text-gray-500 mt-2">Belum ada kendaraan masuk</p>
            )}
          </CardContent>
        </Card>

        {/* Card untuk Status Parkir */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              {isParkingFull ? (
                <XCircle className="text-red-500" />
              ) : (
                <CheckCircle className="text-green-500" />
              )}
              Status Parkir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${isParkingFull ? "text-red-600" : "text-green-600"}`}>
              {isParkingFull ? "Penuh" : "Tersedia"}
            </p>
            {!isParkingFull && (
              <p className="text-sm text-gray-500 mt-2">
                Tersisa {MAX_PARKING_CAPACITY - vehicleEntryCount} slot
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-md p-6 text-center">
        <CardHeader>
          <CardTitle>Status Koneksi MQTT</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-lg font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}>
            {isConnected ? "Terhubung" : "Terputus"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Mendengarkan topik: <span className="font-mono">{MQTT_TOPICS.join(", ")}</span>
          </p>
          <p className="text-sm text-gray-500">
            Broker: <span className="font-mono">{MQTT_BROKER_URL}</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Pastikan Node-RED Anda mengirim data jarak (angka) ke topik `parking/distance` (masuk) dan `parking/exitDistance` (keluar).
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ParkingGateDashboard;