"use client";

import React, { useState, useEffect, useRef } from "react";
import LEDIndicator from "@/components/LEDIndicator";
import UltrasonicSensor from "@/components/UltrasonicSensor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useMqtt } from "@/hooks/useMqtt";
import { format } from "date-fns";
import { Car, XCircle, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MQTT_BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";
const MQTT_TOPICS_SUBSCRIBE = [
  "parking/distance",
  "parking/exitDistance",
  "parking/dashboard_data",
];
const MQTT_TOPIC_DASHBOARD_DATA = "parking/dashboard_data";

const MAX_PARKING_CAPACITY = 20;
const LOCAL_STORAGE_KEY_COUNT = "parking_vehicle_entry_count";
const LOCAL_STORAGE_KEY_LAST_ENTRY = "parking_last_entry_time";
const LOCAL_STORAGE_KEY_DAILY_ENTRY_COUNT = "parking_daily_entry_count";
const LOCAL_STORAGE_KEY_DAILY_ENTRY_DATE = "parking_daily_entry_date";
const LOCAL_STORAGE_KEY_DAILY_EXIT_COUNT = "parking_daily_exit_count";
const LOCAL_STORAGE_KEY_DAILY_EXIT_DATE = "parking_daily_exit_date";

const ParkingGateDashboard: React.FC = () => {
  const {
    distance: mqttEntryDistance,
    exitDistance: mqttExitDistance,
    isConnected,
    publish,
  } = useMqtt({
    brokerUrl: MQTT_BROKER_URL,
    topics: MQTT_TOPICS_SUBSCRIBE,
  });

  const [entryDistance, setEntryDistance] = useState<number>(50);
  const [exitDistance, setExitDistance] = useState<number>(50);
  const [isEntryGateOpen, setIsEntryGateOpen] = useState<boolean>(false);
  const [isExitGateOpen, setIsExitGateOpen] = useState<boolean>(false);
  
  const [vehicleEntryCount, setVehicleEntryCount] = useState<number>(() => {
    const storedCount = localStorage.getItem(LOCAL_STORAGE_KEY_COUNT);
    return storedCount ? parseInt(storedCount, 10) : 0;
  });
  const [lastEntryTime, setLastEntryTime] = useState<Date | null>(() => {
    const storedTime = localStorage.getItem(LOCAL_STORAGE_KEY_LAST_ENTRY);
    return storedTime ? new Date(storedTime) : null;
  });

  const [dailyEntryCount, setDailyEntryCount] = useState<number>(0);
  const [dailyExitCount, setDailyExitCount] = useState<number>(0);

  const [isParkingFull, setIsParkingFull] = useState<boolean>(false);

  const prevIsEntryGateOpenRef = useRef(false);
  const prevIsExitGateOpenRef = useRef(false);

  // Effect untuk mempublikasikan semua data dashboard ke satu topik MQTT
  useEffect(() => {
    if (isConnected) {
      const dashboardData = {
        currentVehicles: vehicleEntryCount,
        parkingStatus: isParkingFull ? "Penuh" : "Tersedia",
        dailyEntry: dailyEntryCount,
        dailyExit: dailyExitCount,
        timestamp: new Date().toISOString(),
      };
      publish(MQTT_TOPIC_DASHBOARD_DATA, JSON.stringify(dashboardData));
    }
  }, [vehicleEntryCount, isParkingFull, dailyEntryCount, dailyExitCount, isConnected, publish]);

  // Effect untuk inisialisasi hitungan harian dari localStorage atau mereset jika hari berbeda
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Inisialisasi daily entry count
    const storedDailyEntryCount = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_COUNT);
    const storedDailyEntryDate = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_DATE);
    if (storedDailyEntryDate === today && storedDailyEntryCount !== null) {
      setDailyEntryCount(parseInt(storedDailyEntryCount, 10));
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_COUNT, "0");
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_DATE, today);
      setDailyEntryCount(0);
    }

    // Inisialisasi daily exit count
    const storedDailyExitCount = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_EXIT_COUNT);
    const storedDailyExitDate = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_EXIT_DATE);
    if (storedDailyExitDate === today && storedDailyExitCount !== null) {
      setDailyExitCount(parseInt(storedDailyExitCount, 10));
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_EXIT_COUNT, "0");
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_EXIT_DATE, today);
      setDailyExitCount(0);
    }
  }, []); // Hanya berjalan sekali saat komponen dimuat

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

  // Logika untuk membuka/menutup gerbang keluar berdasarkan jarak DAN jumlah kendaraan di parkir
  useEffect(() => {
    if (exitDistance < 20 && vehicleEntryCount > 0) {
      setIsExitGateOpen(true);
    } else {
      setIsExitGateOpen(false);
    }
  }, [exitDistance, vehicleEntryCount]);

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

      // Increment daily entry count
      setDailyEntryCount((prev) => {
        const updatedDailyCount = prev + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_COUNT, updatedDailyCount.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_DATE, format(new Date(), "yyyy-MM-dd"));
        return updatedDailyCount;
      });
    }
    prevIsEntryGateOpenRef.current = isEntryGateOpen;
  }, [isEntryGateOpen, vehicleEntryCount]);

  // Logika untuk mengurangi jumlah kendaraan saat gerbang keluar terbuka
  useEffect(() => {
    const prevIsExitGateOpen = prevIsExitGateOpenRef.current;
    if (isExitGateOpen && !prevIsExitGateOpen) {
      const newCount = Math.max(0, vehicleEntryCount - 1);
      setVehicleEntryCount(newCount);
      localStorage.setItem(LOCAL_STORAGE_KEY_COUNT, newCount.toString());
      toast.info("Kendaraan keluar!");

      // Increment daily exit count
      setDailyExitCount((prev) => {
        const updatedDailyCount = prev + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_EXIT_COUNT, updatedDailyCount.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_EXIT_DATE, format(new Date(), "yyyy-MM-dd"));
        return updatedDailyCount;
      });
    }
    prevIsExitGateOpenRef.current = isExitGateOpen;
  }, [isExitGateOpen, vehicleEntryCount]);

  const handleReset = () => {
    // Hanya mereset hitungan harian
    setDailyEntryCount(0);
    setDailyExitCount(0);

    localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_COUNT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY_ENTRY_DATE);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY_EXIT_COUNT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY_EXIT_DATE);

    toast.success("Data harian telah direset!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Dashboard Gerbang Parkir</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Harian
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
            <LEDIndicator isOn={isEntryGateOpen} label="LED Gerbang Masuk" />
          </CardContent>
        </Card>

        {/* Jalur Keluar */}
        <Card className="flex flex-col items-center gap-4 p-6">
          <CardHeader className="w-full text-center">
            <CardTitle className="text-2xl">Jalur Keluar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <UltrasonicSensor distance={exitDistance} />
            <LEDIndicator isOn={isExitGateOpen} label="LED Gerbang Keluar" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 w-full max-w-6xl"> {/* Mengubah grid-cols-4 menjadi grid-cols-2 */}
        {/* Card untuk Jumlah Kendaraan di Parkir */}
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

        {/* Card untuk Masuk Hari Ini dan Keluar Hari Ini telah dihapus dari tampilan */}
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
            Mendengarkan topik: <span className="font-mono">{MQTT_TOPICS_SUBSCRIBE.join(", ")}</span>
          </p>
          <p className="text-sm text-gray-500">
            Broker: <span className="font-mono">{MQTT_BROKER_URL}</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Pastikan Node-RED Anda mengirim data jarak (angka) ke topik `parking/distance` (masuk) dan `parking/exitDistance` (keluar).
            Data dashboard gabungan akan dipublikasikan ke topik `parking/dashboard_data`.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ParkingGateDashboard;