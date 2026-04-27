import { useEffect, useRef } from "react";
import styles from "./MatrixRain.module.css";

const MATRIX_GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*+-=/<>[]{}?;:" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*+-=/<>[]{}?;:" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\\|АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ" +
  "абвгдежзиклмнопрстуфхцчшщыэюяアイウエオカキクケコサシスセソ";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    let animationFrame = 0;
    let lastFrameAt = 0;
    let columns: number[] = [];
    let width = 0;
    let height = 0;
    const fontSize = 18;
    const frameDelay = 58;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.font = `${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
      context.textBaseline = "top";
      columns = Array.from(
        { length: Math.ceil(width / fontSize) },
        () => Math.floor((Math.random() * height) / fontSize),
      );
    };

    const draw = (timestamp: number) => {
      if (timestamp - lastFrameAt >= frameDelay) {
        context.fillStyle = "rgba(0, 0, 0, 0.11)";
        context.fillRect(0, 0, width, height);
        context.font = `${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

        columns.forEach((row, columnIndex) => {
          const glyph = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
          const x = columnIndex * fontSize;
          const y = row * fontSize;

          context.fillStyle = "rgba(232, 255, 238, 0.72)";
          context.fillText(glyph, x, y);
          context.fillStyle = "rgba(143, 240, 178, 0.46)";
          context.fillText(glyph, x, y + fontSize);

          if (y > height && Math.random() > 0.975) {
            columns[columnIndex] = 0;
          } else {
            columns[columnIndex] = row + 1;
          }
        });

        lastFrameAt = timestamp;
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.matrixRain} aria-hidden="true" />;
}
