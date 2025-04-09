import React, { useRef, useState } from 'react';
import { View, StyleSheet, Button, ScrollView, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Alert } from 'react-native';

const colors = ['black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white']; // white = eraser

export default function DrawingPage() {
    const webviewRef = useRef(null);
    const [selectedColor, setSelectedColor] = useState('black');

    const sendToWebView = (jsCode: string) => {
        (webviewRef.current as any)?.injectJavaScript(jsCode);
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html { margin: 0; padding: 0; overflow: hidden; }
          canvas { touch-action: none; background: white; display: block; }
        </style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          let painting = false;
          let currentColor = 'black';
          let lineWidth = 5;
          let paths = [];

          function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }

          window.addEventListener('resize', resizeCanvas);
          resizeCanvas();

          function startDraw(e) {
            painting = true;
            const touch = e.touches[0];
            const path = [{ x: touch.clientX, y: touch.clientY, color: currentColor }];
            paths.push(path);
          }

          function draw(e) {
            if (!painting) return;
            const touch = e.touches[0];
            const path = paths[paths.length - 1];
            path.push({ x: touch.clientX, y: touch.clientY, color: currentColor });
            redraw();
          }

          function endDraw() {
            painting = false;
          }

          function redraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let path of paths) {
              ctx.beginPath();
              for (let i = 0; i < path.length; i++) {
                ctx.strokeStyle = path[i].color;
                ctx.lineWidth = 5;
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
        let redostack = [];

        window.undo = function () {
        if (paths.length > 0) {
            redostack.push(paths.pop()); //push not append
            console.log('Redo Stack:', redostack);
            redraw();
        }
        };

        window.redo = function () {
        if (redostack.length > 0) {
            paths.push(redostack.pop());
            console.log('Redoing...', paths);
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
                    {colors.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[styles.colorButton, { backgroundColor: color, borderColor: selectedColor === color ? 'black' : 'transparent' }]}
                            onPress={() => {
                                setSelectedColor(color);
                                sendToWebView(`window.setColor("${color}");`);
                            }}
                        />
                    ))}
                </ScrollView>

                <View style={styles.buttonRow}>
                    <Button title="Undo" onPress={() => sendToWebView('window.undo();')} />
                    <Button
                        title="Clear"
                        onPress={() => {
                            Alert.alert(
                                'Clear Canvas',
                                'Are you sure you want to clear the canvas?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Clear',
                                        style: 'destructive',
                                        onPress: () => sendToWebView('window.clearCanvas();'),
                                    },
                                ],
                                { cancelable: true }
                            );
                        }}
                    />

                    <Button title="Redo" onPress={() => sendToWebView ('window.redo();')} />
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
