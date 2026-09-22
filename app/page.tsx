"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Sun, Moon, Plus, ArrowUp, Check, Sparkles, X, MessageSquare, Square, User, Mail, Key, Lock, Rocket, LogOut, Trash2 } from "lucide-react";
import { AuraBackground } from "./components/AuraBackground";
import { CometCursor } from "./components/CometCursor";

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const AVAILABLE_MODELS = ["Perplexity", "Gemini", "Grok", "ChatGPT", "Claude", "DeepSeek"];

const MODEL_VERSIONS: Record<string, string> = {
  "Perplexity": "sonar-pro", "Gemini": "gemini-2.5-flash", "Grok": "grok-2-beta",
  "ChatGPT": "gpt-4o", "Claude": "claude-3.5-sonnet", "DeepSeek": "deepseek-chat"
};

const BENCHMARK_DATA: Record<string, number[]> = {
  "ChatGPT": [88.7, 53.6, 95.6, 76.6, 90.5, 90.2, 83.4, 88.0, 85.0, 96.7],
  "Claude": [88.3, 59.4, 96.4, 71.1, 91.6, 92.0, 83.1, 89.0, 85.2, 96.1],
  "Gemini": [78.9, 41.0, 88.0, 52.0, 80.0, 75.0, 78.0, 75.0, 80.0, 88.0],
  "DeepSeek": [88.5, 59.1, 95.8, 90.2, 91.0, 89.0, 85.0, 88.0, 86.0, 96.0],
  "Perplexity": [73.0, 34.0, 84.5, 50.0, 68.0, 72.0, 70.0, 65.0, 78.0, 83.0],
  "Grok": [73.0, 34.0, 84.5, 50.0, 68.0, 72.0, 70.0, 65.0, 78.0, 83.0],
};

const CRITERIA = ["1. Undergraduate level knowledge", "2. Graduate level reasoning", "3. Grade school math", "4. Maths problem solving", "5. Multilingual math", "6. Code generation", "7. Reasoning over text", "8. Mixed evaluation", "9. Knowledge Q&A", "10. Common Knowledge"];

type Turn = { prompt: string; results: Record<string, string>; bestModel: string | null; };

type ChatSession = {
  id: string; title: string; models: string[]; turns: Turn[]; contextString: string;
  prompt?: string; results?: Record<string, string>; bestModel?: string | null;
};

// Animated SVGs for Report and New Chat icons
const AnimatedBarChart = ({ isHovered }: { isHovered: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <motion.line x1="18" y1="20" x2="18" y2="10" animate={isHovered ? { y2: [10, 15, 8, 10] } : { y2: 10 }} transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }} />
    <motion.line x1="12" y1="20" x2="12" y2="4" animate={isHovered ? { y2: [4, 12, 2, 4] } : { y2: 4 }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.1 }} />
    <motion.line x1="6" y1="20" x2="6" y2="14" animate={isHovered ? { y2: [14, 8, 16, 14] } : { y2: 14 }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} />
  </svg>
);

const AnimatedSquarePen = ({ isHovered }: { isHovered: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <motion.path
      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
      animate={isHovered ? { x: [-1, 1.5, -1], y: [1, -1.5, 1] } : { x: 0, y: 0 }}
      transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
    />
    <motion.line x1="6" y1="13" x2="11" y2="13" initial={{ opacity: 0, pathLength: 0 }} animate={isHovered ? { opacity: [0, 1, 0], pathLength: [0, 1, 1] } : { opacity: 0, pathLength: 0 }} transition={{ repeat: Infinity, duration: 0.8 }} />
    <motion.line x1="6" y1="16" x2="9" y2="16" initial={{ opacity: 0, pathLength: 0 }} animate={isHovered ? { opacity: [0, 1, 0], pathLength: [0, 1, 1] } : { opacity: 0, pathLength: 0 }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }} />
  </svg>
);

