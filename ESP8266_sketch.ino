#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

ESP8266WebServer server(80);

const int allowedPins[] = {0, 2, 4, 5, 12, 13, 14, 15, 16};

bool isAllowedPin(int pin) {
  for (int p : allowedPins) if (p == pin) return true;
  return false;
}

void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJson(bool ok, const String& extra = "") {
  cors();
  String json = "{"ok":";
  json += ok ? "true" : "false";
  if (extra.length()) {
    json += ",";
    json += extra;
  }
  json += "}";
  server.send(200, "application/json", json);
}

void handlePing() {
  sendJson(true, ""pong":true");
}

void handleCmd() {
  if (!server.hasArg("c")) {
    sendJson(false, ""error":"missing c"");
    return;
  }

  String cmd = server.arg("c");

  if (cmd == "ping") {
    sendJson(true, ""pong":true");
    return;
  }

  if (cmd.startsWith("PIN_OUT:")) {
    int pin = cmd.substring(8).toInt();
    if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    sendJson(true);
    return;
  }

  if (cmd.startsWith("PIN_IN:")) {
    int pin = cmd.substring(7).toInt();
    if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
    pinMode(pin, INPUT);
    sendJson(true);
    return;
  }

  if (cmd.startsWith("PIN_WRITE:")) {
    int first = cmd.indexOf(':', 10);
    if (first < 0) return sendJson(false, ""error":"bad format"");
    int pin = cmd.substring(10, first).toInt();
    int val = cmd.substring(first + 1).toInt();
    if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
    pinMode(pin, OUTPUT);
    digitalWrite(pin, val ? HIGH : LOW);
    sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
    return;
  }

  if (cmd.startsWith("PIN_READ:")) {
    int pin = cmd.substring(9).toInt();
    if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
    pinMode(pin, INPUT);
    int val = digitalRead(pin);
    sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
    return;
  }

  if (cmd.startsWith("PIN_MODE:")) {
    int p1 = cmd.indexOf(':', 9);
    if (p1 < 0) return sendJson(false, ""error":"bad format"");
    int pin = cmd.substring(9, p1).toInt();
    String mode = cmd.substring(p1 + 1);
    if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
    if (mode == "OUTPUT") pinMode(pin, OUTPUT);
    else if (mode == "INPUT") pinMode(pin, INPUT);
    else if (mode == "INPUT_PULLUP") pinMode(pin, INPUT_PULLUP);
    else return sendJson(false, ""error":"bad mode"");
    sendJson(true);
    return;
  }

  sendJson(false, ""error":"unknown command"");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  server.on("/ping", HTTP_GET, handlePing);
  server.on("/cmd", HTTP_OPTIONS, []() { cors(); server.send(204); });
  server.on("/cmd", HTTP_GET, handleCmd);
  server.begin();

  Serial.println(WiFi.localIP());
}

void loop() {
  server.handleClient();
}
