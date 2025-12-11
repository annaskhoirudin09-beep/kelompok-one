"use client";

import { useEffect, useState } from "react";
import mqtt from "mqtt";
import { toast } from "sonner";

interface MqttHookOptions {
  brokerUrl: string;
  topics: string[]; // Mengubah topic menjadi array of topics
}

interface MqttMessageState {
  [topic: string]: {
    payload: string | null;
    timestamp: Date | null;
  };
}

export function useMqtt({ brokerUrl, topics }: MqttHookOptions) {
  const [messages, setMessages] = useState<MqttMessageState>(
    topics.reduce((acc, topic) => ({
      ...acc,
      [topic]: { payload: null, timestamp: null },
    }), {})
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const client = mqtt.connect(brokerUrl);

    client.on("connect", () => {
      setIsConnected(true);
      toast.success("Terhubung ke broker MQTT!");
      topics.forEach((topic) => {
        client.subscribe(topic, (err) => {
          if (!err) {
            toast.info(`Berlangganan topik: ${topic}`);
          } else {
            toast.error(`Gagal berlangganan topik ${topic}: ${err.message}`);
          }
        });
      });
    });

    client.on("message", (receivedTopic, receivedMessage) => {
      if (topics.includes(receivedTopic)) {
        setMessages((prevMessages) => ({
          ...prevMessages,
          [receivedTopic]: {
            payload: receivedMessage.toString(),
            timestamp: new Date(),
          },
        }));
      }
    });

    client.on("error", (err) => {
      toast.error(`Kesalahan MQTT: ${err.message}`);
      setIsConnected(false);
      client.end();
    });

    client.on("close", () => {
      setIsConnected(false);
      toast.warning("Koneksi MQTT terputus.");
    });

    return () => {
      if (client.connected) {
        topics.forEach((topic) => client.unsubscribe(topic));
        client.end();
        toast.info("Koneksi MQTT dihentikan.");
      }
    };
  }, [brokerUrl, topics]);

  const distanceMessage = messages["parking/distance"]?.payload;
  const exitDistanceMessage = messages["parking/exitDistance"]?.payload; // New exit distance message
  const counterMessage = messages["parking/counter"]?.payload;
  const counterLastUpdate = messages["parking/counter"]?.timestamp;

  return {
    distance: distanceMessage ? parseInt(distanceMessage, 10) : null,
    exitDistance: exitDistanceMessage ? parseInt(exitDistanceMessage, 10) : null, // Return exit distance
    counter: counterMessage ? parseInt(counterMessage, 10) : null,
    counterLastUpdate,
    isConnected,
  };
}