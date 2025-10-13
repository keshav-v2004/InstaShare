# ⚡InstaShare - Transfer files and text instantly!
## 💡Built with passion for privacy, speed, and simplicity.

A modern, **peer-to-peer file and text sharing application** built with **WebRTC**, **Next.js**, and **TypeScript**.  
Share files and messages directly between any two devices with a web browser on the same network— **no uploads, no cloud, no middlemen.**

🔗 **Live Demo:** https://insta-share-seven.vercel.app

---

## ✨ Core Features

- 🔒 **Serverless Transfers:** Files and messages are sent directly from one device to another using an encrypted WebRTC data channel.  
  No cloud storage or intermediaries.
- 💬 **Text & Link Sharing:** Instantly send text snippets, notes, or links between devices with a simple copy–paste feel.
- 🌐 **Automatic Device Discovery:** A lightweight signaling server helps devices on the internet find and connect with each other.
- 🔐 **End-to-End Encryption:** All data sent via WebRTC is securely encrypted by default.
- 🖥️ **Modern, Responsive UI:** Built with **Next.js**, **TypeScript**, and **Tailwind CSS** for a clean, intuitive experience.
- 📁 **Multi-File Support:** Queue and send multiple files at once with ease.

---

## 🛠️ Technology Stack

This project combines several modern web technologies to create a seamless and secure user experience.

### 🧠 Core Technology

**WebRTC (Web Real-Time Communication)**  
The heart of the application. WebRTC enables direct peer-to-peer communication between browsers — no intermediary servers required.  
This project uses **RTCDataChannel** to send files and text directly between users.

---

### 💻 Frontend

- **Next.js:** A powerful React framework providing server-side rendering, routing, and performance optimizations.  
- **React:** Builds the interactive UI components — peer list, file drop zone, progress indicators, etc.  
- **TypeScript:** Adds static typing to JavaScript, catching errors early for more reliable code.  
- **Tailwind CSS:** A utility-first CSS framework for rapidly building modern, responsive designs.

---

### ⚙️ Backend (Signaling Server)

- **Node.js:** JavaScript runtime used for the lightweight signaling backend.  
- **ws (WebSocket Library):** Handles persistent, two-way communication between clients and the signaling server.  
- **Express.js:** Creates the initial HTTP server that WebSocket attaches to for the signaling process.

---

## 🔄 How It Works: The Connection Flow

The connection process between two devices involves a brief **signaling phase** followed by a **direct WebRTC connection**.

1. **Discovery:**  
   Both users open the app. Their browsers connect to the **WebSocket Signaling Server** (e.g., hosted on Render).

2. **Introduction:**  
   The signaling server registers connected clients and notifies browsers when another peer is available.

3. **Handshake (ICE Candidates):**  
   Each browser gathers its network info (ICE candidates) via a **STUN server** and shares it through the signaling server.

4. **Direct Connection:**  
   After exchanging network data, browsers establish a **direct, encrypted peer-to-peer WebRTC connection**.

5. **Data Transfer:**  
   The signaling server’s role ends here — all files and text are sent directly between peers via the **RTCDataChannel**.

---

## 🚀 Development Setup

Follow these instructions to get the project running locally.

### ✅ Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm, yarn, or pnpm

---

### 🧩 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
