import React, { useRef, useState } from 'react';
import { View, StyleSheet, Button, ScrollView, TouchableOpacity, Alert, Image, Text, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import { Audio } from 'expo-av';
import { songList } from '../assets/tunes/tunesIndex';

const eraserIcon = require('../assets/images/eraser_button.png');
const musicIcon = require('../assets/images/music_notes.png')

const colors = ['black', 'white', 'grey', 'red', 'orange','yellow','green','blue','cyan','pink','purple'];

export default function DrawingPage() {
  const webviewRef = useRef<WebViewType>(null);
  const [selectedColor, setSelectedColor] = useState('black');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [songModalVisible, setSongModalVisible] = useState(false);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null);
  const fadeTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const fadeTimers = useRef<NodeJS.Timeout[]>([]);
  const [lastDrawTime, setLastDrawTime] = useState<number>(Date.now());

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
    sendToWebView(`window.setEraser(${newIsEraser});`);
    const eraserColor = isDarkMode ? 'black' : 'white';
    const colorToUse = newIsEraser ? eraserColor : selectedColor;
    sendToWebView(`window.setColor("${colorToUse}");`);
  };

  const fadeOutAndPause = async () => {
    if (!sound) return;
    const steps = 10;
    const duration = 1000;
    const interval = duration / steps;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    const originalVolume = status.volume ?? 1.0;
    fadeTimers.current.forEach(clearTimeout);
    fadeTimers.current = [];

    for (let i = 1; i <= steps; i++) {
      const timer = setTimeout(() => {
        const newVolume = originalVolume * ((steps - i) / steps);
        sound.setVolumeAsync(newVolume);
        if (i === steps) {
          sound.pauseAsync();
          sound.setVolumeAsync(originalVolume);
          fadeTimers.current = [];
        }
      }, i * interval);
      fadeTimers.current.push(timer);
    }
  };

  const stopMusic = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setSelectedSongIndex(null);
    setMusicEnabled(false);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{
          html: `<!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                html, body {
                  margin: 0; padding: 0; overflow: hidden; height: 100%;
                }
                canvas {
                  touch-action: none; display: block; width: 100vw; height: 100vh;
                }
              </style>
            </head>
            <body>
              <canvas id="canvas"></canvas>
              <script>
                const canvas = document.getElementById("canvas");
                const ctx = canvas.getContext("2d");
                let painting = false;
                let currentColor = "black";
                let currentBackground = "white";
                let lineWidth = 5;
                let isEraser = false;
                let paths = [];
                let redostack = [];

                function resizeCanvas() {
                  canvas.width = window.innerWidth;
                  canvas.height = window.innerHeight;
                  redraw();
                }

                window.addEventListener("resize", resizeCanvas);
                resizeCanvas();

                function getTouchPos(e) {
                  const touch = e.touches[0];
                  const rect = canvas.getBoundingClientRect();
                  return {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                  };
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
                        path[i] = null;
                      }
                    }
                    if (path.every(p => p === null)) {
                      paths.splice(pathIndex, 1);
                    }
                  }
                }

                function startDraw(e) {
                  painting = true;
                  const pos = getTouchPos(e);
                  if (isEraser) {
                    eraseAt(pos);
                    redraw();
                    return;
                  }
                  const path = [{ x: pos.x, y: pos.y, color: currentColor }];
                  paths.push(path);
                  window.ReactNativeWebView?.postMessage("startDrawing");
                }

                function draw(e) {
                  const pos = getTouchPos(e);
                  if (isEraser) {
                    eraseAt(pos);
                    redraw();
                    return;
                  }
                  if (!painting) return;
                  const path = paths[paths.length - 1];
                  path.push({ x: pos.x, y: pos.y, color: currentColor });
                  redraw();
                }

                function endDraw() {
                  painting = false;
                  window.ReactNativeWebView?.postMessage("stopDrawing");
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

                canvas.addEventListener("touchstart", startDraw);
                canvas.addEventListener("touchmove", draw);
                canvas.addEventListener("touchend", endDraw);

                window.setColor = function (color) {
                  currentColor = color;
                };

                window.setTheme = function (bg) {
                  currentBackground = bg;
                  canvas.style.backgroundColor = bg;
                  redraw();
                };

                window.setEraser = function (flag) {
                  isEraser = flag;
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
          </html>`
        }}
        javaScriptEnabled
        style={styles.webview}
        onMessage={async (event) => {
          const msg = event.nativeEvent.data;
          if (msg === 'startDrawing') {
            setLastDrawTime(Date.now());
            if (fadeTimeoutId.current) {
              clearTimeout(fadeTimeoutId.current);
              fadeTimeoutId.current = null;
            }
            fadeTimers.current.forEach(clearTimeout);
            fadeTimers.current = [];

            if (musicEnabled && selectedSongIndex !== null) {
              if (!sound) {
                const { sound: newSound } = await Audio.Sound.createAsync(
                  songList[selectedSongIndex].file,
                  { shouldPlay: true, isLooping: true }
                );
                fadeTimers.current.forEach(clearTimeout);
                fadeTimers.current = [];
                setSound(newSound);
                await newSound.setVolumeAsync(1.0);
                await newSound.playAsync();
              } else {
                fadeTimers.current.forEach(clearTimeout);
                fadeTimers.current = [];
                const status = await sound.getStatusAsync();
                if (!status.isPlaying) {
                  await sound.setVolumeAsync(1.0);
                  await sound.playAsync();
                } else {
                  await sound.setVolumeAsync(1.0); // <-- in case volume was fading
                }
              }
            }

          } else if (msg === 'stopDrawing') {
            const now = Date.now();
            const timeSinceDraw = now - lastDrawTime;
            if (musicEnabled && sound) {
              if (timeSinceDraw < 300) {
                fadeTimeoutId.current = setTimeout(() => {
                  fadeOutAndPause();
                  fadeTimeoutId.current = null;
                }, 300);
              } else {
                fadeOutAndPause();
              }
            }
          }
        }}
      />

      <View style={styles.controls}>
        <ScrollView horizontal contentContainerStyle={styles.colorPicker}>
          <TouchableOpacity onPress={toggleEraser}>
            <Image source={eraserIcon} style={[styles.eraserIcon, isEraser && styles.eraserActive]} />
          </TouchableOpacity>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorButton, {
                backgroundColor: color,
                borderColor: selectedColor === color && !isEraser ? 'black' : 'transparent',
              }]}
              onPress={() => {
                setSelectedColor(color);
                setIsEraser(false);
                sendToWebView(`window.setEraser(false);`);
                sendToWebView(`window.setColor("${color}");`);
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <Button title="Undo" onPress={() => sendToWebView('window.undo();')} />
          <Button title={isDarkMode ? 'Light Mode' : 'Dark Mode'} onPress={toggleDarkMode} />
          <Button title="Clear" onPress={() =>
            Alert.alert('Clear Canvas', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => sendToWebView('window.clearCanvas();') },
            ])
          } />
          <Button title="Redo" onPress={() => sendToWebView('window.redo();')} />
          <TouchableOpacity onPress={() => setSongModalVisible(true)}>
            <Image source={musicIcon} style={styles.imageButton} />
          </TouchableOpacity>

        </View>
      </View>


      <Modal visible={songModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <TouchableOpacity style={styles.songItem} onPress={stopMusic}>
                <Text>No Song {selectedSongIndex === null ? '✓' : ''}</Text>
              </TouchableOpacity>
              {songList.map((song, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.songItem}
                  onPress={async () => {
                    setSongModalVisible(false);
                    setMusicEnabled(true);
                    setSelectedSongIndex(index);
                    if (sound) {
                      const status = await sound.getStatusAsync();
                      if (status.isLoaded) {
                        await sound.stopAsync();
                        await sound.unloadAsync();
                      }
                    }
                    setSound(null); // music will only play on draw
                  }}
                >
                  <Text>{song.name} {selectedSongIndex === index ? '✓' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Close" onPress={() => setSongModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  controls: { backgroundColor: '#f1f1f1', paddingVertical: 10 },
  colorPicker: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10, alignItems: 'center' },
  colorButton: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 5, borderWidth: 2 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
  eraserIcon: { width: 32, height: 32, marginHorizontal: 5, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  eraserActive: { borderColor: 'black' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%', maxHeight: '60%' },
  songItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  imageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },

});
