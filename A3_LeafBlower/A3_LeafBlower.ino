#include <Adafruit_NeoPixel.h>

#define MAX_ANALOG_VAL 4096
const int X_PIN = A1;
const int Y_PIN = A2;
const int BUTTON1_PIN = A3;
const int BUTTON2_PIN = A4;
const int OUTPUT_INTERVAL = 15;
unsigned long lastOutput = 0;

// LED variables
const int LED_PIN = 13;
const int LED_COUNT = 8;
const int DECAY_INTERVAL = 50;
const int DECAY_AMOUNT = 1;
String inputBuffer = "";

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

int meterValue = 0;  // 0 - 100
unsigned long lastDecay = 0;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  pinMode(BUTTON1_PIN, INPUT_PULLUP);
  pinMode(BUTTON2_PIN, INPUT_PULLUP);
  pinMode(Y_PIN, INPUT);
  pinMode(X_PIN, INPUT);
  strip.begin();
  strip.setBrightness(30);
  strip.show();
}

void loop() {
  // put your main code here, to run repeatedly:
  unsigned long currMillis = millis();

  if (currMillis - lastOutput > OUTPUT_INTERVAL) {
    int y_out = analogRead(Y_PIN);
    int x_out = analogRead(X_PIN);
    int b1_out = digitalRead(BUTTON1_PIN);
    int b2_out = digitalRead(BUTTON2_PIN);

    float normalized_y = y_out / (float) MAX_ANALOG_VAL;
    float normalized_x = x_out / (float) MAX_ANALOG_VAL;
    Serial.print(normalized_x);
    Serial.print(",");
    Serial.print(normalized_y);
    Serial.print(",");
    Serial.print(b1_out);
    Serial.print(",");
    Serial.print(b2_out);
    Serial.print(",");
    Serial.println(meterValue);

    lastOutput = currMillis;
  }
  
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      int incoming = inputBuffer.toInt();
      if (incoming > 0) {
        meterValue = constrain(meterValue + incoming, 0, 100);
      }
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }

  // gradually decay
  if (currMillis - lastDecay > DECAY_INTERVAL) {
    if (meterValue > 0) {
      meterValue--;
      lastDecay = currMillis;
    }
  }

  drawMeter();

  strip.show();
}

void drawMeter() {
  // map meterValue to LEDs lit
  int ledsLit = map(meterValue, 0, 100, 0, LED_COUNT);

  for (int i = 0; i < LED_COUNT; i++) {
    if (i <= ledsLit) {
      // green, filling right to left
      int brightness = map(i, 0, LED_COUNT - 1, 60, 120);
      strip.setPixelColor(i, strip.Color(0, brightness, 0));
    } else {
      // off
      strip.setPixelColor(i, 0);
    }
  }
}
