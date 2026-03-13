import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DetectionViewer from "./components/DetectionViewer"
import HighwayScene from "./components/HighwayScene"

// Custom Hook for random logs
const useLogs = () => {
  const [logs, setLogs] = useState([])
  const phrases = [
    "SCANNING: SECTOR 7",
    "POTHOLE ID #4029 DETECTED",
    "SEVERITY: CRITICAL (LEVEL 5)",
    "GEOLOCATION: 28.7041° N, 77.1025° E",
    "AUTO-FILING GRIEVANCE...",
    "TICKET #GOV-9921 GENERATED",
    "NOTIFICATION SENT TO PWD",
    "VERIFYING REPAIRS: SECTOR 4",
    "SATELLITE SYNC: ACTIVE",
    "DRONE 04: LOW BATTERY WARNING"
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false })
      const event = phrases[Math.floor(Math.random() * phrases.length)]
      setLogs(prev => [`[${time}] ${event}`, ...prev].slice(0, 15))
    }, 1500)
    return () => clearInterval(interval)
  }, [])
  
  return logs
}

// Resolution Tracker
const Tracker = () => (
    <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-4 rounded h-full flex flex-col font-mono relative overflow-hidden group">
       <div className="absolute inset-0 bg-cyan-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
       
       <h3 className="text-cyan-400 text-xs font-bold mb-4 flex items-center gap-2 border-b border-cyan-900/50 pb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
          LIVE RESOLUTION TRACKER
        </h3>
        
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {[
            { id: 1024, status: "DETECTED", time: "10:42 AM", loc: "NH-44 km 24", color: "cyan" },
            { id: 1023, status: "COMPLAINT FILED", time: "10:30 AM", loc: "NH-44 km 12", color: "yellow" },
            { id: 1022, status: "DISPATCHED", time: "09:15 AM", loc: "State Hwy 5", color: "orange" },
            { id: 1021, status: "REPAIRED", time: "Yesterday", loc: "MG Road Link", color: "green" },
          ].map((item) => (
            <motion.div 
              key={item.id}
              initial={{opacity: 0, x: -10}}
              animate={{opacity: 1, x: 0}}
              className="relative pl-4 border-l border-cyan-800 hover:border-cyan-400 transition-colors"
            >
              <div className={`absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-${item.color}-500 ring-2 ring-black`} />
              
              <div className="text-[10px] text-gray-500 mb-0.5 font-mono">{item.time}</div>
              <div className="text-sm font-bold text-white mb-0.5 tracking-wide">{item.status}</div>
              <div className="text-[10px] text-cyan-300/70 uppercase">{item.loc}</div>
            </motion.div>
          ))}
        </div>
    </div>
)

// Heatmap Placeholder
const Heatmap = () => (
    <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-4 rounded h-full relative overflow-hidden flex flex-col">
          <h3 className="text-cyan-400 text-xs font-bold mb-4 flex items-center gap-2 border-b border-cyan-900/50 pb-2 z-10">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                RISK HEATMAP
          </h3>
          <div className="flex-1 grid grid-cols-8 gap-0.5 opacity-80">
              {Array.from({ length: 64 }).map((_, i) => (
                  <motion.div
                      key={i}
                      animate={{ 
                          backgroundColor: Math.random() > 0.8 ? '#ef4444' : '#0e7490',
                          opacity: [0.3, 0.8, 0.3]
                      }}
                      transition={{ duration: Math.random() * 2 + 1, repeat: Infinity }}
                      className="rounded-[1px]"
                  />
              ))}
          </div>
    </div>
)

