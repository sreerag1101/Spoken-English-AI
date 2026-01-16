
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color: string;
  volume: number; // Volume level from 0 to 1
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, color, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeRef = useRef(volume);

  // Sync ref with prop to avoid closure staleness in the animation loop
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 16;
    
    // Smoothly interpolate heights for a better visual feel
    const currentHeights = new Array(bars).fill(2);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bars;
      
      const v = isActive ? volumeRef.current : 0;
      
      for (let i = 0; i < bars; i++) {
        // Create an organic "spectrum" look by adding slight frequency-like variation to the base volume
        const targetHeight = Math.max(4, v * canvas.height * (0.4 + Math.sin(i * 0.5 + Date.now() * 0.005) * 0.4 + Math.random() * 0.2));
        
        // Simple smoothing (lerp)
        currentHeights[i] += (targetHeight - currentHeights[i]) * 0.2;
        
        const x = i * barWidth;
        const y = (canvas.height - currentHeights[i]) / 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, currentHeights[i], 4);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={160} 
      height={60} 
      className="w-full h-12 opacity-90 transition-opacity duration-300"
    />
  );
};

export default AudioVisualizer;
