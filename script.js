/*
 * ⚠️ Prank Website - Interactive Engine (Vanilla ES6)
 * Handles fullscreen, screen shake, audio playback, strobe flashes,
 * digital static overlays, interactive fake system warning dialogs,
 * and an Admin control panel for uploading custom audio.
 */

import { initializeApp } from "firebase/app";
import { getDatabase, ref as dbRef, set, onValue } from "firebase/database";
import { getStorage, ref as storRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAC5oXzEncdw8lxkfL1DH2efyay2XZvqf4",
  authDomain: "zoya-ai-4818e.firebaseapp.com",
  databaseURL: "https://zoya-ai-4818e-default-rtdb.firebaseio.com",
  projectId: "zoya-ai-4818e",
  storageBucket: "zoya-ai-4818e.firebasestorage.app",
  messagingSenderId: "477629523751",
  appId: "1:477629523751:web:9ddf9f80e4d4fe3205eb02"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const landingScreen = document.getElementById("landing-screen");
  const prankStage = document.getElementById("prank-stage");
  const revealScreen = document.getElementById("reveal-screen");
  const btnStart = document.getElementById("btn-start");
  const btnReplay = document.getElementById("btn-replay");

  // --- Prank Configuration ---
  const PRANK_DURATION_MS = 10000; // 10 seconds of premium prank chaos
  let prankTimer = null;
  let popupInterval = null;
  let activePopups = [];
  
  // --- Audio State ---
  let mainAudio = null;
  let audioCtx = null;
  let osc1 = null;
  let osc2 = null;
  let gainNode = null;
  let synthInterval = null;
  let isSynthPlaying = false;

  // --- IndexedDB Management for Custom Audio ---
  const DB_NAME = "PrankAdminDB";
  const DB_VERSION = 1;
  const STORE_NAME = "audio_store";
  const AUDIO_KEY = "custom_audio";
  let db = null;
  let customAudioBlob = null;
  let customAudioName = "";

  // --- Fake Popup Content Templates ---
  const popupTitles = [
    "⚠️ System Security Alert",
    "🛑 Trojan Spyware Blocked",
    "❌ Memory Write Failure 0x00F8A4",
    "❗ Critical Hardware Overheat",
    "👁️ Webcam Stream Active",
    "💻 Self-Destruct Sequence Active",
    "🍪 Cookie Thief Detected"
  ];

  const popupMessages = [
    "Critical warning! A remote hacker is downloading your browser search history.",
    "Webcam connection established. Live streaming of your face initiated to servers in Antarctica.",
    "Trojan-Baap.EXE virus detected. Downloading hilarious content to your desktop.",
    "System overload! Internal cooling fans are spinning backwards. Move away from the screen!",
    "Cookie storage breached. All chocolate chip cookies have been consumed.",
    "Self-destruct sequence initiated. Please do not close this window or breathe.",
    "ERROR 404: Brain not found. Please insert coffee to continue."
  ];

  const popupIcons = ["❌", "⚠️", "🛑", "💀", "💾", "💻", "🔥"];

  // --- Initialize IndexedDB on Load ---
  function initDB() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => {
          console.error("IndexedDB error:", event);
          resolve(null);
        };
        request.onsuccess = (event) => {
          db = event.target.result;
          loadCustomAudioFromDB().then(resolve);
        };
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        };
      } catch (e) {
        console.warn("IndexedDB initialization skipped (not supported or blocked):", e);
        resolve(null);
      }
    });
  }

  function loadCustomAudioFromDB() {
    return new Promise((resolve) => {
      if (!db) return resolve(null);
      try {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(AUDIO_KEY);
        request.onsuccess = (event) => {
          const data = event.target.result;
          if (data && data.blob) {
            customAudioBlob = data.blob;
            customAudioName = data.name || "custom_uploaded_audio.mp3";
            updateAdminDashboardUI();
          }
          resolve(data);
        };
        request.onerror = () => resolve(null);
      } catch (e) {
        console.error("Error fetching from IndexedDB:", e);
        resolve(null);
      }
    });
  }

  // --- Firebase Realtime & Storage Synchronization ---
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function listenToFirebaseAudio() {
    const audioRef = dbRef(database, "customAudio");
    onValue(audioRef, async (snapshot) => {
      // Hide rules alert if connection is successful
      const rulesAlert = document.getElementById("firebase-rules-alert");
      if (rulesAlert) {
        rulesAlert.style.display = "none";
      }

      const data = snapshot.val();
      if (data) {
        const { name, url, base64 } = data;
        customAudioName = name || "firebase_audio.mp3";
        
        try {
          if (url) {
            // Option A: Storage direct link
            const response = await fetch(url);
            customAudioBlob = await response.blob();
          } else if (base64) {
            // Option B: Fallback base64
            customAudioBlob = base64ToBlob(base64, "audio/mp3");
          } else {
            customAudioBlob = null;
            customAudioName = "";
          }
        } catch (e) {
          console.warn("Could not fetch binary file directly, falling back to url string reference:", e);
          if (url) {
            customAudioBlob = url; // Directly use public URL if fetch CORS fails
          }
        }
      } else {
        // Fallback to local IndexedDB if Firebase has no audio
        loadCustomAudioFromDB();
      }
      updateAdminDashboardUI();
    }, (error) => {
      console.warn("Firebase listener notice (Firebase database rules may be locked/restricted):", error);
      
      // Check if it is a permission denied error
      const isPermissionDenied = error && (
        error.code === "PERMISSION_DENIED" || 
        (error.message && error.message.toLowerCase().includes("permission")) ||
        (error.message && error.message.toLowerCase().includes("denied"))
      );

      if (isPermissionDenied) {
        const rulesAlert = document.getElementById("firebase-rules-alert");
        if (rulesAlert) {
          rulesAlert.style.display = "block";
        }
      }

      // Fallback smoothly to local browser IndexedDB
      loadCustomAudioFromDB();
    });
  }

  async function uploadAudioToFirebase(file) {
    currentAudioNameEl.textContent = "⏳ Uploading to Firebase...";
    statusDot.classList.remove("active");
    
    try {
      // 1. Try Firebase Storage upload
      const audioStorageRef = storRef(storage, `custom_audio/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(audioStorageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Save metadata to Realtime Database
      const audioDbRef = dbRef(database, "customAudio");
      await set(audioDbRef, {
        name: file.name,
        url: downloadURL,
        storagePath: uploadResult.ref.fullPath,
        timestamp: Date.now()
      });
      
      alert("🎉 Success! MP3 uploaded to Firebase and synchronized for all users!");
    } catch (storageError) {
      console.warn("Firebase Storage upload failed, attempting Realtime Database direct upload fallback:", storageError);
      
      if (file.size > 8 * 1024 * 1024) {
        alert("Firebase Storage is locked, and the file is too large (> 8MB) to upload to Realtime Database. Please use an MP3 under 8MB!");
        updateAdminDashboardUI();
        return;
      }
      
      try {
        const base64 = await blobToBase64(file);
        const audioDbRef = dbRef(database, "customAudio");
        await set(audioDbRef, {
          name: file.name,
          base64: base64,
          timestamp: Date.now()
        });
        alert("🎉 Success! MP3 uploaded to Firebase Realtime Database (Base64) and synchronized for all users!");
      } catch (dbError) {
        console.warn("Firebase Realtime Database upload also failed:", dbError);
        
        // Show rules alert if database write was permission denied
        const isPermission = dbError && (
          dbError.code === "PERMISSION_DENIED" || 
          (dbError.message && dbError.message.toLowerCase().includes("permission")) ||
          (dbError.message && dbError.message.toLowerCase().includes("denied"))
        );
        if (isPermission) {
          const rulesAlert = document.getElementById("firebase-rules-alert");
          if (rulesAlert) {
            rulesAlert.style.display = "block";
          }
        }

        alert("Failed to upload to Firebase. Please check security rules or network settings.");
        updateAdminDashboardUI();
      }
    }
  }

  async function deleteAudioFromFirebase() {
    currentAudioNameEl.textContent = "⏳ Resetting...";
    try {
      const audioDbRef = dbRef(database, "customAudio");
      
      // We will perform a single set(null) to remove the customAudio entry for everyone
      await set(audioDbRef, null);
      
      // Also clear local IndexedDB to match
      await deleteCustomAudioFromDB();
      
      alert("🎉 Audio reset successfully! Default audio.mp3 is restored for everyone.");
    } catch (error) {
      console.warn("Error resetting audio on Firebase:", error);
      
      const isPermission = error && (
        error.code === "PERMISSION_DENIED" || 
        (error.message && error.message.toLowerCase().includes("permission")) ||
        (error.message && error.message.toLowerCase().includes("denied"))
      );
      if (isPermission) {
        const rulesAlert = document.getElementById("firebase-rules-alert");
        if (rulesAlert) {
          rulesAlert.style.display = "block";
        }
      }

      alert("Failed to reset audio on Firebase. Check rules or internet connection.");
      updateAdminDashboardUI();
    }
  }

  function saveCustomAudioToDB(blob, name) {
    return new Promise((resolve, reject) => {
      if (!db) return reject("Database not initialized");
      try {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ blob, name }, AUDIO_KEY);
        request.onsuccess = () => {
          customAudioBlob = blob;
          customAudioName = name;
          updateAdminDashboardUI();
          resolve();
        };
        request.onerror = (e) => reject(e);
      } catch (e) {
        reject(e);
      }
    });
  }

  function deleteCustomAudioFromDB() {
    return new Promise((resolve, reject) => {
      if (!db) return reject("Database not initialized");
      try {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(AUDIO_KEY);
        request.onsuccess = () => {
          customAudioBlob = null;
          customAudioName = "";
          updateAdminDashboardUI();
          resolve();
        };
        request.onerror = (e) => reject(e);
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- Admin Panel Interactions & Elements ---
  const adminTriggerBtn = document.getElementById("admin-trigger-btn");
  const adminModal = document.getElementById("admin-modal");
  const adminCloseBtn = document.getElementById("admin-close-btn");
  const adminLockScreen = document.getElementById("admin-lock-screen");
  const adminDashboardScreen = document.getElementById("admin-dashboard-screen");
  const adminPasswordInput = document.getElementById("admin-password-input");
  const adminLoginBtn = document.getElementById("admin-login-btn");
  const adminErrorMsg = document.getElementById("admin-error-msg");

  const uploadZone = document.getElementById("upload-zone");
  const adminFileInput = document.getElementById("admin-file-input");
  const currentAudioNameEl = document.getElementById("current-audio-name");
  const statusDot = document.getElementById("status-dot");
  const btnTestAudio = document.getElementById("btn-test-audio");
  const btnDeleteAudio = document.getElementById("btn-delete-audio");

  let testAudioObj = null;
  let isTestingAudio = false;

  // Initialize DB
  initDB().then(() => {
    // Start listening to Firebase audio updates to override local IndexedDB
    listenToFirebaseAudio();
  });

  // Admin Modal Controls
  adminTriggerBtn.addEventListener("click", () => {
    adminModal.style.display = "flex";
    adminPasswordInput.focus();
  });

  adminCloseBtn.addEventListener("click", closeAdminModal);

  // Close when clicking outside content area
  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) {
      closeAdminModal();
    }
  });

  adminLoginBtn.addEventListener("click", handleAdminLogin);
  adminPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleAdminLogin();
    }
  });

  function closeAdminModal() {
    adminModal.style.display = "none";
    adminPasswordInput.value = "";
    adminErrorMsg.textContent = "";
    
    // Stop any active test audio when closing admin dashboard
    if (isTestingAudio && testAudioObj) {
      testAudioObj.pause();
      isTestingAudio = false;
      btnTestAudio.textContent = "▶ Test Play";
    }
  }

  function handleAdminLogin() {
    const password = adminPasswordInput.value.trim();
    if (password === "999") {
      adminLockScreen.style.display = "none";
      adminDashboardScreen.style.display = "block";
      updateAdminDashboardUI();
    } else {
      adminErrorMsg.textContent = "❌ Incorrect Passcode. Access Denied.";
      adminPasswordInput.value = "";
      adminPasswordInput.focus();
    }
  }

  function updateAdminDashboardUI() {
    if (customAudioBlob) {
      currentAudioNameEl.textContent = customAudioName;
      statusDot.classList.add("active");
      btnDeleteAudio.style.display = "inline-block";
      btnTestAudio.disabled = false;
    } else {
      currentAudioNameEl.textContent = "Default: audio.mp3";
      statusDot.classList.remove("active");
      btnDeleteAudio.style.display = "none";
      btnTestAudio.disabled = true;
    }
  }

  // --- Upload Event Handlers ---
  uploadZone.addEventListener("click", () => {
    adminFileInput.click();
  });

  adminFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleAudioFileUpload(file);
    }
  });

  // Drag and Drop
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--color-accent-blue)";
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "audio/mpeg" || file.type === "audio/mp3" || file.name.endsWith(".mp3"))) {
      handleAudioFileUpload(file);
    } else {
      alert("Please upload a valid MP3 file!");
    }
  });

  function handleAudioFileUpload(file) {
    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large! Please choose an MP3 file smaller than 15MB.");
      return;
    }

    uploadAudioToFirebase(file);
  }

  // --- Test Play Controller ---
  btnTestAudio.addEventListener("click", () => {
    if (!customAudioBlob) return;

    if (isTestingAudio) {
      if (testAudioObj) {
        testAudioObj.pause();
      }
      isTestingAudio = false;
      btnTestAudio.textContent = "▶ Test Play";
    } else {
      if (testAudioObj) {
        testAudioObj.pause();
      }
      try {
        const audioUrl = (customAudioBlob instanceof Blob) 
          ? URL.createObjectURL(customAudioBlob) 
          : customAudioBlob;
        testAudioObj = new Audio(audioUrl);
        testAudioObj.volume = 0.8;
        testAudioObj.play()
          .then(() => {
            isTestingAudio = true;
            btnTestAudio.textContent = "⏸ Pause";
          })
          .catch(err => {
            alert("Error playing custom audio. Make sure it is a valid MP3.");
            console.error(err);
          });

        testAudioObj.addEventListener("ended", () => {
          isTestingAudio = false;
          btnTestAudio.textContent = "▶ Test Play";
        });
      } catch (e) {
        console.error("Error creating custom object URL for testing:", e);
      }
    }
  });

  // --- Delete Custom Audio Controller ---
  btnDeleteAudio.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete the custom uploaded audio and reset to audio.mp3?")) {
      if (isTestingAudio && testAudioObj) {
        testAudioObj.pause();
        isTestingAudio = false;
      }
      deleteAudioFromFirebase();
    }
  });

  // --- Initialize Main Event Listeners ---
  btnStart.addEventListener("click", startPrank);
  btnReplay.addEventListener("click", resetPrank);

  // --- Core Functions ---

  /**
   * Initiates the prank cycle
   */
  function startPrank() {
    // 1. Enter Fullscreen Mode for maximum immersion
    requestFullscreen();

    // 2. Hide Landing, Display Prank Stage
    landingScreen.style.display = "none";
    prankStage.style.display = "block";

    // 3. Shake the world
    document.body.classList.add("shake-active");

    // 4. Start Prank Audio immediately (Plays audio.mp3 or synthesizes a crazy alarm if missing)
    playPrankAudio();

    // 5. Spawn initial fake system popups
    spawnFakePopup();
    spawnFakePopup();

    // 6. Spawn more popups periodically
    popupInterval = setInterval(() => {
      spawnFakePopup();
    }, 1200);

    // 7. Auto-end after defined duration
    prankTimer = setTimeout(stopPrank, PRANK_DURATION_MS);
  }

  /**
   * Stops the prank, cleans up, and displays the reveal page
   */
  function stopPrank() {
    // 1. Clear intervals and timeouts
    if (prankTimer) clearTimeout(prankTimer);
    if (popupInterval) clearInterval(popupInterval);

    // 2. Stop Audios
    stopPrankAudio();

    // 3. Remove Screen Shake
    document.body.classList.remove("shake-active");

    // 4. Clean up fake popups
    activePopups.forEach(popup => {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    });
    activePopups = [];

    // 5. Exit Fullscreen (optional/polite but preserves immersion if not done, let's keep it clean)
    exitFullscreen();

    // 6. Swap Screens
    prankStage.style.display = "none";
    revealScreen.style.display = "flex";
  }

  /**
   * Resets everything back to the landing screen
   */
  function resetPrank() {
    revealScreen.style.display = "none";
    landingScreen.style.display = "flex";
  }

  // --- Fullscreen Handling ---

  function requestFullscreen() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          console.warn("Fullscreen request rejected gracefully:", err);
        });
      } else if (el.webkitRequestFullscreen) {
        try {
          el.webkitRequestFullscreen();
        } catch (err) {
          console.warn("Webkit fullscreen error caught:", err);
        }
      } else if (el.msRequestFullscreen) {
        try {
          el.msRequestFullscreen();
        } catch (err) {
          console.warn("MS fullscreen error caught:", err);
        }
      }
    } catch (e) {
      console.warn("Fullscreen request was blocked or not supported by browser context:", e);
    }
  }

  function exitFullscreen() {
    try {
      // Check if we are actually in fullscreen mode before requesting exit
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      
      if (!isFullscreen) {
        return;
      }

      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn("exitFullscreen promise rejected gracefully:", err);
        });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (e) {
      console.warn("Exception during exitFullscreen call:", e);
    }
  }

  // --- Audio Systems (With Synthesis Fallback) ---

  /**
   * Tries to play audio.mp3 or the custom uploaded audio. Falls back to synthesizer siren if it fails or doesn't exist.
   */
  function playPrankAudio() {
    let audioSource = "audio.mp3";
    let isCustom = false;

    if (customAudioBlob) {
      try {
        audioSource = (customAudioBlob instanceof Blob) 
          ? URL.createObjectURL(customAudioBlob) 
          : customAudioBlob;
        isCustom = true;
      } catch (e) {
        console.error("Failed to generate URL for custom audio blob:", e);
      }
    }

    mainAudio = new Audio(audioSource);
    mainAudio.loop = true;
    mainAudio.volume = 1.0;

    let fallbackTriggered = false;

    // Trigger fallback if loading fails
    mainAudio.addEventListener("error", () => {
      if (!fallbackTriggered) {
        fallbackTriggered = true;
        console.warn((isCustom ? "Custom uploaded audio" : "audio.mp3") + " could not be loaded. Activating premium Web Audio Synth fallback.");
        startSynthAlarm();
      }
    });

    // Attempt Playback
    mainAudio.play().then(() => {
      console.log("Playing " + (isCustom ? "custom audio" : "audio.mp3"));
    }).catch(err => {
      if (!fallbackTriggered) {
        fallbackTriggered = true;
        console.warn("Audio blocked or failed to start. Running Web Audio Synth fallback:", err);
        startSynthAlarm();
      }
    });
  }

  /**
   * Stops both main audio and the synthetic alarm
   */
  function stopPrankAudio() {
    if (mainAudio) {
      mainAudio.pause();
      mainAudio.currentTime = 0;
      mainAudio = null;
    }
    stopSynthAlarm();
  }

  /**
   * Generates a loud oscillating dual-frequency siren synthesizer
   */
  function startSynthAlarm() {
    if (isSynthPlaying) return;
    isSynthPlaying = true;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      audioCtx = new AudioCtxClass();
      
      // Create Oscillators
      osc1 = audioCtx.createOscillator();
      osc2 = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "sine";

      // Modulate frequency to create an aggressive alarm
      osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(220, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      let toggle = false;
      synthInterval = setInterval(() => {
        if (!audioCtx || audioCtx.state === "closed") return;
        
        // Sweep values
        const time = audioCtx.currentTime;
        if (toggle) {
          osc1.frequency.setValueAtTime(880, time);
          osc2.frequency.setValueAtTime(110, time);
        } else {
          osc1.frequency.setValueAtTime(440, time);
          osc2.frequency.setValueAtTime(220, time);
        }
        toggle = !toggle;
        
        // Also synthesize quick glitch click sounds
        if (Math.random() > 0.8) {
          playClickBeep(1200, 0.05);
        }
      }, 250);

    } catch (e) {
      console.error("Web Audio API failed to initialize:", e);
    }
  }

  /**
   * Synthesizes a high pitch warning beep (for popup interactions)
   */
  function playClickBeep(frequency = 800, duration = 0.1) {
    try {
      const CtxClass = window.AudioContext || window.webkitAudioContext;
      if (!CtxClass) return;
      
      const clickCtx = audioCtx || new CtxClass();
      const osc = clickCtx.createOscillator();
      const g = clickCtx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(frequency, clickCtx.currentTime);
      g.gain.setValueAtTime(0.2, clickCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, clickCtx.currentTime + duration);
      
      osc.connect(g);
      g.connect(clickCtx.destination);
      
      osc.start();
      osc.stop(clickCtx.currentTime + duration);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Stops the synth sound generators
   */
  function stopSynthAlarm() {
    isSynthPlaying = false;
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    try {
      if (osc1) {
        osc1.stop();
        osc1 = null;
      }
      if (osc2) {
        osc2.stop();
        osc2 = null;
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    } catch (e) {
      // Ignored
    }
  }

  // --- Fake Windows Popups Creator ---

  /**
   * Spawns a fully styled old-school Windows warning dialog box at a random viewport position
   */
  function spawnFakePopup() {
    const popup = document.createElement("div");
    popup.className = "fake-popup";
    
    // Select random content
    const randIndex = Math.floor(Math.random() * popupTitles.length);
    const title = popupTitles[randIndex];
    const message = popupMessages[randIndex];
    const icon = popupIcons[Math.floor(Math.random() * popupIcons.length)];

    // Construct UI elements
    popup.innerHTML = `
      <div class="popup-header">
        <span>${title}</span>
        <button class="popup-close">✕</button>
      </div>
      <div class="popup-body">
        <span class="popup-icon">${icon}</span>
        <span>${message}</span>
      </div>
      <div class="popup-footer">
        <button class="popup-btn">OK</button>
      </div>
    `;

    // Position randomly on screen
    const width = 320;
    const height = 180;
    const maxX = window.innerWidth - width - 20;
    const maxY = window.innerHeight - height - 80;
    
    const randomX = Math.max(10, Math.floor(Math.random() * maxX));
    const randomY = Math.max(50, Math.floor(Math.random() * maxY));

    popup.style.left = `${randomX}px`;
    popup.style.top = `${randomY}px`;

    // Interaction Handlers (Close or OK)
    const handleClose = (e) => {
      e.stopPropagation();
      playClickBeep(600, 0.15); // play classic warning beep
      
      // Remove popup
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      activePopups = activePopups.filter(p => p !== popup);

      // Spawn TWO new popups as punishment!
      spawnFakePopup();
      setTimeout(spawnFakePopup, 200);
    };

    popup.querySelector(".popup-close").addEventListener("click", handleClose);
    popup.querySelector(".popup-btn").addEventListener("click", handleClose);

    // Append to stage
    prankStage.appendChild(popup);
    activePopups.push(popup);
  }
});
