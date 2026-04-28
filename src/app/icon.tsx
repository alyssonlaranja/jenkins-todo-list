import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    // Clean white background to show the symbol properly
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Símbolo oficial da Avanade - Extraído do RGB SVG */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 244 242"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <defs>
          <linearGradient id="g1" x2="1" gradientUnits="userSpaceOnUse">
            <stop offset=".2" stopColor="#ff5800" />
            <stop offset=".62" stopColor="#ffd700" />
            <stop offset=".9" stopColor="#ff5800" />
          </linearGradient>
          <linearGradient id="g2" x2="1" gradientUnits="userSpaceOnUse">
            <stop offset=".09" stopColor="#ff5800" />
            <stop offset=".47" stopColor="#ffb414" />
            <stop offset=".82" stopColor="#ff5800" />
          </linearGradient>
          <linearGradient id="g3" x2="1" gradientUnits="userSpaceOnUse">
            <stop offset=".5" stopColor="#ff5800" />
            <stop offset=".64" stopColor="#ce056a" />
            <stop offset=".95" stopColor="#ff5800" />
          </linearGradient>
          <linearGradient id="g4" x2="1" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff5800" />
            <stop offset=".3" stopColor="#c80000" />
            <stop offset=".48" stopColor="#c80000" />
            <stop offset=".91" stopColor="#ff5800" />
          </linearGradient>
        </defs>
        {/* 4 formas curvas entrelaçadas oficiais */}
        <path
          fill="url(#g1)"
          d="m60.9 66.73q-10.68 20.83-17.33 33.22-6.66 12.4-12.21 20.16-5.56 7.75-11.8 12.68-6.24 4.93-15.77 10.83l-3.55-5.43q6.07-4.46 10.89-8.81 4.81-4.35 10.37-12.11q5.56-7.76 12.86-20.76q7.29-12.99 18.02-35.07q7.71-15.94 14.6-26.15q6.88-10.2 13.31-16.06q6.42-5.85 12.41-8.14q5.99-2.28 12.21-2.07q5.89 0.21 11.71 2.91q5.81 2.7 12.7 10.57q6.87 7.88 15.38 22.68q8.5 14.79 20.1 38.89q7.54 15.55 14.18 25.91q6.63 10.37 13.71 17.16q7.07 6.8 15.32 10.98q8.25 4.19 19.03 7.37l4.4 7.64q-13.02-1.39-23.16-5.02q-10.13-3.63-18.89-11.11q-8.76-7.47-16.9-19.29q-8.14-11.82-16.85-29.59q-10.76-21.57-18.21-35.09q-7.46-13.51-13.27-21.04q-5.8-7.53-10.37-10.19q-4.57-2.65-9.23-2.81q-4.97-0.18-9.71 2q-4.75 2.17-9.92 7.76q-5.17 5.59-11.09 14.89q-5.93 9.3-12.94 23.09z"
        />
        <path
          fill="url(#g2)"
          d="m166.89 157.73q15.84 0.56 31.16-1.56q15.31-2.11 27.28-6.37l1.05 5.64q-21.32 13.6-59.83 12.26q-17.4-0.61-30.03-4.01q-12.64-3.4-22.43-8.11q-7.34-3.37-14.06-7.04q-6.71-3.66-13.6-6.71q-6.9-3.05-14.13-5.17q-7.24-2.13-15.31-2.41q-12.12-0.42-24.48 1.8q-12.37 2.22-24.34 6.79l-3.59-4.18 6.65-3.2q9.52-5.59 21.91-8.59q12.39-3 24.2-2.58q9.32 0.32 17.17 2.47q7.86 2.14 14.9 5.35q7.04 3.21 14.06 7.04q7.02 3.83 14.68 7.21q9.8 4.4 20.88 7.59q11.09 3.2 27.86 3.78z"
        />
        <path
          fill="url(#g3)"
          d="m181.99 81.56q-5.59-0.2-10.66 2.59q-5.08 2.79-11.72 10.35q-6.64 7.56-15.5 20.81q-8.86 13.26-22.03 34.31q-17.8 28.69-33.02 41.41q-15.22 12.72-31.99 12.13q-17.71-0.62-33.28-17.69q-15.58-17.06-23.55-47.28l9.89 1.91q8.18 23.98 20.75 38.29q12.56 14.32 26.54 14.81q13.04 0.45 26.35-10.93q13.3-11.38 29.45-37.32q14.5-23.19 24.33-37.66q9.84-14.47 17.27-22.47q7.43-8 13.75-10.75q6.32-2.74 13.77-2.48q16.77 0.59 29.78 20.06q13 19.48 23.12 59.43l-10.73-4.43q-10.04-33.09-20.38-48.89q-10.34-15.79-22.14-16.2z"
        />
        <path
          fill="url(#g4)"
          d="m144.09 231.77q7.77 0.27 15.42-5.23q7.66-5.51 19.4-20.99q9.12-11.85 14.99-19.59q5.87-7.75 11.05-13.65q5.18-5.9 10.66-11.32q5.47-5.42 13.53-13.24l6.1 3.33q-7.45 8.47-12.48 14.37q-5.03 5.91-9.91 12.13q-4.88 6.22-10.75 13.97q-5.87 7.74-15 19.89q-12.41 16.72-22.13 23.71q-9.74 6.98-21.23 6.58q-6.21-0.22-11.28-2.11q-5.06-1.89-11.72-7.26q-6.65-5.38-15.64-15.2q-8.99-9.83-22.74-25.59q-10.48-11.9-18.9-19.99q-8.43-8.09-16.81-13.06q-8.38-4.97-17.61-7.78q-9.23-2.82-21.62-4.19l2.43-7.4q12.71 1.07 22.59 3.29q9.87 2.21 18.72 7.2q8.85 4.98 17.89 13.25q9.04 8.27 20.1 21.13q13.75 15.75 22.45 25.1q8.69 9.34 14.43 14.38q5.73 5.03 9.72 6.57q3.99 1.55 8.34 1.7z"
        />
      </svg>
    </div>,
    {
      ...size,
    }
  )
}
