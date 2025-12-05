"use client";

import React, { useState, useEffect } from "react";
import ParkingGate from "@/components/ParkingGate";
import UltrasonicSensor from "@/components/UltrasonicSensor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useMqtt } from "@/hooks/useMqtt";

const MQTT_BROKER_URL = "ws://broker.hivemq.com:8000/mqtt"; // Kembali ke MQTT over WebSockets pada port 8000
const MQTT_TOPIC = "parking/distance";

const ParkingGateDashboard: React.FC = () => {
  const { message: mqttMessage, isConnected } = useMqtt({
    brokerUrl: MQTT_BROKER_URL,
    topic: MQTT_TOPIC,
  });
  const [distance, setDistance] = useState<number>(50);
  const [isGateOpen, setIsGateOpen] = useState<boolean>(false);

  useEffect(() => {
    if (mqttMessage !== null) {
      const parsedDistance = parseInt(mqttMessage, 10);
      if (!isNaN(parsedDistance)) {
        setDistance(parsedDistance);
      }
    }
  }, [mqttMessage]);

  useEffect(() => {
    if (distance < 20) {
      setIsGateOpen(true);
    } else {
      setIsGateOpen(false);
    }
  }, [distance]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Dashboard Gerbang Parkir</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <UltrasonicSensor distance={distance} />
        <ParkingGate isOpen={isGateOpen} />
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
            Mendengarkan topik: <span className="font-mono">{MQTT_TOPIC}</span>
          </p>
          <p className="text-sm text-gray-500">
            Broker: <span className="font-mono">{MQTT_BROKER_URL}</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Pastikan Node-RED Anda mengirim data jarak (angka) ke topik ini.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ParkingGateDashboard;