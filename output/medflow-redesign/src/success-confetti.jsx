import confetti from 'canvas-confetti'
import { useEffect, useRef } from 'react'

// Solid particle colors sampled from the supplied Figma success screenshot.
const colors = ['#111111', '#147047', '#f06e15', '#f5bf2e', '#749eb8']
// Reuse the existing MedFlow celebration's three bursts and physics parameters.
const bursts = [
  { origin: { x: 0.5, y: 0.42 }, particleCount: 150, spread: 360, startVelocity: 42, ticks: 180 },
  {
    angle: 66,
    origin: { x: 0.02, y: 1 },
    particleCount: 70,
    spread: 52,
    startVelocity: 48,
    ticks: 170
  },
  {
    angle: 114,
    origin: { x: 0.98, y: 1 },
    particleCount: 70,
    spread: 52,
    startVelocity: 48,
    ticks: 170
  }
]

export function SuccessConfetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches) return

    const canvas = canvasRef.current
    const fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true })
    // The success frame must be painted before its celebration begins.
    const frame = requestAnimationFrame(() => {
      canvas.dataset.celebration = 'playing'
      Promise.all(
        bursts.map((burst) => fire({ ...burst, colors, disableForReducedMotion: true }))
      ).then(() => {
        canvas.dataset.celebration = 'complete'
      })
    })
    const stopForReducedMotion = () => {
      if (preference.matches) fire.reset()
    }
    preference.addEventListener('change', stopForReducedMotion)
    return () => {
      cancelAnimationFrame(frame)
      preference.removeEventListener('change', stopForReducedMotion)
      fire.reset()
    }
  }, [active])

  return active ? (
    <canvas ref={canvasRef} className="mf-confetti" tabIndex={-1} aria-hidden="true" />
  ) : null
}
