#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "Familia_Zambrano";
const char* password = "20082018";

ESP8266WebServer server(80);

// GPIO permitidos
const int allowedPins[] = {0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16};

bool isAllowedPin(int pin) {
  for (int p : allowedPins) {
    if (p == pin) return true;
  }
  return false;
}

void sendJson(bool ok, String extra = "") {
  String json = "{\"ok\":";
  json += ok ? "true" : "false";

  if (extra.length()) {
    json += ",";
    json += extra;
  }

  json += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handlePing() {
  sendJson(true, "\"pong\":true");
}

void handleCmd() {
  if (!server.hasArg("c")) {
    sendJson(false, "\"error\":\"missing c\"");
    return;
  }

  String cmd = server.arg("c");

  if (cmd == "ping") {
    sendJson(true, "\"pong\":true");
    return;
  }

  if (cmd.startsWith("PIN_OUT:")) {
    int pin = cmd.substring(8).toInt();

    if (!isAllowedPin(pin)) {
      sendJson(false, "\"error\":\"invalid pin\"");
      return;
    }

    pinMode(pin, OUTPUT);
    sendJson(true);
    return;
  }

  if (cmd.startsWith("PIN_IN:")) {
    int pin = cmd.substring(7).toInt();

    if (!isAllowedPin(pin)) {
      sendJson(false, "\"error\":\"invalid pin\"");
      return;
    }

    pinMode(pin, INPUT);
    sendJson(true);
    return;
  }

  if (cmd.startsWith("PIN_WRITE:")) {
    int firstColon = cmd.indexOf(':', 10);

    if (firstColon < 0) {
      sendJson(false, "\"error\":\"bad format\"");
      return;
    }

    int pin = cmd.substring(10, firstColon).toInt();
    int val = cmd.substring(firstColon + 1).toInt();

    if (!isAllowedPin(pin)) {
      sendJson(false, "\"error\":\"invalid pin\"");
      return;
    }

    pinMode(pin, OUTPUT);
    digitalWrite(pin, val ? HIGH : LOW);

    sendJson(true, "\"pin\":" + String(pin) + ",\"val\":" + String(val));
    return;
  }

  if (cmd.startsWith("PIN_READ:")) {
    int pin = cmd.substring(9).toInt();

    if (!isAllowedPin(pin)) {
      sendJson(false, "\"error\":\"invalid pin\"");
      return;
    }

    pinMode(pin, INPUT);
    int val = digitalRead(pin);

    sendJson(true, "\"pin\":" + String(pin) + ",\"val\":" + String(val));
    return;
  }

  sendJson(false, "\"error\":\"unknown command\"");
}

void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/ping", handlePing);
  server.on("/cmd", handleCmd);

  server.begin();
}

void loop() {
  server.handleClient();
}