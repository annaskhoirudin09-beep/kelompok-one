"use client";

import React, { useState, useEffect, useRef } from "react"; // Import useRef
import ParkingGate from "@/components/ParkingGate";
import UltrasonicSensor from "@/components/UltrasonicSensor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useMqtt } from "@/hooks/useMqtt";
import { format } from "date-fns";

const MQTT_BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";
const MQTT_TOPICS = ["parking/distance"]; // Hanya berlangganan topik jarak

const ParkingGateDashboard: React.FC = () => {
  const {
    distance: mqttDistance,
    isConnected,
  } = useMqtt({
    brokerUrl: MQTT_BROKER_URL,
    topics: MQTT_TOPICS,
  });

  const [distance, setDistance] = useState<number>(50);
  const [isGateOpen, setIsGateOpen] = useState<boolean>(false);
  const [vehicleEntryCount, setVehicleEntryCount] = useState<number>(0); // State lokal untuk counter
  const [lastEntryTime, setLastEntryTime] = useState<Date | null>(null); // State lokal untuk waktu update

  const prevIsGateOpenRef = useRef(false); // Ref untuk melacak status gerbang sebelumnya

  useEffect(() => {
    if (mqttDistance !== null) {
      setDistance(mqttDistance);
    }
  }, [mqttDistance]);

  // Logika untuk membuka/menutup gerbang berdasarkan jarak
  useEffect(() => {
    if (distance < 20) {
      setIsGateOpen(true);
    } else {
      setIsGateOpen(false);
    }
  }, [distance]);

  // Logika untuk menghitung kendaraan saat gerbang terbuka
  useEffect(() => {
    const prevIsGateOpen = prevIsGateOpenRef.current;
    if (isGateOpen && !prevIsGateOpen) { // Deteksi transisi dari tertutup ke terbuka
      setVehicleEntryCount((prevCount) => prevCount + 1);
      setLastEntryTime(new Date());
    }
    prevIsGateOpenRef.current = isGateOpen; // Perbarui ref untuk siklus render berikutnya
  }, [isGateOpen]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Dashboard Gerbang Parkir</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <UltrasonicSensor distance={distance} />
        <ParkingGate isOpen={isGateOpen} />

        {/* Card untuk Jumlah Kendaraan Masuk (berdasarkan pembukaan palang) */}
        <Card className="w-64 text-center">
          <CardHeader>
            <CardTitle>Jumlah Kendaraan Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold">
              {vehicleEntryCount}
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
            Pastikan Node-RED Anda mengirim data jarak (angka) ke topik `parking/distance`.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ParkingGateDashboard;