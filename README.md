# 🚀 SpacePulse

### Space Intelligence & Visualization Platform

SpacePulse is an advanced space intelligence and visualization platform designed to explore spacecraft, satellites, celestial bodies, missions, and space-related data through an immersive 3D experience.

Built with modern web technologies and real publicly available space data, SpacePulse combines scientific visualization with a premium deep-space interface.

---

## 🌌 Features

### 🛰️ Mission Control

- Space environment overview
- Mission information
- Spacecraft information
- Space weather information
- System status indicators
- Data source and update information

### 🚀 Spacecraft

- Explore spacecraft and missions
- Detailed spacecraft information
- Mission details
- Spacecraft status information
- Object inspection
- Source and data-status indicators

### 🌍 Space Map

- Interactive 3D Solar System
- Realistic celestial bodies
- Earth-focused satellite visualization
- Satellite markers
- Spacecraft visualization
- Interactive camera controls
- Object selection and inspection
- Orbit visualization where valid data is available
- Search and focus functionality
- Scientific distance calculations
- Real-time spatial visualization where supported by available data

### 📊 Analysis

- Scientific calculations
- Distance calculations
- Orbital information
- Object analysis
- Spacecraft comparisons
- Data interpretation
- Calculated-value indicators

### 📡 Missions & Data

- Space mission information
- Spacecraft data
- Satellite information
- Data source information
- Source timestamps
- Data availability indicators
- Data error handling

---

## 🧠 Real Data

SpacePulse follows a strict **real-data-first** approach.

Preferred data sources include:

- NASA
- NASA DONKI
- NASA/JPL
- CelesTrak
- Official ISRO sources
- Other authoritative public space-data sources

SpacePulse does not intentionally fabricate spacecraft positions, satellite locations, distances, velocities, mission statuses, or other current scientific values.

When reliable data is unavailable, the interface clearly communicates the limitation instead of presenting invented information.

### Data States

| Status | Meaning |
|---|---|
| 🟢 **CURRENT / LIVE** | Current data successfully received |
| 🔵 **CALCULATED** | Value calculated from available scientific data |
| 🟡 **LAST AVAILABLE** | Latest available source data |
| ⚪ **DATA UNAVAILABLE** | Required data is unavailable |
| 🔴 **SOURCE ERROR** | Data source could not be accessed |

---

## 🛠️ Tech Stack

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Tailwind CSS
- Modern CSS
- Web APIs
- Public Space Data APIs

---

## 🎨 UI/UX

SpacePulse is designed to provide an immersive space experience while keeping scientific information clear and understandable.

### Design Highlights

- Deep-space visual environment
- Realistic celestial rendering
- Atmospheric effects
- Milky Way and star-field environment
- Glassmorphism interface
- Scientific HUD elements
- Smooth camera transitions
- Premium animations
- Responsive interface
- Accessibility support
- Reduced-motion support

The interface is designed to feel like a modern **space mission control system** combined with an interactive 3D space explorer.

---

## ⚡ Performance

SpacePulse focuses on maintaining a smooth and responsive 3D experience.

Performance techniques include:

- Level of Detail (LOD)
- Instanced rendering
- Optimized Three.js scenes
- Lazy loading
- Optimized assets
- Efficient animation
- Data caching
- Responsive rendering
- Mobile optimization

---

## 📱 Responsive Experience

SpacePulse is designed for:

- Desktop
- Large displays
- Tablets
- Mobile devices

The interface adapts to different screen sizes while maintaining the core space visualization and scientific information.

---

## 🛰️ Scientific Integrity

SpacePulse follows these principles:

1. Never intentionally fabricate scientific data.
2. Clearly distinguish calculated values from source-provided values.
3. Identify the source of important information.
4. Display timestamps where applicable.
5. Clearly communicate unavailable data.
6. Never arbitrarily position spacecraft when reliable position data is unavailable.
7. Prefer authoritative scientific sources.
8. Avoid presenting outdated information as current or live data.

---

## 🔒 Security & Credential Policy

SpacePulse adheres to strict client-side security guidelines:

- **Zero Hardcoded Secrets**: SpacePulse contains no hardcoded API keys, private credentials, tokens, passwords, or certificates.
- **Client-Side Environment Notice**: SpacePulse is a 100% frontend React + Vite web application. Any environment variable exposed through `VITE_*` is bundled directly into the browser distribution and is publicly viewable. Private credentials or confidential tokens must **never** be placed in `VITE_*` variables.
- **Strictly Public Data Feeds**: All telemetry, satellite positions, space weather metrics, and orbital data are sourced exclusively from public, unauthenticated APIs and open archives (NOAA SWPC, CelesTrak / 18th SDS, NASA/JPL Horizons, Open-Notify, and ISRO open portals).
- **Developer Guidelines**: Never commit `.env` files, API keys, tokens, passwords, credentials, or private keys. Sensitive file patterns (`.env*`, `*.pem`, `*.key`, `*.pfx`, `credentials.json`, etc.) are tracked and blocked in `.gitignore`.

---

## 👨‍💻 Contributors

### Nalin Tuscano

Project creator and developer.

### Error 404 Legends

Collaborative development team.

---

## 📜 License

This project is intended for educational, research, visualization, and experimental purposes.

Data belongs to its respective providers and is subject to their individual terms and policies.

---

# 🚀 SpacePulse

### Explore. Visualize. Understand Space.

Built with ❤️ using React, TypeScript, Three.js, and real space data.