export default function App() {
  const logs = useLogs()
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    setTimeout(() => setBooted(true), 1500)
  }, [])

  if (!booted) {
    return (
      <div className="bg-black h-screen w-screen flex flex-col items-center justify-center font-mono text-cyan-500">
         <div className="w-64 h-1 bg-gray-800 rounded overflow-hidden mb-2">
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: "100%" }} 
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]" 
            />
         </div>
         <p className="text-xs tracking-[0.5em] animate-pulse">
            INITIALIZING CORE SYSTEMS...
         </p>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">
      
      {/* 3D Dynamic Background */}
      <HighwayScene />
      
      {/* HUD Overlay Container */}
      <div className="relative z-10 flex flex-col h-full p-4 pointer-events-none">
        
        {/* Header */}
        <header className="pointer-events-auto flex justify-between items-end mb-4 bg-black/60 backdrop-blur border-b border-cyan-500/30 p-4 rounded-xl shadow-lg shadow-cyan-900/20">
            <div>
                <motion.h1 
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-4xl lg:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                >
                    RAAH <span className="text-sm not-italic font-normal tracking-wide text-white opacity-50 ml-2">v2.0</span>
                </motion.h1>
                <p className="text-[10px] tracking-[0.3em] text-cyan-500 font-mono mt-1">
                    AUTONOMOUS POTHOLE INTELLIGENCE
                </p>
            </div>
            
            <div className="flex gap-6 font-mono text-xs text-right hidden md:block">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-[10px]">SYSTEM STATUS</span>
                    <span className="text-green-400 font-bold animate-pulse">ONLINE ●</span>
                </div>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 pointer-events-auto">
            
            {/* Sidebar */}
            <nav className="col-span-2 flex flex-col gap-2">
                {['DASHBOARD', 'HEATMAP', 'COMPLAINTS', 'SETTINGS'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`
                            group relative overflow-hidden p-3 text-left font-mono text-xs font-bold transition-all duration-300 border-l-2
                            ${activeTab === tab.toLowerCase() 
                                ? 'bg-cyan-900/30 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                                : 'bg-black/40 text-gray-500 border-gray-800 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {activeTab === tab.toLowerCase() && <span className="text-cyan-400 animate-pulse">►</span>}
                            {tab}
                        </span>
                        {/* Hover sweep effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>
                ))}
            </nav>

            {/* Central Viewport */}
            <main className="col-span-10 lg:col-span-7 flex flex-col gap-4 relative">
                
                {/* Main Content Area */}
                <div className="flex-1 bg-black/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg overflow-hidden relative shadow-2xl">
                    {/* Viewport Corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500 pointer-events-none" />
                    
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-900/50 text-[10px] text-cyan-300 font-mono border border-cyan-500/30 z-20">
                        LIVE FEED: CAM-01
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && (
                            <motion.div 
                                key="dash"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full h-full"
                            >
                                <DetectionViewer />
                            </motion.div>
                        )}
                        {activeTab !== 'dashboard' && (
                            <motion.div
                                key="other"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full h-full flex items-center justify-center flex-col text-cyan-600/50"
                            >
                                <div className="text-4xl animate-spin-slow mb-2">⚠</div>
                                <span className="font-mono text-xs tracking-widest">MODULE UNDER CONSTRUCTION</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Bottom Widgets */}
                <div className="h-48 grid grid-cols-2 gap-4">
                     <Tracker />
                     <Heatmap />
                </div>
            </main>

            {/* Right Panel - Terminal Logs */}
            <aside className="col-span-3 hidden lg:flex flex-col bg-black/60 backdrop-blur-md border-l border-cyan-500/20 shadow-2xl">
                <div className="p-3 bg-cyan-950/30 border-b border-cyan-500/20">
                    <h3 className="text-[10px] font-mono font-bold tracking-widest text-cyan-400">
                        SYSTEM LOGS (TERMINAL)
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 custom-scrollbar">
                    {logs.map((log, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                            className="text-cyan-100/80 border-l border-cyan-500/40 pl-2 hover:bg-cyan-900/20 hover:text-white transition-colors cursor-default"
                        >
                            <span className="text-cyan-600 mr-2">{log.substring(0, log.indexOf(']')+1)}</span>
                            {log.substring(log.indexOf(']')+1)}
                        </motion.div>
                    ))}
                    <div className="h-4 w-2 bg-cyan-500 animate-pulse inline-block" />
                </div>
            </aside>

        </div>
      </div>
    </div>
  )
}