// timbitoOS v4 — ESP32 Sketch
#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASS";

WebServer server(80);

static void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJson(const String& json) {
  cors();
  server.send(200, "application/json", json);
}

String handleCmd(String cmd) {
  if (cmd == "ping") return "{\"ok\":true,\"pong\":true}";
  if (cmd.startsWith("PIN_OUT:")) {
    int pin = cmd.substring(8).toInt();
    pinMode(pin, OUTPUT);
    return "{\"ok\":true}";
  }
  if (cmd.startsWith("PIN_IN:")) {
    int pin = cmd.substring(7).toInt();
    pinMode(pin, INPUT);
    return "{\"ok\":true}";
  }
  if (cmd.startsWith("PIN_WRITE:")) {
    int p1 = cmd.indexOf(':', 10);
    int pin = cmd.substring(10, p1).toInt();
    int val = cmd.substring(p1 + 1).toInt();
    digitalWrite(pin, val);
    return "{\"ok\":true,\"pin\":" + String(pin) + ",\"val\":" + String(val) + "}";
  }
  if (cmd.startsWith("PIN_READ:")) {
    int pin = cmd.substring(9).toInt();
    int val = digitalRead(pin);
    return "{\"ok\":true,\"val\":" + String(val) + "}";
  }
  return "{\"ok\":false,\"err\":\"unknown\"}";
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(400);
  Serial.println(WiFi.localIP());

  server.on("/ping", HTTP_GET, []() {
    sendJson("{\"ok\":true,\"pong\":true}");
  });

  server.on("/cmd", HTTP_OPTIONS, []() {
    cors();
    server.send(204);
  });

  server.on("/cmd", HTTP_GET, []() {
    String c = server.arg("c");
    sendJson(handleCmd(c));
  });

  server.begin();
}

void loop() {
  server.handleClient();
}
