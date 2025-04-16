import React, { useRef, useState } from 'react';
import { View, StyleSheet, Button, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import {Audio} from "expo-av";

const colors = ['black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white'];

//main drawing page
export default function DrawingPage() {
  const webviewRef = useRef<WebViewType>(null);
  const [selectedColor, setSelectedColor] = useState('black');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const sendToWebView = (jsCode: string) => {
    webviewRef.current?.injectJavaScript(jsCode);
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    const bg = nextMode ? 'black' : 'white';
    sendToWebView(`window.setTheme("${bg}");`);
  };

  const playMusic = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../public/test.mp3'), // replace with your file
        { shouldPlay: true, isLooping: true }
      );
      setSound(newSound);
    } else {
      await sound.playAsync();
    }
  };
  
  const pauseMusic = async () => {
    if (sound) {
      await sound.pauseAsync();
    }
  };
  

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        html, body { margin: 0; padding: 0; overflow: hidden; }
        canvas { touch-action: none; display: block; }
      </style>
    </head>
    <body>
      <canvas id="canvas"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let painting = false;
        let currentColor = 'black';
        let currentBackground = 'white';
        let lineWidth = 5;
        let paths = [];
        let redostack = [];

        function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          redraw();
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function getTouchPos(e) {
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
          };
        }

        function startDraw(e) {
          painting = true;
          const pos = getTouchPos(e);
          const path = [{ x: pos.x, y: pos.y, color: currentColor }];
          paths.push(path);
        }

        function draw(e) {
          if (!painting) return;
          const pos = getTouchPos(e);
          const path = paths[paths.length - 1];
          path.push({ x: pos.x, y: pos.y, color: currentColor });
          redraw();
        }

        function endDraw() {
          painting = false;
        }

        function redraw() {
          ctx.fillStyle = currentBackground;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          for (let path of paths) {
            ctx.beginPath();
            for (let i = 0; i < path.length; i++) {
              ctx.strokeStyle = path[i].color;
              ctx.lineWidth = lineWidth;
              if (i === 0) {
                ctx.moveTo(path[i].x, path[i].y);
              } else {
                ctx.lineTo(path[i].x, path[i].y);
              }
            }
            ctx.stroke();
          }
        }

        canvas.addEventListener('touchstart', startDraw);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', endDraw);

        window.setColor = function (color) {
          currentColor = color;
        };

        window.setTheme = function (bg) {
          currentBackground = bg;
          canvas.style.backgroundColor = bg;
          redraw();
        };

        window.undo = function () {
          if (paths.length > 0) {
            redostack.push(paths.pop());
            redraw();
          }
        };

        window.redo = function () {
          if (redostack.length > 0) {
            paths.push(redostack.pop());
            redraw();
          }
        };

        window.clearCanvas = function () {
          paths = [];
          redostack = [];
          redraw();
        };

        function startDraw(e) {
          painting = true;
          const pos = getTouchPos(e);
          const path = [{ x: pos.x, y: pos.y, color: currentColor }];
          paths.push(path);
          window.ReactNativeWebView?.postMessage("startDrawing");
        }

        function endDraw() {
          painting = false;
          window.ReactNativeWebView?.postMessage("stopDrawing");
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        javaScriptEnabled
        style={styles.webview}
        onMessage={async (event) => {
          const msg = event.nativeEvent.data;
      
          if (msg === 'startDrawing') {
            if (musicEnabled) {
              if (!sound) {
                const { sound: newSound } = await Audio.Sound.createAsync(
                  require('./assets/music.mp3'),
                  { shouldPlay: true, isLooping: true }
                );
                setSound(newSound);
                await newSound.playAsync();
              } else {
                await sound.playAsync();
              }
            }
          } else if (msg === 'stopDrawing') {
            if (sound && musicEnabled) {
              await sound.pauseAsync();
            }
          }
        }}
      />

      <View style={styles.controls}>
        <ScrollView horizontal contentContainerStyle={styles.colorPicker}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                {
                  backgroundColor: color,
                  borderColor: selectedColor === color ? 'black' : 'transparent',
                },
              ]}
              onPress={() => {
                setSelectedColor(color);
                sendToWebView(`window.setColor("${color}");`);
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <Button title="Undo" onPress={() => sendToWebView('window.undo();')} />
          <Button title={isDarkMode ? 'Light Mode' : 'Dark Mode'} onPress={toggleDarkMode} />
          <Button
            title="Clear"
            onPress={() =>
              Alert.alert('Clear Canvas', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => sendToWebView('window.clearCanvas();') },
              ])
            }
          />
          <Button title="Redo" onPress={() => sendToWebView('window.redo();')} />
          <Button title={musicEnabled ? 'Music On' : 'Music Off'} onPress={async () => {setMusicEnabled((prev) => !prev); if (musicEnabled && sound) {await sound.pauseAsync();}}}/>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  controls: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 10,
  },
  colorPicker: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 5,
    borderWidth: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
