# <img src="public/logo.png" alt="ChocoShare Logo" width="70" height="70" /> ChocoShare

**ChocoShare** is a fast, secure **peer-to-peer file sharing web app**
that allows users to send files directly between devices without
uploading them to a server.

Built with **React, Vite, TailwindCSS, and PeerJS**, ChocoShare uses
**WebRTC** technology to transfer files directly between users, ensuring
**privacy, speed, and no file size limits**.

------------------------------------------------------------------------

# 📑 Table of Contents

-   Introduction
-   Features
-   Tech Stack
-   Installation
-   Usage
-   How It Works
-   Project Structure
-   Configuration
-   Dependencies
-   Troubleshooting
-   Contributing
-   License

------------------------------------------------------------------------

# 📖 Introduction

ChocoShare enables **instant device-to-device file transfers** using
**peer-to-peer connections**.

Unlike traditional file sharing services:

-   ❌ No cloud storage
-   ❌ No upload limits
-   ❌ No tracking

Instead:

-   ✅ Direct browser-to-browser transfer
-   ✅ End-to-end encrypted via WebRTC
-   ✅ Fast transfers (LAN speed when possible)

------------------------------------------------------------------------

# ✨ Features

### 🚀 Instant File Sharing

Drag and drop files and instantly generate a share code or link.

### 🔐 Secure Transfers

Files are transferred using **WebRTC peer-to-peer encryption**.

### ⚡ Lightning Fast

Transfers occur **directly between devices**, not through a server.

### ♾ No File Size Limits

Since files are not stored on servers, size limits are determined only
by the devices and connection.

### 📱 QR Code Sharing

Send files easily by scanning a QR code.

### 🌙 Dark Mode

Smooth animated theme switching.

### 📊 Transfer Statistics

Shows: - Transfer progress - Transfer speed - Estimated time remaining

------------------------------------------------------------------------

# 🛠 Tech Stack

Frontend: - React - TypeScript - Vite

Styling: - TailwindCSS - PostCSS - Autoprefixer

Animation: - Framer Motion

Networking: - PeerJS (WebRTC)

Icons: - Lucide React

------------------------------------------------------------------------

# ⚙ Installation

### 1. Clone the repository

``` bash
git clone https://github.com/yourusername/chocoshare.git
cd chocoshare
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Run development server

``` bash
npm run dev
```

### 4. Open browser

    http://localhost:5173

------------------------------------------------------------------------

# ▶ Usage

### Send Files

1.  Drag and drop files into the upload area
2.  A **6-digit share code** will be generated
3.  Share the code or QR link with the receiver

### Receive Files

1.  Click **Receive Code**
2.  Enter the code or open the shared link
3.  File transfer begins automatically

------------------------------------------------------------------------

# 🔄 How It Works

1.  Sender selects files
2.  A **PeerJS connection** is created with a unique ID
3.  Receiver connects using the shared code
4.  Files are split into chunks
5.  Chunks are transferred via **WebRTC data channels**
6.  Receiver reconstructs the file and downloads it

------------------------------------------------------------------------

# 📂 Project Structure

    chocoshare/
    │
    ├── public/
    │   └── logo.png
    │
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.ts
    ├── package.json
    └── .gitignore

------------------------------------------------------------------------

# ⚙ Configuration

TailwindCSS configuration:

    tailwind.config.js

Content scanning includes:

    ./index.html
    ./src/**/*.{js,ts,jsx,tsx}

------------------------------------------------------------------------

# 📦 Dependencies

Main dependencies:

-   React
-   PeerJS
-   Framer Motion
-   Lucide React

Dev dependencies:

-   Vite
-   TypeScript
-   TailwindCSS
-   PostCSS

------------------------------------------------------------------------

# 🧪 Troubleshooting

### Connection Failed

Possible reasons:

-   Sender closed the tab
-   Network restrictions
-   Firewall blocking WebRTC

### Slow Transfers

Check:

-   Internet connection
-   Network stability
-   Device performance

------------------------------------------------------------------------

# 🤝 Contributing

Contributions are welcome!

1.  Fork the repository
2.  Create a new branch

```{=html}
<!-- -->
```
    git checkout -b feature/new-feature

3.  Commit your changes

```{=html}
<!-- -->
```
    git commit -m "Add new feature"

4.  Push to the branch and create a Pull Request

------------------------------------------------------------------------

# 📄 License

This project is licensed under the **MIT License**.

------------------------------------------------------------------------

<div align="center">
<i>Built with ❤️ and Chocolate 🍫</i>
</div>
