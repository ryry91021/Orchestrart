import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; }
      canvas { touch-action: none; background-color: white; }
    </style>
  </head>
  <body>
    <canvas id="canvas" width="400" height="800"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      let painting = false;

      function startDraw(e) {
        painting = true;
        draw(e);
      }

      function endDraw() {
        painting = false;
        ctx.beginPath();
      }

      function draw(e) {
        if (!painting) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }

      canvas.addEventListener('touchstart', startDraw);
      canvas.addEventListener('touchend', endDraw);
      canvas.addEventListener('touchmove', draw);
    </script>
  </body>
</html>
`;

export default function DrawingPage() {
    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    webview: {
        flex: 1,
        backgroundColor: 'white',
    },
});
