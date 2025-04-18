import React, { useRef, useState } from 'react';
import { View, StyleSheet, Button, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

const eraserIcon = require('../assets/images/eraser_button.png');

const colors = ['black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white'];

export default function DrawingPage() {
  const webviewRef = useRef<WebViewType>(null);
  const [selectedColor, setSelectedColor] = useState('black');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);

  const sendToWebView = (jsCode: string) => {
    webviewRef.current?.injectJavaScript(jsCode);
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    const bg = nextMode ? 'black' : 'white';
    sendToWebView(`window.setTheme("${bg}");`);

    if (isEraser) {
      sendToWebView(`window.setColor("${bg}");`);
    }
  };

  const toggleEraser = () => {
    const newIsEraser = !isEraser;
    setIsEraser(newIsEraser);
    const eraserColor = isDarkMode ? 'black' : 'white';
    const colorToUse = newIsEraser ? eraserColor : selectedColor;
    sendToWebView(`window.setColor("${colorToUse}");`);
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

        function distance(p1, p2) {
          return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        }

        function startDraw(e) {
          const pos = getTouchPos(e);

          if (currentColor === currentBackground) {
            // Eraser: immediately delete any points near the touch
            eraseAt(pos);
            redraw();
            return;
          }

          painting = true;
          const path = [{ x: pos.x, y: pos.y, color: currentColor }];
          paths.push(path);
        }

        function draw(e) {
          const pos = getTouchPos(e);

          if (currentColor === currentBackground) {
            eraseAt(pos);
            redraw();
            return;
          }

          if (!painting) return;
          const path = paths[paths.length - 1];
          path.push({ x: pos.x, y: pos.y, color: currentColor });
          redraw();
        }

        function eraseAt(pos) {
          const radius = 10;

          for (let pathIndex = paths.length - 1; pathIndex >= 0; pathIndex--) {
            const path = paths[pathIndex];
            for (let i = 0; i < path.length; i++) {
              const p = path[i];
              if (!p) continue;
              const dx = p.x - pos.x;
              const dy = p.y - pos.y;
              if (dx * dx + dy * dy < radius * radius) {
                path[i] = null; // mark point as erased
              }
            }

            // If all points in the path are null, remove the path
            if (path.every(p => p === null)) {
              paths.splice(pathIndex, 1);
            }
          }
        }





        function endDraw() {
          painting = false;
        }

        function redraw() {
          ctx.fillStyle = currentBackground;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          for (let path of paths) {
            ctx.beginPath();
            ctx.lineWidth = lineWidth;

            let segment = [];

            for (let i = 0; i <= path.length; i++) {
              const p = path[i];

              if (p) {
                segment.push(p);
              }

              if (!p || i === path.length - 1) {
                if (segment.length > 1) {
                  ctx.beginPath();
                  ctx.strokeStyle = segment[0].color;
                  ctx.moveTo(segment[0].x, segment[0].y);
                  for (let j = 1; j < segment.length; j++) {
                    ctx.lineTo(segment[j].x, segment[j].y);
                  }
                  ctx.stroke();
                }
                segment = [];
              }
            }

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
      />

      <View style={styles.controls}>
        <ScrollView horizontal contentContainerStyle={styles.colorPicker}>
          <TouchableOpacity onPress={toggleEraser}>
            <Image source={eraserIcon} style={[styles.eraserIcon, isEraser && styles.eraserActive]} />
          </TouchableOpacity>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                {
                  backgroundColor: color,
                  borderColor: selectedColor === color && !isEraser ? 'black' : 'transparent',
                },
              ]}
              onPress={() => {
                setSelectedColor(color);
                setIsEraser(false);
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
    alignItems: 'center',
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
  eraserIcon: {
    width: 32,
    height: 32,
    marginHorizontal: 5,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eraserActive: {
    borderColor: 'black',
  },
});