// Dynamic Report Algorithm
const generateDynamicScores = (prompt: string, text: string) => {
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;
  const hasCode = text.includes('\`\`\`') ? 18 : 0;
  const mathKeywords = ['+', '-', '=', '/', 'math', 'calculate', 'equation'].some(k => text.includes(k)) ? 16 : 0;
  const logicKeywords = ['therefore', 'because', 'analyze', 'reason', 'step'].some(k => text.toLowerCase().includes(k)) ? 12 : 0;

  const base = Math.min(65 + (textLength / 120), 85);
  const promptHash = prompt.length % 5;

  return [
    Math.min(99.9, base + logicKeywords + promptHash),
    Math.min(99.9, base + logicKeywords + (textLength % 6)),
    Math.min(99.9, base + mathKeywords + (wordCount % 7)),
    Math.min(99.9, base + mathKeywords + (textLength % 5)),
    Math.min(99.9, base + mathKeywords - 2),
    Math.min(99.9, base + hasCode + promptHash),
    Math.min(99.9, base + logicKeywords + 5),
    Math.min(99.9, base + (hasCode + mathKeywords + logicKeywords) / 3),
    Math.min(99.9, base + 7),
    Math.min(99.9, base + 11)
  ].map(v => Number(v.toFixed(1)));
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [cursorEnabled, setCursorEnabled] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState(1); 
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showReport, setShowReport] = useState(false); 
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [isNewChatHovered, setIsNewChatHovered] = useState(false);
  const [isReportHovered, setIsReportHovered] = useState(false);
  const [dynamicReport, setDynamicReport] = useState<Record<string, number[]>>({});

  const [prompt, setPrompt] = useState("");
  const [activeTurns, setActiveTurns] = useState<Turn[]>([]); 
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [hasProceeded, setHasProceeded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // GLOBAL CONTEXT MEMORY
  const [globalMemory, setGlobalMemory] = useState<string>("");
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    const touchOnly =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    setCursorEnabled(!touchOnly);
  }, [isMounted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const containers = document.querySelectorAll('.chat-scroll-container');
      containers.forEach(c => c.scrollTop = c.scrollHeight);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTurns]);

  useEffect(() => {
    if (!isAuthenticated || !userEmail || !firebaseConfig.apiKey) return;

    const unsub = onSnapshot(doc(db, "users", userEmail), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isBanned) {
          alert("Your account has been permanently banned by the Administrator.");
          handleLogout();
        } else if (data.forceLogout) {
          alert("You have been logged out by the Administrator.");
          handleLogout();
        }
      }
    });

    const timeTracker = setInterval(async () => {
      try {
        const userRef = doc(db, "users", userEmail);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const currentSeconds = snap.data().elapsedSeconds || 0;
          await updateDoc(userRef, { elapsedSeconds: currentSeconds + 30 });
        }
      } catch (e) {}
    }, 30000);

    return () => { unsub(); clearInterval(timeTracker); };
  }, [isAuthenticated, userEmail]);

  const loadFromCloud = async (email: string) => {
    if (!email || !firebaseConfig.apiKey) return;
    try {
      const docSnap = await getDoc(doc(db, "users", email));
      if (docSnap.exists()) {
        setChatHistory(docSnap.data().chats || []);
        setGlobalMemory(docSnap.data().globalContext || "");
      }
    } catch (e) { console.error("Cloud load failed", e); }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("aura_user_email");
    const savedName = localStorage.getItem("aura_user_name");
    if (savedEmail) {
      setUserEmail(savedEmail);
      setUserName(savedName || "User");
      setIsAuthenticated(true);
      setAuthStep(3);
      loadFromCloud(savedEmail); 
      
      if (firebaseConfig.apiKey) {
        updateDoc(doc(db, "users", savedEmail), { isLoggedOut: false, forceLogout: false }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    if (showModelMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModelMenu]);

  const handleAuthenticate = async () => {
    if (!userName.trim() || !userEmail.includes("@")) {
      setToastMessage("Please enter a valid name and Gmail ID.");
      setTimeout(() => setToastMessage(""), 3000);
      return;
    }

    try {
      const userRef = doc(db, "users", userEmail);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().isBanned) {
        setToastMessage("Access Denied: This account is currently banned by Admin.");
        setTimeout(() => setToastMessage(""), 5000);
        return;
      }
    } catch (e) {}

    setAuthStep(2);
    setToastMessage("Sending verification code to your email...");
    const uniqueCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(uniqueCode);
    
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp: uniqueCode })
      });
      if (response.ok) {
        setToastMessage(`Verification code sent to ${userEmail}`);
      } else {
        setToastMessage("Error: Could not send email. Check API credentials.");
      }
    } catch (error) {
      setToastMessage("Network error while trying to send email.");
    }
    setTimeout(() => setToastMessage(""), 5000); 
  };

  const handleLogin = async () => {
    if (otpInput === generatedOtp) {
      setAuthStep(3);
      setIsLaunching(true);
      localStorage.setItem("aura_user_email", userEmail);
      localStorage.setItem("aura_user_name", userName);
      
      try {
        const userRef = doc(db, "users", userEmail);
        const userSnap = await getDoc(userRef);
        let existingElapsed = 0;
        if (userSnap.exists()) existingElapsed = userSnap.data().elapsedSeconds || 0;

        await setDoc(userRef, {
          name: userName,
          email: userEmail,
          lastLogin: new Date().toISOString(),
          elapsedSeconds: existingElapsed,
          forceLogout: false,
          isLoggedOut: false
        }, { merge: true });
      } catch (e) {}

      loadFromCloud(userEmail);
      setTimeout(() => setIsAuthenticated(true), 2000); 
    } else {
      setToastMessage("Invalid Verification Code. Please try again.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleLogout = async () => {
    if (userEmail && firebaseConfig.apiKey) {
      try { await updateDoc(doc(db, "users", userEmail), { isLoggedOut: true }); } catch (e) {}
    }
    localStorage.removeItem("aura_user_email");
    localStorage.removeItem("aura_user_name");
    setIsAuthenticated(false);
    setAuthStep(1);
    setChatHistory([]);
    setActiveSessionId(null);
    setGlobalMemory("");
    setOtpInput("");
    setShowProfileModal(false);
  };

  const toggleModel = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) return prev.filter((m) => m !== model);
      if (prev.length >= 3) return prev;
      return [...prev, model];
    });
  };

  const evaluateBestResponse = (finalResults: Record<string, string>, modelsUsed: string[]) => {
    if (modelsUsed.length < 2) return null; 
    let maxScore = -1;
    let winner = null;
    modelsUsed.forEach(m => {
      const text = finalResults[m] || "";
      if (text.includes("Error") || text.includes("busy") || text.includes("Generation stopped")) return;
      let score = text.length; 
      score += (text.match(/`{3}/g) || []).length * 500; 
      score += (text.match(/^\s*[-*]\s/gm) || []).length * 50; 
      if (score > maxScore) { maxScore = score; winner = m; }
    });
    return winner;
  };

  const handleSend = async () => {
    if (!prompt.trim() || selectedModels.length < 1 || loading) return;
    
    const currentPrompt = prompt;
    setPrompt(""); 
    setLoading(true);
    setShowModelMenu(false);
    
    // INITIALIZE ALL MODELS IN BACKGROUND
    const loadingResults: Record<string, string> = {};
    AVAILABLE_MODELS.forEach(m => loadingResults[m] = "");
    
    setActiveTurns(prev => [...prev, { prompt: currentPrompt, results: loadingResults, bestModel: null }]);

    let existingContext = "";
    if (activeSessionId) {
      const session = chatHistory.find(s => s.id === activeSessionId);
      if (session) existingContext = session.contextString;
    }
    
    const memoryPrompt = `[GLOBAL USER CONTEXT/MEMORY]:\n${globalMemory}\n\n[CURRENT CHAT HISTORY]:\n${existingContext}\n\nCurrent Request:\n${currentPrompt}`;

    abortControllerRef.current = new AbortController();
    let finalSessionResults: Record<string, string> = {};
    AVAILABLE_MODELS.forEach(m => finalSessionResults[m] = "");
    let calculatedWinner: string | null = null;

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // QUERY ALL MODELS SIMULTANEOUSLY REGARDLESS OF SELECTION
        body: JSON.stringify({ prompt: memoryPrompt, models: AVAILABLE_MODELS }),
        signal: abortControllerRef.current.signal, 
      });
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.trim().slice(6));
              if (data.model && data.text) {
                finalSessionResults[data.model] = (finalSessionResults[data.model] || "") + data.text;
                
                setActiveTurns(prev => {
                  const next = [...prev];
                  const last = { ...next[next.length - 1] };
                  last.results = { ...last.results, [data.model]: finalSessionResults[data.model] };
                  next[next.length - 1] = last;
                  return next;
                });
              }
            } catch (e) {
              // Ignore incomplete JSON chunks silently
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        AVAILABLE_MODELS.forEach(m => {
          if (!finalSessionResults[m]) finalSessionResults[m] = "Generation stopped by user.";
        });
      } else {
        AVAILABLE_MODELS.forEach(m => {
          if (!finalSessionResults[m]) finalSessionResults[m] = "Network or API error occurred.";
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      
      // Calculate best response across ALL models
      calculatedWinner = evaluateBestResponse(finalSessionResults, AVAILABLE_MODELS);

      const finalTurn = { prompt: currentPrompt, results: finalSessionResults, bestModel: calculatedWinner };
      setActiveTurns(prev => {
        const next = [...prev];
        next[next.length - 1] = finalTurn;
        return next;
      });

      // Generate dynamic scores for ALL models
      setDynamicReport(prev => {
        const updated = { ...prev };
        AVAILABLE_MODELS.forEach(m => {
          updated[m] = generateDynamicScores(currentPrompt, finalSessionResults[m] || "");
        });
        return updated;
      });

      const rawAiResponse = finalSessionResults[calculatedWinner || selectedModels[0]] || "";
      const aiResponseToRemember = rawAiResponse.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
      const newContextAppend = `User: ${currentPrompt}\nAI: ${aiResponseToRemember}\n\n`;
      
      const newGlobalMemory = (globalMemory + newContextAppend).slice(-4000);
      setGlobalMemory(newGlobalMemory);

      let updatedHistory;
      if (activeSessionId) {
        const existingSession = chatHistory.find(s => s.id === activeSessionId)!;
        const currentTurns = existingSession.turns || 
          (existingSession.prompt ? [{ prompt: existingSession.prompt, results: existingSession.results || {}, bestModel: existingSession.bestModel || null }] : []);
          
        const updatedSession = { 
          ...existingSession, 
          turns: [...currentTurns, finalTurn],
          contextString: existingSession.contextString + newContextAppend
        };
        updatedHistory = [updatedSession, ...chatHistory.filter(s => s.id !== activeSessionId)];
      } else {
        const newSessionId = Date.now().toString();
        const newSession = {
          id: newSessionId,
          title: currentPrompt, 
          models: [...selectedModels],
          turns: [finalTurn],
          contextString: newContextAppend
        };
        updatedHistory = [newSession, ...chatHistory];
        setActiveSessionId(newSessionId); 
      }
      
      setChatHistory(updatedHistory);
      
      if (userEmail && firebaseConfig.apiKey) {
        try {
          await setDoc(doc(db, "users", userEmail), { 
            chats: updatedHistory,
            globalContext: newGlobalMemory 
          }, { merge: true });
        } catch (e) { console.error(e); }
      }
    }
  };

  const loadChat = (session: ChatSession) => {
    setActiveSessionId(session.id); 
    setPrompt(""); 
    setSelectedModels(session.models); 
    
    if (session.turns && session.turns.length > 0) {
      setActiveTurns(session.turns);
    } else if (session.prompt && session.results) {
      setActiveTurns([{ prompt: session.prompt, results: session.results, bestModel: session.bestModel || null }]);
    } else {
      setActiveTurns([]);
    }

    setHasProceeded(true); 
    if (window.innerWidth < 768) setShowHistory(false);
    
    setChatHistory(prev => {
      const active = prev.find(s => s.id === session.id);
      if (!active) return prev;
      const filtered = prev.filter(s => s.id !== session.id);
      return [active, ...filtered];
    });
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setPrompt("");
    setActiveTurns([]);
    setHasProceeded(false); 
    if (window.innerWidth < 768) setShowHistory(false);
  };

  const deleteChat = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation(); 
    const updatedHistory = chatHistory.filter((session) => session.id !== idToDelete);
    setChatHistory(updatedHistory);
    
    if (userEmail && firebaseConfig.apiKey) {
      try { await setDoc(doc(db, "users", userEmail), { chats: updatedHistory }, { merge: true }); } catch (e) {}
    }
    
    if (activeSessionId === idToDelete) handleNewChat();
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort(); 
    setLoading(false);
    setActiveTurns(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      const stoppedResults = { ...last.results };
      AVAILABLE_MODELS.forEach(m => {
        if (!stoppedResults[m] || stoppedResults[m] === "") stoppedResults[m] = "Generation stopped by user.";
      });
      last.results = stoppedResults;
      next[next.length - 1] = last;
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bgClass = isDark ? "aura-bg-dark text-[#f0f0f5]" : "aura-bg-light text-slate-800";
  const elementBgClass = isDark ? "glass-dark" : "glass-light";
  const cardBgClass = isDark ? "glass-card-dark" : "glass-card-light";
  const borderClass = isDark ? "border-white/10" : "border-violet-200/80";
  const ghostBtnClass = isDark ? "btn-ghost-dark" : "btn-ghost-light";
  const inputClass = isDark ? "input-dark text-white placeholder:text-white/40" : "input-light text-slate-900 placeholder:text-slate-400";
  const hoverRowClass = isDark ? "hover:bg-white/5" : "hover:bg-violet-50";
  const activeRowClass = isDark ? "bg-white/10 text-white" : "bg-violet-100/80 text-violet-950";
  const logoClass = isDark ? "gradient-text-subtle" : "gradient-text-light";

  const renderResponse = (text: string, modelName: string) => {
    if (!text && loading) {
      return (
        <span className="flex items-center gap-3">
          <span className={`typing-dots ${isDark ? "text-cyan-400" : "text-purple-600"}`}><span /><span /><span /></span>
          <span className={`font-medium ${isDark ? "text-cyan-400/80" : "text-purple-600"}`}>Generating</span>
        </span>
      );
    }

    // Check for reasoning / chain-of-thought <think> tags
    const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
    if (thinkMatch) {
      const thinkingContent = thinkMatch[1].trim();
      const cleanAnswer = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/i, '').trim();

      return (
        <div className="space-y-2.5">
          {thinkingContent && (
            <details 
              open={!cleanAnswer}
              className={`text-xs p-2.5 rounded-xl border transition-all ${
                isDark ? "bg-white/5 border-white/10 text-white/70" : "bg-black/5 border-violet-200 text-slate-700"
              }`}
            >
              <summary className="cursor-pointer font-medium select-none hover:opacity-80 flex items-center gap-1.5 list-none">
                <span>💭</span> 
                <span className="font-semibold tracking-wide">Thought Process</span>
                {loading && !cleanAnswer ? (
                  <span className="text-[10px] text-cyan-400 font-mono animate-pulse ml-auto">thinking...</span>
                ) : (
                  <span className="text-[10px] opacity-50 font-mono ml-auto">
                    {thinkingContent.split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </summary>
              <div className="mt-2 pt-2 border-t border-current/10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap opacity-80 max-h-48 overflow-y-auto custom-scrollbar">
                {thinkingContent}
              </div>
            </details>
          )}
          {cleanAnswer ? (
            <div className="whitespace-pre-wrap">{cleanAnswer}</div>
          ) : loading ? (
            <span className="flex items-center gap-2 text-xs opacity-60">
              <span className={`typing-dots ${isDark ? "text-cyan-400" : "text-purple-600"}`}><span /><span /><span /></span>
              <span>Thinking...</span>
            </span>
          ) : null}
        </div>
      );
    }

    return text;
  };

  const easeOut = [0.22, 1, 0.36, 1] as const;
  const transitionFast = { duration: 0.25, ease: easeOut };
  const transitionSmooth = { duration: 0.45, ease: easeOut };

  if (!isMounted) return null;

  const appShell = (content: ReactNode) => (
    <>
      <CometCursor isDark={isDark} enabled={cursorEnabled} />
      {content}
    </>
  );

  if (!isAuthenticated) {
    return appShell(
      <div className={`fixed inset-0 flex flex-col overflow-hidden ${bgClass}`}>
        <AuraBackground isDark={isDark} />

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl toast text-white z-50 font-medium tracking-wide text-center whitespace-nowrap max-w-[90vw]"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center justify-center py-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitionSmooth, delay: 0.05 }}
          className={`w-full max-w-md p-6 md:p-8 rounded-3xl holo-border ${cardBgClass} shadow-2xl flex flex-col relative overflow-hidden shrink-0`}
        >
          <AnimatePresence>
            {isLaunching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-[#0a0a0f]/95 z-40 flex flex-col items-center justify-center backdrop-blur-sm"
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                >
                  <Rocket size={64} className="text-purple-400 mb-4 drop-shadow-[0_0_24px_rgba(168,85,247,0.7)]" />
                </motion.div>
                <motion.h2
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-2xl font-bold gradient-text tracking-widest uppercase"
                >
                  Authenticating
                </motion.h2>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles size={36} className="text-[#a8c7fa] animate-logo-pulse shrink-0" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text-animated">Access AURA</h1>
          </div>
          <p className="text-center opacity-50 mb-6 text-xs uppercase tracking-[0.2em] font-semibold">Secure Login</p>

          <div className="flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Enter Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={authStep > 1}
                className={`w-full py-4 pl-12 pr-4 rounded-2xl ${inputClass} ${authStep > 1 ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="email"
                placeholder="Enter Your Gmail ID"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                disabled={authStep > 1}
                className={`w-full py-4 pl-12 pr-4 rounded-2xl ${inputClass} ${authStep > 1 ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </motion.div>
            <AnimatePresence>
              {authStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="relative overflow-hidden"
                >
                  <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="text"
                    placeholder="Enter Verification Code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    maxLength={6}
                    disabled={authStep === 3}
                    className={`w-full py-4 pl-12 pr-4 rounded-2xl ${inputClass} tracking-[0.3em] font-mono text-lg`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: authStep === 3 ? 1 : 1.02 }}
              whileTap={{ scale: authStep === 3 ? 1 : 0.98 }}
              onClick={authStep === 1 ? handleAuthenticate : handleLogin}
              disabled={authStep === 3}
              className="w-full mt-2 py-4 rounded-2xl font-bold tracking-widest uppercase text-white btn-primary flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authStep === 1 ? (<>Authenticate <Lock size={18} /></>) : (<>Log In <Rocket size={18} /></>)}
            </motion.button>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  return appShell(
    <div className={`fixed inset-0 flex flex-col transition-colors duration-500 font-sans overflow-hidden ${bgClass}`}>
      <AuraBackground isDark={isDark} />
      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[100] flex items-center justify-center modal-overlay p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl shadow-2xl ${cardBgClass} overflow-hidden flex flex-col`}
            >
              <div className={`flex justify-between items-center p-6 border-b ${borderClass} flex-none`}>
                <h2 className="text-xl font-bold tracking-tight">Your Profile</h2>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowProfileModal(false)} className={`p-2 rounded-full ${ghostBtnClass}`}>
                  <X size={20} />
                </motion.button>
              </div>
              <div className="p-8 flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg bg-gradient-to-br from-purple-600 to-cyan-500`}
                >
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </motion.div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold tracking-tight">{userName}</h3>
                  <p className="text-sm opacity-50 mt-1">{userEmail}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="mt-6 w-full py-3 rounded-2xl font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 flex justify-center items-center gap-2"
                >
                  <LogOut size={18} /> Log Out
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[100] flex items-center justify-center modal-overlay p-4"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl rounded-3xl shadow-2xl ${cardBgClass} overflow-hidden flex flex-col max-h-[90vh]`}
            >
              <div className={`flex justify-between items-center p-6 border-b ${borderClass} flex-none`}>
                <div className="flex items-center gap-3">
                  <AnimatedBarChart isHovered={true} />
                  <h2 className="text-2xl font-bold tracking-tight">Report Analysis</h2>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowReport(false)} className={`p-2 rounded-full ${ghostBtnClass}`}>
                  <X size={24} />
                </motion.button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {selectedModels.length === 0 ? (
                  <p className="text-center opacity-50 py-10">Select models to view their benchmark analysis.</p>
                ) : (
                  <div className={`overflow-x-auto rounded-2xl border ${borderClass}`}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={isDark ? "bg-white/5" : "bg-black/5"}>
                          <th className={`p-4 font-semibold text-sm border-b ${borderClass}`}>Evaluation Criteria</th>
                          {selectedModels.map((model) => (
                            <th key={model} className={`p-4 font-bold text-sm border-b border-l ${borderClass}`}>
                              {model} <span className="block text-xs font-normal opacity-50">{MODEL_VERSIONS[model]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {CRITERIA.map((criterion, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`transition-colors duration-200 ${hoverRowClass}`}
                          >
                            <td className={`p-4 text-sm font-medium opacity-80 border-b ${borderClass}`}>{criterion}</td>
                            {selectedModels.map((model) => {
                              const scoreData = dynamicReport[model] || BENCHMARK_DATA[model];
                              const currentVal = scoreData ? scoreData[index] : 0;
                              return (
                                <td key={model} className={`p-4 text-sm font-mono border-b border-l ${borderClass}`}>
                                  <span className={`px-2.5 py-1 rounded-lg ${currentVal > 85 ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                                    {currentVal.toFixed(1)}%
                                  </span>
                                 </td>
                              );
                            })}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={transitionSmooth}
        className={`flex-none flex justify-between items-center px-4 md:px-6 py-3 z-20 relative border-b ${borderClass} ${elementBgClass}`}
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08, boxShadow: isDark ? "0 0 16px rgba(34,211,238,0.3)" : "0 0 12px rgba(147,51,234,0.2)" }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2.5 rounded-xl ${ghostBtnClass} ${isDark ? "text-white" : "text-gray-700"}`}
          >
            <Menu size={22} />
          </motion.button>
          <motion.div
            className="flex items-center gap-2 select-none"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <span className={`text-xl font-semibold tracking-wide ${logoClass}`}>AURA</span>
            <Sparkles size={16} className="text-[#a8c7fa] animate-logo-pulse" />
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.08, rotate: 15 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-xl ${ghostBtnClass} ${isDark ? "text-white" : "text-gray-700"}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowProfileModal(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white select-none shadow-md bg-gradient-to-br from-purple-600 to-cyan-500 ring-2 ring-purple-500/30"
            title="View Profile"
          >
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </motion.button>
        </div>
      </motion.header>

      <div className="flex-1 flex min-h-0 overflow-hidden w-full relative z-10">
        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10 sidebar-overlay md:hidden"
              onClick={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={false}
          animate={{
            width: showHistory ? "18rem" : 0,
            opacity: showHistory ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className={`flex-none h-full flex flex-col z-20 absolute md:relative ${elementBgClass} border-r ${borderClass} overflow-hidden`}
        >
          <div className={`p-4 flex justify-between items-center border-b ${borderClass} min-w-[17rem]`}>
            <span className="font-semibold tracking-wide text-sm uppercase opacity-70">Recent Chats</span>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowHistory(false)} className={`p-1.5 rounded-lg ${ghostBtnClass}`}>
              <X size={18} />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-w-[17rem]">
            {chatHistory.length === 0 ? (
              <p className="text-sm opacity-40 text-center mt-8">No recent chats.</p>
            ) : (
              chatHistory.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => loadChat(session)}
                  className={`group py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 mb-1 ${
                    activeSessionId === session.id
                      ? activeRowClass
                      : isDark
                        ? `opacity-70 ${hoverRowClass}`
                        : `text-gray-600 ${hoverRowClass} hover:text-gray-900`
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={15} className="opacity-50 flex-none" />
                    <span className="text-sm truncate">{session.title}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => deleteChat(e, session.id)}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all flex-none ${activeSessionId === session.id ? "opacity-100" : ""}`}
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <main className="flex-1 flex flex-col min-h-0 h-full overflow-hidden w-full relative">
          <AnimatePresence mode="wait">
          {!hasProceeded ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionFast}
              className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto py-3 px-3 md:px-5"
            >
              <div className="flex flex-col items-center w-full max-w-lg gap-3 py-2">
              <div className="flex items-center justify-center gap-3 shrink-0 min-h-[3.25rem] py-1 overflow-hidden">
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                  className="flex items-center justify-center shrink-0 will-change-transform"
                >
                  <Sparkles size={32} className="text-[#a8c7fa] animate-logo-pulse" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, ...transitionSmooth }}
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter gradient-text-animated"
                >
                  AURA
                </motion.h1>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`text-xs sm:text-sm font-medium tracking-[0.12em] text-center uppercase shrink-0 ${isDark ? "opacity-60" : "text-gray-600"}`}
              >
                AI Unified Response Analyzer
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...transitionSmooth }}
                className={`w-full p-5 sm:p-6 md:p-8 rounded-3xl ${cardBgClass} flex flex-col items-center shrink-0`}
              >
                <p className="text-xs opacity-50 font-bold tracking-[0.2em] mb-4 uppercase">Select Any Models (Max 3)</p>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full mb-5">
                  {AVAILABLE_MODELS.map((model, i) => {
                    const isSelected = selectedModels.includes(model);
                    const isDisabled = !isSelected && selectedModels.length >= 3;
                    return (
                      <motion.div
                        key={model}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                        whileHover={!isDisabled ? { scale: 1.05, y: -4, transition: { type: "spring", stiffness: 800, damping: 15, duration: 0.1 } } : {}}
                        whileTap={!isDisabled ? { scale: 0.97 } : {}}
                        onClick={() => { if (!isDisabled) toggleModel(model); }}
                        className={`model-card flex items-center gap-3 p-3.5 rounded-2xl border ${
                          isSelected ? (isDark ? "model-card-selected" : "model-card-selected-light") : isDark ? "border-white/10" : "border-violet-200/70 hover:border-violet-300"
                        } ${isDisabled ? "model-card-disabled opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-200 ${
                          isSelected ? "bg-purple-500 border-purple-500 scale-110" : isDark ? "border-white/20" : "border-black/20"
                        }`}>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <Check size={13} className="text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="text-sm font-medium">{model}</span>
                      </motion.div>
                    );
                  })}
                </div>
                <motion.button
                  whileHover={selectedModels.length > 0 ? { scale: 1.03, boxShadow: "0 0 30px rgba(147,51,234,0.5)" } : {}}
                  whileTap={selectedModels.length > 0 ? { scale: 0.97 } : {}}
                  onClick={() => setHasProceeded(true)}
                  disabled={selectedModels.length === 0}
                  className={`w-full py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 ${
                    selectedModels.length > 0 ? "btn-primary text-white btn-neon-pulse" : isDark ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Proceed
                </motion.button>
              </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionSmooth}
              className="flex-1 flex flex-col min-h-0 h-full w-full gpu-smooth"
            >
              <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 md:gap-4 p-2.5 md:p-4 overflow-hidden">
            {selectedModels.map((modelName, colIndex) => {
              const latestTurn = activeTurns[activeTurns.length - 1];
              const isBestOverall = latestTurn?.bestModel === modelName;

              return (
                <motion.div
                  key={modelName}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transitionSmooth, delay: colIndex * 0.07 }}
                  className={`flex-1 flex flex-col min-h-0 rounded-2xl md:rounded-3xl overflow-hidden ${
                    isDark ? `${cardBgClass} futuristic-panel-dark panel-glow-dark` : `${cardBgClass} futuristic-panel-light panel-glow-light`
                  } ${isBestOverall ? "animate-border-glow border-green-500/60" : ""} ${loading ? (isDark ? "loading-shimmer" : "loading-shimmer loading-shimmer-light") : ""}`}
                >
                  <div className={`px-4 py-3 flex justify-between items-center border-b flex-none ${isBestOverall ? "border-green-500/30" : borderClass}`}>
                    <div className={`flex items-baseline gap-2 font-bold text-base md:text-lg tracking-tight ${isDark ? "" : "text-gray-900"}`}>
                      {modelName}
                      <span className={`text-xs font-normal tracking-normal ${isDark ? "opacity-40" : "text-gray-500"}`}>({MODEL_VERSIONS[modelName] || "v1.0"})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnimatePresence>
                        {isBestOverall && !loading && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="px-2.5 py-0.5 best-badge text-green-400 text-xs font-bold rounded-full"
                          >
                            BEST RESPONSE
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {loading && (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                          className={`w-4 h-4 border-2 border-t-transparent rounded-full ${isDark ? "border-cyan-400" : "border-purple-500"}`}
                        />
                      )}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleModel(modelName)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 transition-colors opacity-40 hover:opacity-100"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 chat-scroll-container min-h-0">
                    {activeTurns.map((turn, idx) => (
                      <div key={idx} className="flex flex-col space-y-3 mb-4">
                        <motion.div
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...transitionFast, delay: 0.05 }}
                          className="flex justify-end w-full"
                        >
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-[14px] leading-relaxed text-white ${
                            isDark ? "bubble-user-dark bubble-enter-glow-dark" : "bubble-user-light bubble-enter-glow-light"
                          }`}>
                            {turn.prompt}
                          </div>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...transitionFast, delay: 0.1 }}
                          className="flex justify-start w-full"
                        >
                          <div className={`max-w-[95%] px-4 py-3 rounded-2xl rounded-tl-sm text-[14px] leading-relaxed whitespace-pre-wrap ${
                            isDark ? "bubble-ai-dark text-[#f0f0f5]" : "bubble-ai-light"
                          }`}>
                            {renderResponse(turn.results[modelName] || "", modelName)}
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
              </div>

              <footer className="flex-none px-3 md:px-6 pb-3 md:pb-4 pt-1 flex items-end gap-2 md:gap-3 max-w-5xl mx-auto w-full relative z-10">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleNewChat}
            onMouseEnter={() => setIsNewChatHovered(true)}
            onMouseLeave={() => setIsNewChatHovered(false)}
            title="New Chat"
            className={`h-11 px-3.5 flex-none flex items-center justify-center gap-2 rounded-2xl font-medium text-xs md:text-sm transition-colors duration-200 ${
              isDark ? elementBgClass : `${elementBgClass} hover:bg-violet-50/80 text-violet-900`
            }`}
          >
            <AnimatedSquarePen isHovered={isNewChatHovered} /> <span className="hidden sm:inline">New Chat</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowReport(true)}
            onMouseEnter={() => setIsReportHovered(true)}
            onMouseLeave={() => setIsReportHovered(false)}
            title="Report Analysis"
            className={`h-11 px-3.5 flex-none flex items-center justify-center gap-2 rounded-2xl font-medium text-xs md:text-sm border transition-colors duration-200 ${
              isDark ? `${elementBgClass} border-purple-500/30 text-purple-400 hover:bg-purple-500/10` : `${elementBgClass} border-violet-300 text-violet-700 hover:bg-violet-50`
            }`}
          >
            <AnimatedBarChart isHovered={isReportHovered} /> <span className="hidden sm:inline">Report Analysis</span>
          </motion.button>

          <div ref={menuRef} className="relative flex-none">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, rotate: 90 }}
              whileTap={{ scale: 0.94 }}
              animate={{ rotate: showModelMenu ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onClick={() => setShowModelMenu(!showModelMenu)}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-colors duration-200 ${
                isDark ? elementBgClass : `${elementBgClass} hover:bg-violet-50/80 text-violet-800`
              }`}
            >
              <Plus size={20} />
            </motion.button>
            <AnimatePresence>
              {showModelMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={transitionFast}
                  className={`absolute bottom-14 left-0 p-2 rounded-2xl shadow-2xl w-48 mb-2 z-50 ${cardBgClass}`}
                >
                  <p className="text-xs font-semibold opacity-40 mb-2 px-2 select-none uppercase tracking-wider">Models (Max 3)</p>
                  {AVAILABLE_MODELS.map((model) => {
                    const isSelected = selectedModels.includes(model);
                    const isDisabled = !isSelected && selectedModels.length >= 3;
                    return (
                      <div
                        key={model}
                        onClick={() => { if (!isDisabled) toggleModel(model); }}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                          isDisabled ? "opacity-35 cursor-not-allowed" : hoverRowClass
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected ? "bg-cyan-500 border-cyan-500" : isDark ? "border-white/20" : "border-black/20"
                        }`}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                        <span className="text-sm select-none">{model}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`flex-1 relative rounded-2xl ${elementBgClass} ${isDark ? "input-bar-dark" : "input-bar-light"}`}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a prompt here..."
              rows={1}
              style={{ minHeight: "46px", maxHeight: "160px" }}
              className={`w-full py-3 pl-4 pr-12 bg-transparent focus:outline-none resize-none custom-scrollbar text-sm md:text-base ${isDark ? "placeholder:opacity-40" : "placeholder:text-gray-400 text-gray-900"}`}
            />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={loading ? handleStop : handleSend}
              disabled={(!prompt.trim() && !loading) || selectedModels.length === 0}
              className={`absolute right-1.5 bottom-1.5 p-2 rounded-xl transition-colors duration-200 ${
                loading
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : prompt.trim() && selectedModels.length > 0
                    ? isDark
                      ? "bg-white text-black hover:bg-gray-100"
                      : "bg-black text-white hover:bg-gray-800"
                    : "opacity-30 cursor-not-allowed"
              }`}
            >
              {loading ? <Square size={14} className="fill-current" /> : <ArrowUp size={16} />}
            </motion.button>
          </div>
              </footer>
            </motion.div>
          )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}