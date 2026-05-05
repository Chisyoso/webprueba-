:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino: In function 'void sendJson(bool, const String&)':
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:26:22: error: unable to find string literal operator 'operator""ok' with 'const char [3]', 'unsigned int' arguments
   26 |   String json = "{"ok":";
      |                      ^~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino: In function 'void handlePing()':
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:37:24: error: unable to find string literal operator 'operator""pong' with 'const char [6]', 'unsigned int' arguments
   37 |   sendJson(true, ""pong":true");
      |                        ^~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino: In function 'void handleCmd()':
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:42:28: error: inconsistent user-defined literal suffixes 'error' and 'missing' in string literal
   42 |     sendJson(false, ""error":"missing c"");
      |                            ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:42:28: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:49:26: error: unable to find string literal operator 'operator""pong' with 'const char [6]', 'unsigned int' arguments
   49 |     sendJson(true, ""pong":true");
      |                          ^~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:55:59: error: inconsistent user-defined literal suffixes 'error' and 'invalid' in string literal
   55 |     if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
      |                                                           ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:55:59: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:64:59: error: inconsistent user-defined literal suffixes 'error' and 'invalid' in string literal
   64 |     if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
      |                                                           ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:64:59: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:72:50: error: inconsistent user-defined literal suffixes 'error' and 'bad' in string literal
   72 |     if (first < 0) return sendJson(false, ""error":"bad format"");
      |                                                  ^~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:72:50: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:75:59: error: inconsistent user-defined literal suffixes 'error' and 'invalid' in string literal
   75 |     if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
      |                                                           ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:75:59: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:78:25: error: unable to find string literal operator 'operator""pin' with 'const char [2]', 'unsigned int' arguments
   78 |     sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
      |                         ^~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:78:51: error: unable to find string literal operator 'operator""val' with 'const char [3]', 'unsigned int' arguments
   78 |     sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
      |                                                   ^~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:84:59: error: inconsistent user-defined literal suffixes 'error' and 'invalid' in string literal
   84 |     if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
      |                                                           ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:84:59: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:87:25: error: unable to find string literal operator 'operator""pin' with 'const char [2]', 'unsigned int' arguments
   87 |     sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
      |                         ^~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:87:51: error: unable to find string literal operator 'operator""val' with 'const char [3]', 'unsigned int' arguments
   87 |     sendJson(true, ""pin":" + String(pin) + ","val":" + String(val));
      |                                                   ^~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:93:47: error: inconsistent user-defined literal suffixes 'error' and 'bad' in string literal
   93 |     if (p1 < 0) return sendJson(false, ""error":"bad format"");
      |                                               ^~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:93:47: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:96:59: error: inconsistent user-defined literal suffixes 'error' and 'invalid' in string literal
   96 |     if (!isAllowedPin(pin)) return sendJson(false, ""error":"invalid pin"");
      |                                                           ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:96:59: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:100:40: error: inconsistent user-defined literal suffixes 'error' and 'bad' in string literal
  100 |     else return sendJson(false, ""error":"bad mode"");
      |                                        ^~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:100:40: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:105:26: error: inconsistent user-defined literal suffixes 'error' and 'unknown' in string literal
  105 |   sendJson(false, ""error":"unknown command"");
      |                          ^~~~~~~~~~
C:\Users\jesus\Documents\midi\Zoe___Labios_Rotos__MIDIfind\Zoe___Labios_Rotos__MIDIfind.ino:105:26: error: unable to find string literal operator 'operator""error' with 'const char [2]', 'unsigned int' arguments
exit status 1

Compilation error: unable to find string literal operator 'operator""ok' with 'const char [3]', 'unsigned int' arguments


usa siempre estas variables de ip 

const char* ssid = "Familia_Zambrano";
const char* password = "20082018";
 
añade esto como verificador

 while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
 
